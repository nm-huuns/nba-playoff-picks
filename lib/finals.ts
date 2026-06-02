import { type BracketConfig, getFinalsMatchups, isFinalsComplete } from "./bracket";

// Finals is a special section (like Awards): instead of a single winner+games
// series pick, users predict the winner of each game (G1–G7) plus four
// single-player awards. Stored as a JSON payload per line so player names keep
// commas / dots / hyphens losslessly.

export const GAME_KEYS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

// Games G1–G4 always happen (minimum series length is a sweep); G5–G7 only if
// the series goes that long, so picks for them are optional.
export const REQUIRED_GAME_KEYS: GameKey[] = ["G1", "G2", "G3", "G4"];

// Per-game winner picks. Each value is a team name; missing key = no pick.
export type GamePicks = Partial<Record<GameKey, string>>;

export interface FinalsSubmission {
  timestamp: string; // ISO-8601
  name: string;
  games: GamePicks;
  mvp: string;
  pointsLeader: string;
  reboundsLeader: string;
  assistsLeader: string;
}

const MAX_NAME_LENGTH = 50;
const MAX_PLAYER_LENGTH = 60;

// ---------- Line format ----------
//
//   <ISO timestamp> | <name> | <JSON blob>
//
// JSON: { games: {G1: "<team>", ...}, mvp, pointsLeader, reboundsLeader, assistsLeader }

function sanitizeName(name: string): string {
  return name.replace(/[|\n\r]/g, " ").trim();
}

function sanitizePlayer(player: string): string {
  return player.replace(/[|\n\r]/g, " ").trim();
}

export function formatFinalsLine(submission: FinalsSubmission): string {
  const games: GamePicks = {};
  for (const k of GAME_KEYS) {
    const v = submission.games[k];
    if (typeof v === "string" && v.trim().length > 0) {
      games[k] = sanitizePlayer(v);
    }
  }
  const payload = {
    games,
    mvp: sanitizePlayer(submission.mvp),
    pointsLeader: sanitizePlayer(submission.pointsLeader),
    reboundsLeader: sanitizePlayer(submission.reboundsLeader),
    assistsLeader: sanitizePlayer(submission.assistsLeader),
  };
  return `${submission.timestamp} | ${sanitizeName(submission.name)} | ${JSON.stringify(payload)}`;
}

export function parseFinalsLine(line: string): FinalsSubmission | null {
  const firstPipe = line.indexOf(" | ");
  if (firstPipe < 0) return null;
  const secondPipe = line.indexOf(" | ", firstPipe + 3);
  if (secondPipe < 0) return null;
  const timestamp = line.slice(0, firstPipe);
  const name = line.slice(firstPipe + 3, secondPipe);
  const jsonStr = line.slice(secondPipe + 3);
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    const rawGames = (p.games as Record<string, unknown> | undefined) ?? {};
    const games: GamePicks = {};
    for (const k of GAME_KEYS) {
      const v = rawGames[k];
      if (typeof v === "string" && v.length > 0) games[k] = v;
    }
    const str = (v: unknown): string => (typeof v === "string" ? v : "");
    return {
      timestamp,
      name,
      games,
      mvp: str(p.mvp),
      pointsLeader: str(p.pointsLeader),
      reboundsLeader: str(p.reboundsLeader),
      assistsLeader: str(p.assistsLeader),
    };
  } catch {
    return null;
  }
}

export function parseFinalsFile(contents: string): FinalsSubmission[] {
  return contents
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parseFinalsLine)
    .filter((s): s is FinalsSubmission => s !== null);
}

// ---------- Validation ----------

export type FinalsValidationResult =
  | {
      ok: true;
      games: GamePicks;
      mvp: string;
      pointsLeader: string;
      reboundsLeader: string;
      assistsLeader: string;
    }
  | { ok: false; error: string };

interface FinalsSubmitBody {
  name?: unknown;
  games?: unknown;
  mvp?: unknown;
  pointsLeader?: unknown;
  reboundsLeader?: unknown;
  assistsLeader?: unknown;
}

function validatePlayer(label: string, raw: unknown): string | { error: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length === 0) return { error: `${label} is required` };
  if (value.length > MAX_PLAYER_LENGTH) {
    return { error: `${label} must be ${MAX_PLAYER_LENGTH} characters or fewer` };
  }
  return value;
}

export function validateFinalsSubmission(
  body: FinalsSubmitBody,
  config: BracketConfig
): FinalsValidationResult {
  if (!isFinalsComplete(config)) {
    return { ok: false, error: "Finals bracket is not yet configured" };
  }

  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  if (nameRaw.length === 0) return { ok: false, error: "Name is required" };
  if (nameRaw.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  const matchup = getFinalsMatchups(config)[0];
  const allowedTeams = [matchup.teamA, matchup.teamB];

  // Per-game winners. G1–G4 required; G5–G7 optional. Each pick must be one of
  // the two Finals teams. No series-coherence check — a "dumb" 2-2 is allowed.
  const rawGames =
    body.games && typeof body.games === "object"
      ? (body.games as Record<string, unknown>)
      : {};
  const games: GamePicks = {};
  for (const k of GAME_KEYS) {
    const v = rawGames[k];
    const required = REQUIRED_GAME_KEYS.includes(k);
    if (v === undefined || v === null || v === "") {
      if (required) return { ok: false, error: `Pick a winner for ${k}` };
      continue;
    }
    if (typeof v !== "string" || !allowedTeams.includes(v)) {
      return { ok: false, error: `Winner for ${k} must be one of: ${allowedTeams.join(", ")}` };
    }
    games[k] = v;
  }

  const mvp = validatePlayer("Finals MVP", body.mvp);
  if (typeof mvp !== "string") return { ok: false, error: mvp.error };
  const pointsLeader = validatePlayer("Points leader", body.pointsLeader);
  if (typeof pointsLeader !== "string") return { ok: false, error: pointsLeader.error };
  const reboundsLeader = validatePlayer("Rebounds leader", body.reboundsLeader);
  if (typeof reboundsLeader !== "string") return { ok: false, error: reboundsLeader.error };
  const assistsLeader = validatePlayer("Assists leader", body.assistsLeader);
  if (typeof assistsLeader !== "string") return { ok: false, error: assistsLeader.error };

  return { ok: true, games, mvp, pointsLeader, reboundsLeader, assistsLeader };
}
