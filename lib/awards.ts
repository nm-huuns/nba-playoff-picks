import { put, get } from "@vercel/blob";

export const AWARDS_BLOB_PATHNAME = "awards.txt";

export interface AllNbaTeams {
  first: string[];  // 5 names
  second: string[]; // 5 names
  third: string[];  // 5 names
}

export interface AwardsSubmission {
  timestamp: string; // ISO-8601
  name: string;
  mvp: string;
  roy: string;
  mip: string;  // Most Improved Player
  smoy: string; // Sixth Man of the Year
  coy: string;  // Coach of the Year
  allNBA: AllNbaTeams;
}

const TEAM_SIZE = 5;
const MAX_NAME_LENGTH = 50;
const MAX_PLAYER_LENGTH = 60;

// ---------- Blob I/O ----------

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const merged = chunks.reduce((acc, chunk) => {
    const next = new Uint8Array(acc.length + chunk.length);
    next.set(acc);
    next.set(chunk, acc.length);
    return next;
  }, new Uint8Array());
  return new TextDecoder().decode(merged);
}

export async function readAwardsRaw(): Promise<string> {
  try {
    const result = await get(AWARDS_BLOB_PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode === 304 || !result.stream) return "";
    return await streamToString(result.stream);
  } catch (err) {
    if (err instanceof Error && err.name !== "BlobNotFoundError") {
      console.error("readAwardsRaw error:", err);
    }
    return "";
  }
}

export async function writeAwardsRaw(contents: string): Promise<void> {
  await put(AWARDS_BLOB_PATHNAME, contents, {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "text/plain; charset=utf-8",
    cacheControlMaxAge: 0,
  });
}

export async function appendAwardsLine(line: string): Promise<void> {
  const current = await readAwardsRaw();
  const next =
    current.length > 0 && !current.endsWith("\n")
      ? current + "\n" + line + "\n"
      : current + line + "\n";
  await writeAwardsRaw(next);
}

// ---------- Line format ----------
//
// One submission per line. Structured fields are carried as a JSON payload so we
// never have to worry about pipe/comma/colon collisions in player names:
//
//   <ISO timestamp> | <name> | <JSON blob>
//
// Where <JSON blob> is the exact serialization of:
//   { mvp, roy, mip, smoy, coy, allNBA: { first: string[5], second: string[5], third: string[5] } }
//
// `mip`, `smoy`, and `coy` were added after an initial release that only tracked
// mvp/roy + All-NBA. `parseAwardsLine` tolerates lines written before these fields
// existed by defaulting any missing field to an empty string; new submissions are
// required to include all of them via `validateAwardsSubmission`.

function sanitizeName(name: string): string {
  return name.replace(/[|\n\r]/g, " ").trim();
}

function sanitizePlayer(player: string): string {
  // Keep it permissive (commas, dots, hyphens welcome) but strip anything that
  // would break the line format (pipes, newlines).
  return player.replace(/[|\n\r]/g, " ").trim();
}

export function formatAwardsLine(submission: AwardsSubmission): string {
  const payload = {
    mvp: sanitizePlayer(submission.mvp),
    roy: sanitizePlayer(submission.roy),
    mip: sanitizePlayer(submission.mip),
    smoy: sanitizePlayer(submission.smoy),
    coy: sanitizePlayer(submission.coy),
    allNBA: {
      first: submission.allNBA.first.map(sanitizePlayer),
      second: submission.allNBA.second.map(sanitizePlayer),
      third: submission.allNBA.third.map(sanitizePlayer),
    },
  };
  return `${submission.timestamp} | ${sanitizeName(submission.name)} | ${JSON.stringify(payload)}`;
}

