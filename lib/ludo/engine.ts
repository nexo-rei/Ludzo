export const MATCH_SECONDS = 480;
export const TURN_SECONDS = 18;
export const SAFE_CELLS = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

export type LudoPlayerKey = "player_1" | "player_2";
export type BoardState = { pieces: Record<LudoPlayerKey, number[]>; bot_profile?: { name: string; avatar: string } };

export function normalizeBoardState(input: any): BoardState {
  const p1 = Array.isArray(input?.pieces?.player_1) ? input.pieces.player_1 : [0, 0, 0, 0];
  const p2 = Array.isArray(input?.pieces?.player_2) ? input.pieces.player_2 : [0, 0, 0, 0];
  return {
    ...input,
    pieces: {
      player_1: [0, 1, 2, 3].map((i) => clampPosition(Number(p1[i] ?? 0))),
      player_2: [0, 1, 2, 3].map((i) => clampPosition(Number(p2[i] ?? 0))),
    },
  };
}

export function clampPosition(pos: number) {
  if (!Number.isFinite(pos)) return 0;
  return Math.max(0, Math.min(57, Math.trunc(pos)));
}

export function playerKey(isPlayer1: boolean): LudoPlayerKey { return isPlayer1 ? "player_1" : "player_2"; }
export function opponentKey(key: LudoPlayerKey): LudoPlayerKey { return key === "player_1" ? "player_2" : "player_1"; }

export function trackCell(key: LudoPlayerKey, pos: number) {
  if (pos < 1 || pos > 51) return null;
  return key === "player_1" ? pos % 52 : (26 + pos) % 52;
}

export function movablePieces(board: BoardState, key: LudoPlayerKey, roll: number): number[] {
  const pieces = board.pieces[key] ?? [0, 0, 0, 0];
  return pieces.reduce<number[]>((acc, pos, idx) => {
    if ((pos === 0 && roll === 6) || (pos > 0 && pos < 57 && pos + roll <= 57)) acc.push(idx);
    return acc;
  }, []);
}

export function scorePieces(pieces: number[]) {
  return pieces.reduce((sum, p) => sum + (p === 57 ? 64 : Math.max(0, p)), 0);
}

export function movePiece(boardInput: any, key: LudoPlayerKey, pieceIndex: number, roll: number) {
  const board = normalizeBoardState(boardInput);
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0 || pieceIndex > 3) throw new Error("Invalid piece index");
  if (!movablePieces(board, key, roll).includes(pieceIndex)) throw new Error("Piece cannot move for this roll");

  const oppKey = opponentKey(key);
  const pieces = [...board.pieces[key]];
  const oppPieces = [...board.pieces[oppKey]];
  const from = pieces[pieceIndex];
  const to = from === 0 ? 1 : from + roll;
  pieces[pieceIndex] = to;

  let hasCapture = false;
  const cell = trackCell(key, to);
  if (cell !== null && !SAFE_CELLS.has(cell)) {
    for (let i = 0; i < oppPieces.length; i++) {
      if (trackCell(oppKey, oppPieces[i]) === cell) {
        oppPieces[i] = 0;
        hasCapture = true;
      }
    }
  }

  board.pieces[key] = pieces;
  board.pieces[oppKey] = oppPieces;
  return {
    board,
    from,
    to,
    hasCapture,
    finished: to === 57,
    won: pieces.every((p) => p === 57),
    score1: scorePieces(board.pieces.player_1),
    score2: scorePieces(board.pieces.player_2),
  };
}
