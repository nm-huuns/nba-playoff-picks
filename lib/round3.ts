import {
  type BracketConfig,
  type Round3Matchup,
  getRound3Matchups,
  isRound3Complete,
} from "./bracket";
import { VALID_GAMES, type Games } from "./picks";

export interface Round3Pick {
  matchupId: string;
  winner: string;
  games: Games;
}

export interface Round3Submission {
  timestamp: string; // ISO-8601
  name: string;
  picks: Round3Pick[];
}

// ---------- Line format ----------
//
// One submission per line:
//   <ISO timestamp> | <name> | <matchupId>:<winner>-<games>,<matchupId>:<winner>-<games>,...
//
// Identical shape to the Round 2 picks file (no conference-winner segment).

function sanitizeName(name: string): string {
  return name.replace(/[|\n\r,]/g, " ").trim();
}

function sanitizeTeam(team: string): string {
  return team.replace(/[|\n\r,:]/g, " ").trim();
}

export function formatRound3Line(submission: Round3Submission): string {
  const picksStr = submission.picks
    .map((p) => `${p.matchupId}:${sanitizeTeam(p.winner)}-${p.games}`)
    .join(",");
  return `${submission.timestamp} | ${sanitizeName(submission.name)} | ${picksStr}`;
}

export function parseRound3Line(line: string): Round3Submission | null {
  const parts = line.split(" | ");
  if (parts.length < 3) return null;
  const [timestamp, name, picksStr] = parts;
  const picks: Round3Pick[] = [];
  for (const token of picksStr.split(",")) {
    const colonIdx = token.indexOf(":");
    if (colonIdx < 0) return null;
    const matchupId = token.slice(0, colonIdx);
    const rest = token.slice(colonIdx + 1);
    const dashIdx = rest.lastIndexOf("-");
    if (dashIdx < 0) return null;
    const winner = rest.slice(0, dashIdx);
    const games = Number(rest.slice(dashIdx + 1));
    if (!VALID_GAMES.includes(games as Games)) return null;
    picks.push({ matchupId, winner, games: games as Games });
  }
  return { timestamp, name, picks };
}

export function parseRound3File(contents: string): Round3Submission[] {
  return contents
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parseRound3Line)
    .filter((s): s is Round3Submission => s !== null);
}

// ---------- Validation ----------

export type Round3ValidationResult =
  | { ok: true; picks: Round3Pick[] }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 50;

interface Round3SubmitBody {
  name?: unknown;
  picks?: unknown;
}

function isPickShape(x: unknown): x is { matchupId: string; winner: string; games: number } {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.matchupId === "string" &&
    typeof p.winner === "string" &&
    typeof p.games === "number"
  );
}

export function validateRound3Submission(
  body: Round3SubmitBody,
  config: BracketConfig
): Round3ValidationResult {
  if (!isRound3Complete(config)) {
    return { ok: false, error: "Round 3 bracket is not yet configured" };
  }

  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  if (nameRaw.length === 0) return { ok: false, error: "Name is required" };
  if (nameRaw.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  const matchups = getRound3Matchups(config);
  if (!Array.isArray(body.picks)) {
    return { ok: false, error: "picks must be an array" };
  }
  if (body.picks.length !== matchups.length) {
    return {
      ok: false,
      error: `Expected ${matchups.length} picks, got ${body.picks.length}`,
    };
  }

  const matchupById = new Map<string, Round3Matchup>(matchups.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const picks: Round3Pick[] = [];

  for (const raw of body.picks) {
    if (!isPickShape(raw)) {
      return { ok: false, error: "Each pick must have matchupId, winner, games" };
    }
    const m = matchupById.get(raw.matchupId);
    if (!m) return { ok: false, error: `Unknown matchupId: ${raw.matchupId}` };
    if (seen.has(raw.matchupId)) {
      return { ok: false, error: `Duplicate matchupId: ${raw.matchupId}` };
    }
    seen.add(raw.matchupId);

    const allowed = [m.teamA, m.teamB];
    if (!allowed.includes(raw.winner)) {
      return {
        ok: false,
        error: `Winner for ${raw.matchupId} must be one of: ${allowed.join(", ")}`,
      };
    }

    if (!VALID_GAMES.includes(raw.games as Games)) {
      return { ok: false, error: `Games for ${raw.matchupId} must be 4, 5, 6, or 7` };
    }

    picks.push({ matchupId: raw.matchupId, winner: raw.winner, games: raw.games as Games });
  }

  // Return picks in the canonical order from the config.
  const ordered = matchups.map((m) => picks.find((p) => p.matchupId === m.id)!);
  return { ok: true, picks: ordered };
}
