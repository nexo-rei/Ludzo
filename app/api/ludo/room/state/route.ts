import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATCH_SECONDS, TURN_SECONDS, normalizeBoardState } from "@/lib/ludo/engine";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
      return NextResponse.json({ success: false, error: "Room ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Fetch Room Details
    const { data: room, error } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // Verify user is a player in this room
    if (room.player_1_id !== userId && room.player_2_id !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let boardState = normalizeBoardState(room.board_state);
    let status = room.status;
    let turnPlayerId = room.turn_player_id;
    let turnStartAt = new Date(room.turn_start_at).getTime();
    let diceRolled = room.dice_rolled;
    let lastRoll = room.last_roll;
    let movablePieces = room.movable_pieces || [];
    let hearts1 = room.hearts_player_1;
    let hearts2 = room.hearts_player_2;
    let score1 = room.score_player_1;
    let score2 = room.score_player_2;
    let winnerId = room.winner_id;
    let loserId = room.loser_id;
    let winReason = room.win_reason;
    let turnChanged = false;
    let stateModified = false;

    const now = Date.now();
    const matchStartAt = room.match_start_at || room.created_at;
    const matchDuration = Math.floor((now - new Date(matchStartAt).getTime()) / 1000);

    // 1. Handle Countdown Transition (10 seconds)
    if (status === "countdown") {
      const elapsedSinceCreated = (now - new Date(room.created_at).getTime()) / 1000;
      if (elapsedSinceCreated >= 10) {
        status = "active";
        turnStartAt = now;
        stateModified = true;
      }
    }

    // 2. Handle Turn Timeouts (18 seconds total: 15s turn + 3s extra warning)
    if (status === "active") {
      const turnElapsed = (now - turnStartAt) / 1000;
      if (turnElapsed >= TURN_SECONDS) {
        // Apply heart loss penalty to current turn player
        if (turnPlayerId === room.player_1_id) {
          hearts1 = Math.max(0, hearts1 - 1);
          if (hearts1 <= 0) {
            // Player 1 auto-forfeits! Player 2 wins.
            status = "completed";
            winnerId = room.player_2_id;
            loserId = room.player_1_id;
            winReason = "timeout";
          }
        } else {
          hearts2 = Math.max(0, hearts2 - 1);
          if (hearts2 <= 0) {
            // Player 2 auto-forfeits! Player 1 wins.
            status = "completed";
            winnerId = room.player_1_id;
            loserId = room.player_2_id;
            winReason = "timeout";
          }
        }

        if (status !== "completed") {
          // Switch turn
          turnPlayerId = turnPlayerId === room.player_1_id ? room.player_2_id : room.player_1_id;
          turnStartAt = now;
          diceRolled = false;
          lastRoll = 0;
          movablePieces = [];
        }
        stateModified = true;
        turnChanged = true;
      }
    }

    // 3. Handle Game Match Timer Expiry (8 Minutes = 480 seconds)
    if (status === "active" && matchDuration >= MATCH_SECONDS) {
      status = "completed";
      winReason = "score_timer";
      if (score1 === score2) {
        // Equal scores: Player 1 wins by default or split, let's declare Player 1 winner
        winnerId = room.player_1_id;
        loserId = room.player_2_id;
      } else {
        winnerId = score1 > score2 ? room.player_1_id : room.player_2_id;
        loserId = score1 > score2 ? room.player_2_id : room.player_1_id;
      }
      stateModified = true;
    }

    // 4. Handle Server-Authoritative Bot Turns
    if (status === "active" && turnPlayerId.startsWith("bot_") && !turnChanged) {
      const botId = turnPlayerId;
      const botElapsed = (now - turnStartAt) / 1000;

      if (!diceRolled) {
        // Bot Rolls Dice (Thinking time: 2.5 seconds)
        if (botElapsed >= 2.5) {
          const roll = Math.floor(Math.random() * 6) + 1;
          diceRolled = true;
          lastRoll = roll;
          turnStartAt = now;

          // Calculate bot's movable pieces (Player 2 is the Bot)
          const botPieces = boardState.pieces.player_2;
          const allowedMoves: number[] = [];
          for (let i = 0; i < 4; i++) {
            const pos = botPieces[i];
            if (pos === 0 && roll === 6) allowedMoves.push(i);
            else if (pos > 0 && pos + roll <= 57) allowedMoves.push(i);
          }

          movablePieces = allowedMoves;

          // If no moves, switch turn back immediately
          if (allowedMoves.length === 0) {
            turnPlayerId = room.player_1_id;
            turnStartAt = now;
            diceRolled = false;
            lastRoll = 0;
            movablePieces = [];
          }

          stateModified = true;
        }
      } else {
        // Bot Moves Piece (Thinking time: 2.0 seconds)
        if (botElapsed >= 2.0 && movablePieces.length > 0) {
          const botPieces = boardState.pieces.player_2;
          const opponentPieces = boardState.pieces.player_1;

          // AI Heuristics to choose best piece index:
          // 1. Capture opponent piece if possible
          // 2. Reach home if possible
          // 3. Move piece that is furthest ahead
          let selectedPieceIdx = movablePieces[0];
          let bestHeuristicScore = -999;

          for (const idx of movablePieces) {
            const pos = botPieces[idx];
            const nextPos = pos === 0 ? 1 : pos + lastRoll;
            let hScore = nextPos; // prioritize further pieces

            if (nextPos === 57) hScore += 1000; // Reach home!

            // Capture check
            if (nextPos >= 1 && nextPos <= 51) {
              const cellIdx = (26 + nextPos) % 52;
              const isSafe = [1, 9, 14, 22, 27, 35, 40, 48].includes(cellIdx);
              if (!isSafe) {
                // Check if we hit any Player 1 piece
                for (let oIdx = 0; oIdx < 4; oIdx++) {
                  const oPos = opponentPieces[oIdx];
                  if (oPos >= 1 && oPos <= 51 && (oPos % 52) === cellIdx) {
                    hScore += 500; // High capture priority!
                    break;
                  }
                }
              }
            }

            if (hScore > bestHeuristicScore) {
              bestHeuristicScore = hScore;
              selectedPieceIdx = idx;
            }
          }

          // Move chosen piece
          const currPos = botPieces[selectedPieceIdx];
          const nextPos = currPos === 0 ? 1 : currPos + lastRoll;
          botPieces[selectedPieceIdx] = nextPos;

          // Apply capture resetting for opponent pieces
          let hasCapture = false;
          if (nextPos >= 1 && nextPos <= 51) {
            const cellIdx = (26 + nextPos) % 52;
            const isSafe = [1, 9, 14, 22, 27, 35, 40, 48].includes(cellIdx);
            if (!isSafe) {
              for (let oIdx = 0; oIdx < 4; oIdx++) {
                const oPos = opponentPieces[oIdx];
                if (oPos >= 1 && oPos <= 51 && (oPos % 52) === cellIdx) {
                  opponentPieces[oIdx] = 0; // sent back to Yard
                  hasCapture = true;
                }
              }
            }
          }

          boardState.pieces.player_2 = botPieces;
          boardState.pieces.player_1 = opponentPieces;

          // Recalculate Bot Score
          score2 = botPieces.reduce((sum: number, p: number) => sum + p, 0);

          // Check Win Condition
          const isBotWin = botPieces.every((p: number) => p === 57);
          if (isBotWin) {
            status = "completed";
            winnerId = botId;
            loserId = room.player_1_id;
            winReason = "normal";
          } else {
            // Extra turn rules
            const extraTurn = lastRoll === 6 || hasCapture || nextPos === 57;
            if (extraTurn) {
              turnPlayerId = botId;
              turnStartAt = now;
              diceRolled = false;
              lastRoll = 0;
              movablePieces = [];
            } else {
              turnPlayerId = room.player_1_id;
              turnStartAt = now;
              diceRolled = false;
              lastRoll = 0;
              movablePieces = [];
            }
          }

          stateModified = true;
        }
      }
    }

    // 5. Save updated state and Settle Match if Completed
    if (stateModified) {
      if (status === "completed") {
        // Trigger atomic match settlement RPC in Supabase
        await supabase.rpc("settle_ludo_match", {
          p_room_id: roomId,
          p_winner_id: winnerId,
          p_loser_id: loserId,
          p_win_reason: winReason,
          p_duration: matchDuration
        });
      } else {
        // Normal update
        await supabase
          .from("ludo_rooms")
          .update({
            status,
            turn_player_id: turnPlayerId,
            turn_start_at: new Date(turnStartAt).toISOString(),
            dice_rolled: diceRolled,
            last_roll: lastRoll,
            movable_pieces: movablePieces,
            hearts_player_1: hearts1,
            hearts_player_2: hearts2,
            score_player_1: score1,
            score_player_2: score2,
            board_state: boardState,
            updated_at: new Date().toISOString()
          })
          .eq("id", roomId);
      }
    }

    // Fetch user details for profiles
    const { data: p1User } = await supabase
      .from("users")
      .select("first_name, photo_url")
      .eq("id", room.player_1_id)
      .maybeSingle();

    let p2Profile = { name: "Ludo Bot", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bot" };

    if (!room.player_2_id.startsWith("bot_")) {
      const { data: p2User } = await supabase
        .from("users")
        .select("first_name, photo_url")
        .eq("id", room.player_2_id)
        .maybeSingle();
      if (p2User) {
        p2Profile = {
          name: p2User.first_name,
          avatar: p2User.photo_url || "https://api.dicebear.com/7.x/adventurer/svg?seed=Player2"
        };
      }
    } else {
      p2Profile = boardState.bot_profile || p2Profile;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: roomId,
        stake: room.stake,
        player_1_id: room.player_1_id,
        player_2_id: room.player_2_id,
        player_1_profile: {
          name: p1User?.first_name || "Player 1",
          avatar: p1User?.photo_url || "https://api.dicebear.com/7.x/adventurer/svg?seed=Player1"
        },
        player_2_profile: p2Profile,
        status,
        turn_player_id: turnPlayerId,
        turn_remaining_seconds: Math.max(0, TURN_SECONDS - Math.floor((now - turnStartAt) / 1000)),
        match_start_time: matchStartAt,
        server_time: new Date(now).toISOString(),
        match_remaining_seconds: Math.max(0, MATCH_SECONDS - matchDuration),
        dice_rolled: diceRolled,
        last_roll: lastRoll,
        movable_pieces: movablePieces,
        hearts_player_1: hearts1,
        hearts_player_2: hearts2,
        score_player_1: score1,
        score_player_2: score2,
        winner_id: winnerId,
        loser_id: loserId,
        win_reason: winReason,
        board_state: boardState,
        chat_reactions: room.chat_reactions || []
      }
    });

  } catch (err: any) {
    console.error("[ludo_room_state]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
