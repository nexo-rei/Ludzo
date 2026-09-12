import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcMovablePieces,
  applyMove,
  getsExtraTurn,
  calcScore,
  calcFinished,
  decideTimerWinner,
  botChoosePiece,
  TURN_TIMEOUT_SECS,
  MATCH_DURATION_SECS,
  MAX_CONSECUTIVE_SIXES,
  PIECES_PER_PLAYER,
} from "@/lib/ludo-engine";

/** Default (empty) board for a fresh room: 2 tokens per player. */
const EMPTY_BOARD = {
  pieces: {
    player_1: Array(PIECES_PER_PLAYER).fill(0) as number[],
    player_2: Array(PIECES_PER_PLAYER).fill(0) as number[],
  },
};

/** Seconds a room spends in 'countdown' before it opens for play. */
const COUNTDOWN_SECS = 10;

/** Bot "thinking" delays, measured from turn_start_at. */
const BOT_ROLL_DELAY_SECS = 2.5;
const BOT_MOVE_DELAY_SECS = 2.0;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
      return NextResponse.json({ success: false, error: "room_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId   = auth.userId!;
    const now      = Date.now();

    const { data: room, error: roomErr } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (roomErr) {
      console.error(`[LUDO STATE] DB error room=${roomId}:`, roomErr.message);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    if (room.player_1_id !== userId && room.player_2_id !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // ── Working copies ────────────────────────────────────────────────────────
    let status         = room.status        as string;
    let boardState     = JSON.parse(JSON.stringify(room.board_state ?? EMPTY_BOARD));
    let turnPlayerId   = room.turn_player_id as string;
    let turnStartMs    = new Date(room.turn_start_at).getTime();
    let diceRolled     = room.dice_rolled    as boolean;
    let lastRoll       = room.last_roll      as number;
    let movablePieces  = (room.movable_pieces ?? []) as number[];
    let hearts1        = room.hearts_player_1 as number;
    let hearts2        = room.hearts_player_2 as number;
    let score1         = room.score_player_1  as number;
    let score2         = room.score_player_2  as number;
    let winnerId       = room.winner_id       as string | null;
    let loserId        = room.loser_id        as string | null;
    let winReason      = room.win_reason      as string | null;
    // consecutive_sixes may not exist on rooms created before migration
    const hasConsecutiveCol = "consecutive_sixes" in room;
    let consecutiveSixes    = hasConsecutiveCol ? (room.consecutive_sixes ?? 0) as number : 0;
    let stateModified       = false;
    let rowUpdatedAt = (room.updated_at as string | null) ?? new Date(now).toISOString();

    // ── Match start time ──────────────────────────────────────────────────────
    // `let` because activating a countdown room (step 1) sets it for the first
    // time; without that the just-activated room would immediately look ~10 s
    // old and lose 10 s of its 8-minute budget.
    let matchStartMs     = room.match_start_time
      ? new Date(room.match_start_time).getTime()
      : new Date(room.created_at).getTime();
    let matchElapsedSecs = Math.floor((now - matchStartMs) / 1000);

    // ── 1. Countdown → Active ─────────────────────────────────────────────────
    if (status === "countdown") {
      const elapsed = (now - new Date(room.created_at).getTime()) / 1000;
      if (elapsed >= COUNTDOWN_SECS) {
        console.log(`[LUDO STATE] Activating room ${roomId}`);

        // Preferred path: atomic RPC (also picks who moves first).
        const { error: actErr } = await supabase.rpc("activate_ludo_room", { p_room_id: roomId });
        if (actErr) console.error(`[LUDO STATE] activate_ludo_room error:`, actErr.message);

        // CAS fallback — so the room still opens even if the RPC is missing or
        // errored. Without this the room sat in 'countdown' forever and the
        // client's Roll button (which requires status === 'active') never
        // enabled, i.e. the match was permanently unplayable.
        const startIso = new Date(now).toISOString();
        const { data: activated } = await supabase
          .from("ludo_rooms")
          .update({
            status:           "active",
            match_start_time: startIso,
            turn_start_at:    startIso,
            dice_rolled:      false,
            last_roll:        0,
            movable_pieces:   [],
            board_state:      {
              ...EMPTY_BOARD,
              pieces: { ...EMPTY_BOARD.pieces },
              ...(boardState?.bot_profile ? { bot_profile: boardState.bot_profile } : {}),
            },
            updated_at:       startIso,
          })
          .eq("id", roomId)
          .eq("status", "countdown")          // ← CAS: only one poll can win
          .select("status, turn_player_id, updated_at")
          .maybeSingle();

        if (activated) {
          status        = activated.status;
          matchStartMs  = now;
          turnStartMs   = now;
          turnPlayerId  = String(activated.turn_player_id ?? turnPlayerId);
          diceRolled    = false;
          lastRoll      = 0;
          movablePieces = [];
          rowUpdatedAt  = (activated.updated_at as string) ?? startIso;
          console.log(`[LUDO STATE] Room ${roomId} activated via CAS fallback, first turn=${turnPlayerId}`);
        } else {
          // Somebody else (the RPC or a concurrent poll) already activated it.
          const { data: updated } = await supabase
            .from("ludo_rooms")
            .select("status, turn_start_at, turn_player_id, match_start_time")
            .eq("id", roomId)
            .maybeSingle();

          if (updated) {
            status       = updated.status;
            turnPlayerId = String(updated.turn_player_id ?? turnPlayerId);
            turnStartMs  = updated.turn_start_at ? new Date(updated.turn_start_at).getTime() : now;
            if (updated.match_start_time) matchStartMs = new Date(updated.match_start_time).getTime();
          }
        }
      }
    }

    // A room that was just activated starts its clock now.
    matchElapsedSecs = Math.floor((now - matchStartMs) / 1000);

    // ── 2. Turn timeout (human players only) ──────────────────────────────────
    if (status === "active" && !turnPlayerId.startsWith("bot_") && !diceRolled) {
      const turnElapsed = (now - turnStartMs) / 1000;

      if (turnElapsed >= TURN_TIMEOUT_SECS) {
        console.log(`[LUDO STATE] Timeout room=${roomId} player=${turnPlayerId} elapsed=${turnElapsed.toFixed(1)}s`);

        const timeoutIsP1 = turnPlayerId === String(room.player_1_id);
        if (timeoutIsP1) {
          hearts1 = Math.max(0, hearts1 - 1);
          if (hearts1 <= 0) {
            winnerId = String(room.player_2_id); loserId = String(room.player_1_id);
            winReason = "timeout"; status = "completed";
          }
        } else {
          hearts2 = Math.max(0, hearts2 - 1);
          if (hearts2 <= 0) {
            winnerId = String(room.player_1_id); loserId = String(room.player_2_id);
            winReason = "timeout"; status = "completed";
          }
        }

        if (status !== "completed") {
          const nextTurn = timeoutIsP1
            ? String(room.player_2_id)
            : String(room.player_1_id);

          // Best-effort atomic RPC (may be a no-op if the RPC is unavailable).
          const { error: advErr } = await supabase.rpc("advance_ludo_turn", {
            p_room_id:             roomId,
            p_expected_turn:       turnPlayerId,
            p_expected_turn_start: room.turn_start_at,
            p_next_turn:           nextTurn,
            p_hearts_p1:           hearts1,
            p_hearts_p2:           hearts2,
          });
          if (advErr) console.error(`[LUDO STATE] advance_ludo_turn error:`, advErr.message);

          // Authoritative compare-and-swap fallback. This persists the turn
          // switch WITHOUT depending on the RPC existing, and the WHERE clause
          // (same player + same turn_start_at) makes it atomic against
          // concurrent polls — only one advance can win, so a timed-out player
          // is reliably switched out and can never be double-advanced.
          const nowIso = new Date(now).toISOString();
          const casPayload: Record<string, unknown> = {
            turn_player_id:  nextTurn,
            turn_start_at:   nowIso,
            dice_rolled:     false,
            last_roll:       0,
            movable_pieces:  [],
            hearts_player_1: hearts1,
            hearts_player_2: hearts2,
            updated_at:      nowIso,
          };
          if (hasConsecutiveCol) casPayload.consecutive_sixes = 0;

          const { data: casRow } = await supabase
            .from("ludo_rooms")
            .update(casPayload)
            .eq("id", roomId)
            .eq("turn_player_id", turnPlayerId)
            .eq("turn_start_at", room.turn_start_at)
            .select("turn_player_id, turn_start_at, hearts_player_1, hearts_player_2, updated_at")
            .maybeSingle();

          // Reflect the switch locally so THIS response already reports the new
          // turn — the client never has to wait for a later poll.
          turnPlayerId     = nextTurn;
          turnStartMs      = now;
          consecutiveSixes = 0;
          diceRolled       = false;
          lastRoll         = 0;
          movablePieces    = [];
          rowUpdatedAt     = (casRow?.updated_at as string) ?? nowIso;

          if (!casRow) {
            // The turn was already advanced (RPC or a concurrent poll won the
            // CAS). Read the authoritative current turn so we don't report a
            // wrong player. Only guaranteed columns are selected.
            const { data: cur } = await supabase
              .from("ludo_rooms")
              .select("turn_player_id, turn_start_at, hearts_player_1, hearts_player_2")
              .eq("id", roomId)
              .maybeSingle();
            if (cur) {
              const r = cur as unknown as Record<string, any>;
              turnPlayerId = (r.turn_player_id as string) ?? turnPlayerId;
              turnStartMs  = r.turn_start_at ? new Date(r.turn_start_at as string).getTime() : turnStartMs;
              hearts1      = (r.hearts_player_1 as number) ?? hearts1;
              hearts2      = (r.hearts_player_2 as number) ?? hearts2;
            }
          } else {
            const r = casRow as unknown as Record<string, any>;
            hearts1 = (r.hearts_player_1 as number) ?? hearts1;
            hearts2 = (r.hearts_player_2 as number) ?? hearts2;
          }
        } else {
          stateModified = true;
        }
      }
    }

    // ── 3. Match timer expiry ─────────────────────────────────────────────────
    // Was `if (score1 >= score2)`, which handed EVERY tied match to player_1 —
    // a free win for whoever got seated first. decideTimerWinner() is symmetric:
    // most pieces home → most hearts left → most progress → coin flip.
    if (status === "active" && matchElapsedSecs >= MATCH_DURATION_SECS) {
      const p1Pieces = (boardState?.pieces?.player_1 ?? (EMPTY_BOARD.pieces.player_1 as number[])) as number[];
      const p2Pieces = (boardState?.pieces?.player_2 ?? (EMPTY_BOARD.pieces.player_2 as number[])) as number[];
      const winnerSeat = decideTimerWinner({
        pieces1: p1Pieces, pieces2: p2Pieces,
        score1, score2,
        hearts1, hearts2,
      });

      status    = "completed";
      winReason = "score_timer";
      if (winnerSeat === 1) {
        winnerId = String(room.player_1_id); loserId = String(room.player_2_id);
      } else {
        winnerId = String(room.player_2_id); loserId = String(room.player_1_id);
      }
      console.log(
        `[LUDO STATE] Match timer expired room=${roomId} ` +
        `finished=${calcFinished(p1Pieces)}/${calcFinished(p2Pieces)} ` +
        `hearts=${hearts1}/${hearts2} score=${score1}/${score2} -> seat ${winnerSeat}`
      );
      stateModified = true;
    }

    // ── 4. Bot turns ──────────────────────────────────────────────────────────
    //
    // ⚠️ `turnStartMs` MUST be refreshed every time the turn changes hands.
    // The old code never touched it here, so step 5 wrote the bot's own
    // turn_start_at back to the DB while turn_player_id had already moved to
    // the human. The human's turn therefore started several seconds "in the
    // past" — and if the client had been backgrounded (Telegram WebView
    // throttles setInterval hard) the turn was already expired on arrival, so
    // step 2 instantly burned a heart and flipped the turn back to the bot.
    // Three hearts later the human lost by 'timeout' without ever rolling.
    if (status === "active" && turnPlayerId.startsWith("bot_")) {
      const botElapsed = (now - turnStartMs) / 1000;
      const botPieces    = (boardState?.pieces?.player_2 ?? (EMPTY_BOARD.pieces.player_2 as number[])) as number[];
      const botOppPieces = (boardState?.pieces?.player_1 ?? (EMPTY_BOARD.pieces.player_1 as number[])) as number[];

      /** Hand the turn to the human with a fresh clock. */
      const passToHuman = (reason: string) => {
        turnPlayerId     = String(room.player_1_id);
        turnStartMs      = now;          // ← the fix
        consecutiveSixes = 0;
        diceRolled       = false;
        lastRoll         = 0;
        movablePieces    = [];
        stateModified    = true;
        console.log(`[LUDO STATE] BOT ${reason} — turn to player_1 (clock reset)`);
      };

      if (!diceRolled && botElapsed >= BOT_ROLL_DELAY_SECS) {
        // Bot rolls
        const roll         = Math.floor(Math.random() * 6) + 1;
        // Bot is player_2, so amPlayer1 = false; block/barrier-aware.
        const allowedMoves = calcMovablePieces(botPieces, roll, botOppPieces, false);
        const newConsec    = roll === 6 ? consecutiveSixes + 1 : 0;

        console.log(`[LUDO STATE] BOT ROLL room=${roomId} roll=${roll} movable=${JSON.stringify(allowedMoves)}`);

        if (roll === 6 && newConsec >= MAX_CONSECUTIVE_SIXES) {
          passToHuman("TRIPLE SIX");
        } else if (allowedMoves.length === 0) {
          passToHuman("has no legal move");
        } else {
          diceRolled       = true;
          lastRoll         = roll;
          movablePieces    = allowedMoves;
          consecutiveSixes = newConsec;
          turnStartMs      = now;          // give the bot a fresh clock for its move step
          stateModified    = true;
        }

      } else if (diceRolled && movablePieces.length > 0 && botElapsed >= BOT_MOVE_DELAY_SECS) {
        // Bot moves a piece. botChoosePiece() can return -1, and applyMove() can
        // now reject a move (barrier / overshoot) if movable_pieces went stale,
        // so fall back through the candidate list instead of corrupting the board.
        const preferred  = botChoosePiece(botPieces, botOppPieces, movablePieces, lastRoll, false);
        const candidates = preferred >= 0
          ? [preferred, ...movablePieces.filter(i => i !== preferred)]
          : [...movablePieces];
        const rollUsed   = lastRoll;

        let moveResult = null as ReturnType<typeof applyMove> | null;
        for (const idx of candidates) {
          if (!Number.isInteger(idx) || idx < 0 || idx > 3) continue;
          const attempt = applyMove(botPieces, botOppPieces, idx, rollUsed, false);
          if (!attempt.illegal) { moveResult = attempt; console.log(`[LUDO STATE] BOT MOVE room=${roomId} piece=${idx}`); break; }
          console.warn(`[LUDO STATE] BOT MOVE rejected piece=${idx}: ${attempt.reason}`);
        }

        if (!moveResult) {
          // Nothing legal — treat exactly like a no-move roll.
          passToHuman("had no executable move");
        } else {
          boardState.pieces.player_2 = moveResult.myPieces;
          boardState.pieces.player_1 = moveResult.oppPieces;
          score2 = calcScore(moveResult.myPieces);
          score1 = calcScore(moveResult.oppPieces);

          if (moveResult.isWin) {
            status = "completed"; winnerId = turnPlayerId;
            loserId = String(room.player_1_id); winReason = "normal";
            stateModified = true;
            console.log(`[LUDO STATE] BOT WINS room=${roomId}`);
          } else {
            // Same rule as the human move route.
            const extraTurn = getsExtraTurn(rollUsed, moveResult.hasCapture, moveResult.reachedFinish);
            if (!extraTurn) {
              passToHuman("finished its move");
            } else {
              // Bot keeps the turn — still refresh the clock so its next roll is
              // measured from now, and so the human's turn timer shown in the UI
              // never inherits a stale timestamp.
              // NOTE: read rollUsed BEFORE zeroing lastRoll.
              if (rollUsed !== 6) consecutiveSixes = 0;   // capture/finish extra turn resets the count
              turnStartMs   = now;
              diceRolled    = false;
              lastRoll      = 0;
              movablePieces = [];
              stateModified = true;
              console.log(`[LUDO STATE] Bot gets an extra turn (clock reset)`);
            }
          }
        }
      }
    }

    // ── 5. Persist changes ────────────────────────────────────────────────────
    if (stateModified) {
      if (status === "completed") {
        const duration = Math.floor((now - matchStartMs) / 1000);
        console.log(`[LUDO STATE] Settling room=${roomId} winner=${winnerId} reason=${winReason}`);

        await supabase
          .from("ludo_rooms")
          .update({ board_state: boardState, score_player_1: score1, score_player_2: score2, updated_at: new Date().toISOString() })
          .eq("id", roomId);

        const { data: settled } = await supabase.rpc("settle_ludo_match", {
          p_room_id: roomId, p_winner_id: winnerId!, p_loser_id: loserId!,
          p_win_reason: winReason!, p_duration: duration,
        });

        if (!settled) {
          // Already settled by another concurrent poll — re-read actual result
          const { data: sr } = await supabase
            .from("ludo_rooms")
            .select("winner_id, loser_id, win_reason, status")
            .eq("id", roomId)
            .maybeSingle();
          if (sr) { winnerId = sr.winner_id; loserId = sr.loser_id; winReason = sr.win_reason; status = sr.status; }
        }
      } else {
        const writeIso = new Date().toISOString();
        const payload: Record<string, unknown> = {
          status,
          turn_player_id:   turnPlayerId,
          turn_start_at:    new Date(turnStartMs).toISOString(),
          dice_rolled:      diceRolled,
          last_roll:        lastRoll,
          movable_pieces:   movablePieces,
          hearts_player_1:  hearts1,
          hearts_player_2:  hearts2,
          score_player_1:   score1,
          score_player_2:   score2,
          board_state:      boardState,
          updated_at:       writeIso,
        };
                if (hasConsecutiveCol) {
          payload.consecutive_sixes = Math.min(MAX_CONSECUTIVE_SIXES, Math.max(0, consecutiveSixes));
        }

                const guardAgainstHumanRoll =
          !diceRolled && !turnPlayerId.startsWith("bot_");

        let q = supabase.from("ludo_rooms").update(payload).eq("id", roomId);
        if (guardAgainstHumanRoll) {
          q = q.eq("dice_rolled", false);
        }

        const { data: written, error: writeErr } = await q.select("id, updated_at").maybeSingle();
        if (writeErr) {
          console.error(
            `[LUDO STATE] WRITE FAILED room=${roomId} code=${writeErr.code} ${writeErr.message} ` +
            `payload=${JSON.stringify({ turn: turnPlayerId, dice: diceRolled, roll: lastRoll, movable: movablePieces, consec: consecutiveSixes })}`
          );
        }
        if (written) rowUpdatedAt = (written.updated_at as string) ?? writeIso;

        if (!written && guardAgainstHumanRoll) {
          // A /roll landed first — its state is authoritative. Re-read so this
          // response reports the player's actual roll instead of reverting it.
          console.log(`[LUDO STATE] write skipped, /roll won room=${roomId}`);
          const { data: cur } = await supabase
            .from("ludo_rooms")
            .select("*")
            .eq("id", roomId)
            .maybeSingle();
          if (cur) {
            const c = cur as unknown as Record<string, any>;
            status        = c.status               ?? status;
            turnPlayerId  = String(c.turn_player_id ?? turnPlayerId);
            turnStartMs   = c.turn_start_at ? new Date(c.turn_start_at).getTime() : turnStartMs;
            diceRolled    = c.dice_rolled          ?? diceRolled;
            lastRoll      = c.last_roll            ?? lastRoll;
            movablePieces = (c.movable_pieces ?? movablePieces) as number[];
            hearts1       = c.hearts_player_1      ?? hearts1;
            hearts2       = c.hearts_player_2      ?? hearts2;
            score1        = c.score_player_1       ?? score1;
            score2        = c.score_player_2       ?? score2;
            boardState    = c.board_state          ?? boardState;
            rowUpdatedAt  = (c.updated_at as string) ?? rowUpdatedAt;
            if (hasConsecutiveCol) consecutiveSixes = c.consecutive_sixes ?? consecutiveSixes;
          }
        }  
      }
    }

    // ── 6. Profiles ───────────────────────────────────────────────────────────
    const { data: p1User } = await supabase
      .from("users").select("first_name, photo_url")
      .eq("id", room.player_1_id).maybeSingle();

    let p2Profile = {
      name:   "Ludo Bot",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=LudoBot",
    };

    if (!String(room.player_2_id).startsWith("bot_")) {
      const { data: p2User } = await supabase
        .from("users").select("first_name, photo_url")
        .eq("id", room.player_2_id).maybeSingle();
      if (p2User) {
        p2Profile = {
          name:   p2User.first_name ?? "Player 2",
          avatar: p2User.photo_url  ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${room.player_2_id}`,
        };
      }
    } else {
      const bp = boardState?.bot_profile;
      if (bp?.name) p2Profile = bp;
    }

    // ── 7. Timers ─────────────────────────────────────────────────────────────
    // Use the freshest turnStartMs we have (possibly updated by timeout/bot logic)
    const turnRemainingSeconds  = Math.max(0, TURN_TIMEOUT_SECS  - Math.floor((now - turnStartMs) / 1000));
    const matchRemainingSeconds = Math.max(0, MATCH_DURATION_SECS - matchElapsedSecs);

    return NextResponse.json({
      success: true,
      data: {
        id:                      roomId,
        stake:                   room.stake,
        player_1_id:             String(room.player_1_id),
        player_2_id:             String(room.player_2_id),
        player_1_profile:        { name: p1User?.first_name ?? "Player 1", avatar: p1User?.photo_url ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=p1` },
        player_2_profile:        p2Profile,
        status,
        turn_player_id:          turnPlayerId,
        turn_remaining_seconds:  turnRemainingSeconds,
        match_remaining_seconds: matchRemainingSeconds,
        match_start_time:        room.match_start_time ?? room.created_at,
        dice_rolled:             diceRolled,
        last_roll:               lastRoll,
        movable_pieces:          movablePieces,
        hearts_player_1:         hearts1,
        hearts_player_2:         hearts2,
        score_player_1:          score1,
        score_player_2:          score2,
        winner_id:               winnerId,
        loser_id:                loserId,
        win_reason:              winReason,
        board_state:             boardState,
        chat_reactions:          room.chat_reactions ?? [],
        consecutive_sixes:       consecutiveSixes,
        // Monotonic version stamp — the client uses this to reject stale/out-of
        // -order poll responses so they can never revert fresher local state.
        updated_at:              rowUpdatedAt,
      },
    });

  } catch (err: any) {
    console.error("[LUDO STATE] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
