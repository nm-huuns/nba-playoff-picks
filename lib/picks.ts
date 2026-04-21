import { put, get } from "@vercel/blob";
import {
  type BracketConfig,
  type Matchup,
  getMatchups,
  isBracketComplete,
  SERIES_IDS,
} from "./bracket";

export const BLOB_PATHNAME = "picks.txt";
export const ROUND2_BLOB_PATHNAME = "picks-r2.txt";
export const VALID_GAMES = [4, 5, 6, 7] as const;
export type Games = (typeof VALID_GAMES)[number];

export interface Pick {
  seriesId: string;
  winner: string;
  games: Games;
}

export interface ConferenceWinners {
  east: string;
  west: string;
}

export interface Submission {
  timestamp: string; // ISO-8601
  name: string;
  picks: Pick[];
  conferenceWinners?: ConferenceWinners;
}

// ---------- Blob I/O ----------

export async function readPicksRaw(pathname: string = BLOB_PATHNAME): Promise<string> {
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode === 304 || !result.stream) return "";
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array())
    );
  } catch (err) {
    // If the blob doesn't exist yet, treat as empty.
    // Log other errors so they surface in Vercel function logs.
    if (err instanceof Error && err.name !== "BlobNotFoundError") {
      console.error("readPicksRaw error:", err);
    }
    return "";
  }
}

export async function writePicksRaw(
  contents: string,
  pathname: string = BLOB_PATHNAME
): Promise<void> {
  await put(pathname, contents, {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "text/plain; charset=utf-8",
    cacheControlMaxAge: 0,
  });
}

// Append a single submission line. Vercel Blob has no true append —
// we read current contents and write back with the new line added.
export async function appendSubmissionLine(
  line: string,
  pathname: string = BLOB_PATHNAME
): Promise<void> {
  const current = await readPicksRaw(pathname);
  const next = current.length > 0 && !current.endsWith("\n") ? current + "\n" + line + "\n" : current + line + "\n";
  await writePicksRaw(next, pathname);
}

// ---------- Line format ----------

// Escapes a name so it can't break the pipe-delimited line format.
function sanitizeName(name: string): string {
  return name.replace(/[|\n\r,]/g, " ").trim();
}

function sanitizeTeam(team: string): string {
  return team.replace(/[|\n\r,:]/g, " ").trim();
}

// Conference-winner team is written into a `KEY=value;KEY=value` segment, so
// we additionally strip `=` and `;` here.
function sanitizeConferenceWinner(team: string): string {
  return team.replace(/[|\n\r,:;=]/g, " ").trim();
}

export function formatLine(submission: Submission): string {
  const picksStr = submission.picks
    .map((p) => `${p.seriesId}:${sanitizeTeam(p.winner)}-${p.games}`)
    .join(",");
  const base = `${submission.timestamp} | ${sanitizeName(submission.name)} | ${picksStr}`;
  if (submission.conferenceWinners) {
    const cw = submission.conferenceWinners;
    return `${base} | EAST=${sanitizeConferenceWinner(cw.east)};WEST=${sanitizeConferenceWinner(cw.west)}`;
  }
  return base;
}

function parseConferenceWinners(segment: string): ConferenceWinners | undefined {
  let east: string | undefined;
  let west: string | undefined;
  for (const part of segment.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx < 0) continue;
    const key = part.slice(0, eqIdx).trim().toUpperCase();
    const value = part.slice(eqIdx + 1).trim();
    if (key === "EAST") east = value;
    else if (key === "WEST") west = value;
  }
  if (!east || !west) return undefined;
  return { east, west };
}

export function parseLine(line: string): Submission | null {
  const parts = line.split(" | ");
  if (parts.length < 3) return null;
  const [timestamp, name, picksStr, conferenceWinnersStr] = parts;
  const picks: Pick[] = [];
  for (const token of picksStr.split(",")) {
    const colonIdx = token.indexOf(":");
    if (colonIdx < 0) return null;
    const seriesId = token.slice(0, colonIdx);
    const rest = token.slice(colonIdx + 1);
    const dashIdx = rest.lastIndexOf("-");
    if (dashIdx < 0) return null;
    const winner = rest.slice(0, dashIdx);
    const games = Number(rest.slice(dashIdx + 1));
    if (!VALID_GAMES.includes(games as Games)) return null;
    picks.push({ seriesId, winner, games: games as Games });
  }
  const submission: Submission = { timestamp, name, picks };
  if (conferenceWinnersStr) {
    const cw = parseConferenceWinners(conferenceWinnersStr);
    if (cw) submission.conferenceWinners = cw;
  }
  return submission;
}