export function parseAwardsLine(line: string): AwardsSubmission | null {
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
    const allNBA = p.allNBA as Record<string, unknown> | undefined;
    if (!allNBA) return null;
    const toStrArr = (v: unknown): string[] | null =>
      Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null;
    const first = toStrArr(allNBA.first);
    const second = toStrArr(allNBA.second);
    const third = toStrArr(allNBA.third);
    if (!first || !second || !third) return null;
    if (typeof p.mvp !== "string" || typeof p.roy !== "string") return null;
    // Tolerate legacy lines that predate the mip/smoy/coy fields.
    const mip = typeof p.mip === "string" ? p.mip : "";
    const smoy = typeof p.smoy === "string" ? p.smoy : "";
    const coy = typeof p.coy === "string" ? p.coy : "";
    return {
      timestamp,
      name,
      mvp: p.mvp,
      roy: p.roy,
      mip,
      smoy,
      coy,
      allNBA: { first, second, third },
    };
  } catch {
    return null;
  }
}

export function parseAwardsFile(contents: string): AwardsSubmission[] {
  return contents
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parseAwardsLine)
    .filter((s): s is AwardsSubmission => s !== null);
}

// ---------- Validation ----------

export type AwardsValidationResult =
  | { ok: true; mvp: string; roy: string; mip: string; smoy: string; coy: string; allNBA: AllNbaTeams }
  | { ok: false; error: string };

interface AwardsSubmitBody {
  name?: unknown;
  mvp?: unknown;
  roy?: unknown;
  mip?: unknown;
  smoy?: unknown;
  coy?: unknown;
  allNBA?: unknown;
}

function validateTeam(label: string, raw: unknown): string[] | string {
  if (!Array.isArray(raw)) return `${label} must be an array of ${TEAM_SIZE} names`;
  if (raw.length !== TEAM_SIZE) return `${label} must have exactly ${TEAM_SIZE} players`;
  const cleaned: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (typeof v !== "string") return `${label} #${i + 1} must be a string`;
    const trimmed = v.trim();
    if (trimmed.length === 0) return `${label} #${i + 1} is required`;
    if (trimmed.length > MAX_PLAYER_LENGTH) {
      return `${label} #${i + 1} must be ${MAX_PLAYER_LENGTH} characters or fewer`;
    }
    cleaned.push(trimmed);
  }
  return cleaned;
}

function validateSinglePlayerAward(label: string, raw: unknown): string | { error: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length === 0) return { error: `${label} is required` };
  if (value.length > MAX_PLAYER_LENGTH) {
    return { error: `${label} must be ${MAX_PLAYER_LENGTH} characters or fewer` };
  }
  return value;
}

export function validateAwardsSubmission(body: AwardsSubmitBody): AwardsValidationResult {
  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  if (nameRaw.length === 0) return { ok: false, error: "Name is required" };
  if (nameRaw.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  const mvp = validateSinglePlayerAward("MVP", body.mvp);
  if (typeof mvp !== "string") return { ok: false, error: mvp.error };
  const roy = validateSinglePlayerAward("Rookie of the Year", body.roy);
  if (typeof roy !== "string") return { ok: false, error: roy.error };
  const mip = validateSinglePlayerAward("Most Improved Player", body.mip);
  if (typeof mip !== "string") return { ok: false, error: mip.error };
  const smoy = validateSinglePlayerAward("Sixth Man of the Year", body.smoy);
  if (typeof smoy !== "string") return { ok: false, error: smoy.error };
  const coy = validateSinglePlayerAward("Coach of the Year", body.coy);
  if (typeof coy !== "string") return { ok: false, error: coy.error };

  if (!body.allNBA || typeof body.allNBA !== "object") {
    return { ok: false, error: "allNBA is required" };
  }
  const allNBA = body.allNBA as Record<string, unknown>;

  const first = validateTeam("All-NBA 1st team player", allNBA.first);
  if (typeof first === "string") return { ok: false, error: first };
  const second = validateTeam("All-NBA 2nd team player", allNBA.second);
  if (typeof second === "string") return { ok: false, error: second };
  const third = validateTeam("All-NBA 3rd team player", allNBA.third);
  if (typeof third === "string") return { ok: false, error: third };

  return {
    ok: true,
    mvp,
    roy,
    mip,
    smoy,
    coy,
    allNBA: { first, second, third },
  };
}
