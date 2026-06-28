import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcMovablePieces,
  applyMove,
  getsExtraTurn,
  calcScore,
  botChoosePiece,
  TURN_TIMEOUT_SECS,
  MATCH_DURATION_SECS,
  MAX_CONSECUTIVE_SIXES,
} from "@/lib/ludo-engine";

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
    let boardState     = JSON.parse(JSON.stringify(
      room.board_state ?? { pieces: { player_1: [0,0,0,0], player_2: [0,0,0,0] } }
    ));
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

    // ── Match start time ──────────────────────────────────────────────────────
    const matchStartMs     = room.match_start_time
      ? new Date(room.match_start_time).getTime()
      : new Date(room.created_at).getTime();
    const matchElapsedSecs = Math.floor((now - matchStartMs) / 1000);

    // ── 1. Countdown → Active ─────────────────────────────────────────────────
    if (status === "countdown") {
      const elapsed = (now - new Date(room.created_at).getTime()) / 1000;
      if (elapsed >= 10) {
        console.log(`[LUDO STATE] Activating room ${roomId}`);
        await supabase.rpc("activate_ludo_room", { p_room_id: roomId });

        const { data: updated } = await supabase
          .from("ludo_rooms")
          .select("status, match_start_time, turn_start_at")
          .eq("id", roomId)
          .maybeSingle();

        if (updated) {
          status      = updated.status;
          turnStartMs = new Date(updated.turn_start_at).getTime();
        }
      }
    }

    // ── 2. Turn timeout (human players only) ──────────────────────────────────
    if (status === "active" && !turnPlayerId.startsWith("bot_")) {
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

          // Atomic RPC prevents double-advance from concurrent polls
          await supabase.rpc("advance_ludo_turn", {
            p_room_id:             roomId,
            p_expected_turn:       turnPlayerId,
            p_expected_turn_start: room.turn_start_at,
            p_next_turn:           nextTurn,
            p_hearts_p1:           hearts1,
            p_hearts_p2:           hearts2,
          });

          // Static select so TypeScript can infer column types correctly
          const { data: refreshedRaw } = await supabase
            .from("ludo_rooms")
            .select("turn_player_id, turn_start_at, hearts_player_1, hearts_player_2, consecutive_sixes")
            .eq("id", roomId)
            .maybeSingle();

          if (refreshedRaw) {
            // Cast to any to avoid Supabase's GenericStringError on dynamic selects
            const r = refreshedRaw as unknown as Record<string, any>;
            turnPlayerId     = r.turn_player_id;
            turnStartMs      = new Date(r.turn_start_at as string).getTime();
            hearts1          = r.hearts_player_1 as number;
            hearts2          = r.hearts_player_2 as number;
            consecutiveSixes = (r.consecutive_sixes as number) ?? 0;
          }

          diceRolled    = false;
          lastRoll      = 0;
          movablePieces = [];
        } else {
          stateModified = true;
        }
      }
    }

    // ── 3. Match timer expiry ─────────────────────────────────────────────────
    if (status === "active" && matchElapsedSecs >= MATCH_DURATION_SECS) {
      console.log(`[LUDO STATE] Match timer expired room=${roomId}`);
      status = "completed"; winReason = "score_timer";
      if (score1 >= score2) {
        winnerId = String(room.player_1_id); loserId = String(room.player_2_id);
      } else {
        winnerId = String(room.player_2_id); loserId = String(room.player_1_id);
      }
      stateModified = true;
    }

    // ── 4. Bot turns ──────────────────────────────────────────────────────────
    if (status === "active" && turnPlayerId.startsWith("bot_")) {
      const botElapsed = (now - turnStartMs) / 1000;

      if (!diceRolled && botElapsed >= 2.5) {
        // Bot rolls
        const roll         = Math.floor(Math.random() * 6) + 1;
        const botPieces    = boardState.pieces.player_2 as number[];
        const allowedMoves = calcMovablePieces(botPieces, roll);
        const newConsec    = roll === 6 ? consecutiveSixes + 1 : 0;

        console.log(`[LUDO STATE] BOT ROLL room=${roomId} roll=${roll} movable=${JSON.stringify(allowedMoves)}`);

        if (roll === 6 && newConsec >= MAX_CONSECUTIVE_SIXES) {
          // Triple six — forfeit
          turnPlayerId     = String(room.player_1_id);
          consecutiveSixes = 0;
          diceRolled       = false;
          lastRoll         = roll;
          movablePieces    = [];
          console.log(`[LUDO STATE] BOT TRIPLE SIX — passing to player_1`);
        } else if (allowedMoves.length === 0) {
          // No moves — auto-pass
          turnPlayerId     = String(room.player_1_id);
          consecutiveSixes = 0;
          diceRolled       = false;
          lastRoll         = roll;
          movablePieces    = [];
          console.log(`[LUDO STATE] Bot no moves — auto-pass to player_1`);
        } else {
          diceRolled       = true;
          lastRoll         = roll;
          movablePieces    = allowedMoves;
          consecutiveSixes = newConsec;
        }
        stateModified = true;

      } else if (diceRolled && movablePieces.length > 0 && botElapsed >= 2.0) {
        // Bot moves a piece
        const botPieces = boardState.pieces.player_2 as number[];
        const oppPieces = boardState.pieces.player_1 as number[];
        const chosenIdx = botChoosePiece(botPieces, oppPieces, movablePieces, lastRoll);

        console.log(`[LUDO STATE] BOT MOVE room=${roomId} piece=${chosenIdx}`);

        const moveResult = applyMove(botPieces, oppPieces, chosenIdx, lastRoll, false);
        boardState.pieces.player_2 = moveResult.myPieces;
        boardState.pieces.player_1 = moveResult.oppPieces;
        score2 = calcScore(moveResult.myPieces);
        score1 = calcScore(moveResult.oppPieces);

        if (moveResult.isWin) {
          status = "completed"; winnerId = turnPlayerId;
          loserId = String(room.player_1_id); winReason = "normal";
          console.log(`[LUDO STATE] BOT WINS room=${roomId}`);
        } else {
          // Same rule as human move route: getsExtraTurn without consecutiveSixes
          const extraTurn = getsExtraTurn(lastRoll, moveResult.hasCapture, moveResult.reachedFinish);
          if (!extraTurn) {
            turnPlayerId     = String(room.player_1_id);
            consecutiveSixes = 0;
          } else {
            console.log(`[LUDO STATE] Bot gets extra turn`);
            if (lastRoll !== 6) consecutiveSixes = 0; // capture/finish extra turn resets count
          }
          diceRolled    = false;
          lastRoll      = 0;
          movablePieces = [];
        }
        stateModified = true;
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
          updated_at:       new Date().toISOString(),
        };
        if (hasConsecutiveCol) payload.consecutive_sixes = consecutiveSixes;

        await supabase.from("ludo_rooms").update(payload).eq("id", roomId);
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
      },
    });

  } catch (err: any) {
    console.error("[LUDO STATE] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