export function parsePicksFile(contents: string): Submission[] {
  return contents
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parseLine)
    .filter((s): s is Submission => s !== null);
}

// ---------- Validation ----------

export type ValidationResult =
  | { ok: true; picks: Pick[]; conferenceWinners: ConferenceWinners }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 50;

interface SubmitBody {
  name?: unknown;
  picks?: unknown;
  eastConferenceWinner?: unknown;
  westConferenceWinner?: unknown;
}

function isPickShape(x: unknown): x is { seriesId: string; winner: string; games: number } {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.seriesId === "string" &&
    typeof p.winner === "string" &&
    typeof p.games === "number"
  );
}

export function validateSubmission(body: SubmitBody, config: BracketConfig): ValidationResult {
  if (!isBracketComplete(config)) {
    return { ok: false, error: "Bracket is not fully configured yet" };
  }

  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  if (nameRaw.length === 0) return { ok: false, error: "Name is required" };
  if (nameRaw.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  if (!Array.isArray(body.picks)) return { ok: false, error: "picks must be an array" };
  if (body.picks.length !== SERIES_IDS.length) {
    return { ok: false, error: `Expected ${SERIES_IDS.length} picks, got ${body.picks.length}` };
  }

  // Conference winner validation: must be a non-empty string and one of the
  // configured teams in the corresponding conference.
  const eastTeams = config.east.map((t) => t.team);
  const westTeams = config.west.map((t) => t.team);
  const eastWinnerRaw =
    typeof body.eastConferenceWinner === "string" ? body.eastConferenceWinner.trim() : "";
  const westWinnerRaw =
    typeof body.westConferenceWinner === "string" ? body.westConferenceWinner.trim() : "";
  if (eastWinnerRaw.length === 0) {
    return { ok: false, error: "Eastern Conference winner is required" };
  }
  if (westWinnerRaw.length === 0) {
    return { ok: false, error: "Western Conference winner is required" };
  }
  if (!eastTeams.includes(eastWinnerRaw)) {
    return {
      ok: false,
      error: `Eastern Conference winner must be one of the East teams`,
    };
  }
  if (!westTeams.includes(westWinnerRaw)) {
    return {
      ok: false,
      error: `Western Conference winner must be one of the West teams`,
    };
  }

  const matchups = getMatchups(config);
  const matchupById = new Map<string, Matchup>(matchups.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const picks: Pick[] = [];

  for (const raw of body.picks) {
    if (!isPickShape(raw)) return { ok: false, error: "Each pick must have seriesId, winner, games" };
    const m = matchupById.get(raw.seriesId);
    if (!m) return { ok: false, error: `Unknown seriesId: ${raw.seriesId}` };
    if (seen.has(raw.seriesId)) return { ok: false, error: `Duplicate seriesId: ${raw.seriesId}` };
    seen.add(raw.seriesId);

    const allowed = [m.high.team, m.low.team];
    if (!allowed.includes(raw.winner)) {
      return { ok: false, error: `Winner for ${raw.seriesId} must be one of: ${allowed.join(", ")}` };
    }

    if (!VALID_GAMES.includes(raw.games as Games)) {
      return { ok: false, error: `Games for ${raw.seriesId} must be 4, 5, 6, or 7` };
    }

    picks.push({ seriesId: raw.seriesId, winner: raw.winner, games: raw.games as Games });
  }

  // Return picks in the canonical series order.
  const ordered = SERIES_IDS.map((id) => picks.find((p) => p.seriesId === id)!);
  return {
    ok: true,
    picks: ordered,
    conferenceWinners: { east: eastWinnerRaw, west: westWinnerRaw },
  };
}

export { getMatchups, SERIES_IDS };
