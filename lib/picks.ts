import { put, get } from "@vercel/blob";
import {
  type BracketConfig,
  type Matchup,
  getMatchups,
  isBracketComplete,
  SERIES_IDS,
} from "./bracket";

export const BLOB_PATHNAME = "picks.txt";
export const VALID_GAMES = [4, 5, 6, 7] as const;
export type Games = (typeof VALID_GAMES)[number];

export interface Pick {
  seriesId: string;
  winner: string;
  games: Games;
}

export interface Submission {
  timestamp: string; // ISO-8601
  name: string;
  picks: Pick[];
}

// ---------- Blob I/O ----------

export async function readPicksRaw(): Promise<string> {
  try {
    const result = await get(BLOB_PATHNAME, { access: "public", useCache: false });
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
  } catch {
    // If the blob doesn't exist yet, treat as empty.
    return "";
  }
}

export async function writePicksRaw(contents: string): Promise<void> {
  await put(BLOB_PATHNAME, contents, {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "text/plain; charset=utf-8",
    cacheControlMaxAge: 0,
  });
}

// Append a single submission line. Vercel Blob has no true append —
// we read current contents and write back with the new line added.
export async function appendSubmissionLine(line: string): Promise<void> {
  const current = await readPicksRaw();
  const next = current.length > 0 && !current.endsWith("\n") ? current + "\n" + line + "\n" : current + line + "\n";
  await writePicksRaw(next);
}

// ---------- Line format ----------

// Escapes a name so it can't break the pipe-delimited line format.
function sanitizeName(name: string): string {
  return name.replace(/[|\n\r,]/g, " ").trim();
}

function sanitizeTeam(team: string): string {
  return team.replace(/[|\n\r,:]/g, " ").trim();
}

export function formatLine(submission: Submission): string {
  const picksStr = submission.picks
    .map((p) => `${p.seriesId}:${sanitizeTeam(p.winner)}-${p.games}`)
    .join(",");
  return `${submission.timestamp} | ${sanitizeName(submission.name)} | ${picksStr}`;
}

export function parseLine(line: string): Submission | null {
  const parts = line.split(" | ");
  if (parts.length < 3) return null;
  const [timestamp, name, picksStr] = parts;
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
  return { timestamp, name, picks };
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
  | { ok: true; picks: Pick[] }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 50;

interface SubmitBody {
  name?: unknown;
  picks?: unknown;
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
  return { ok: true, picks: ordered };
}

export { getMatchups, SERIES_IDS };
