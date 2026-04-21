import { put, get } from "@vercel/blob";

export const LOCK_BLOB_PATHNAME = "lock.json";

export type LockKind = "r1" | "r2" | "awards";
export const LOCK_KINDS: LockKind[] = ["r1", "r2", "awards"];

export interface LockState {
  r1: boolean;
  r2: boolean;
  awards: boolean;
}

const DEFAULT_STATE: LockState = { r1: false, r2: false, awards: false };

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

// Parses both the new per-kind shape and the legacy `{ locked: boolean }` shape.
// Legacy shape maps to: r1 = locked, r2 = false, awards = false.
function normalize(raw: unknown): LockState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const obj = raw as Record<string, unknown>;
  const hasPerKind =
    "r1" in obj || "r2" in obj || "awards" in obj;
  if (hasPerKind) {
    return {
      r1: Boolean(obj.r1),
      r2: Boolean(obj.r2),
      awards: Boolean(obj.awards),
    };
  }
  if ("locked" in obj) {
    return { r1: Boolean(obj.locked), r2: false, awards: false };
  }
  return { ...DEFAULT_STATE };
}

export async function readLockState(): Promise<LockState> {
  try {
    const result = await get(LOCK_BLOB_PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode === 304 || !result.stream) return { ...DEFAULT_STATE };
    const text = await streamToString(result.stream);
    if (!text.trim()) return { ...DEFAULT_STATE };
    const parsed: unknown = JSON.parse(text);
    return normalize(parsed);
  } catch (err) {
    if (err instanceof Error && err.name !== "BlobNotFoundError") {
      console.error("readLockState error:", err);
    }
    return { ...DEFAULT_STATE };
  }
}

export async function writeLockState(state: LockState): Promise<void> {
  await put(LOCK_BLOB_PATHNAME, JSON.stringify(state), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 0,
  });
}

export async function toggleLockKind(kind: LockKind): Promise<LockState> {
  const current = await readLockState();
  const next: LockState = { ...current, [kind]: !current[kind] };
  await writeLockState(next);
  return next;
}

export function isLockKind(value: unknown): value is LockKind {
  return value === "r1" || value === "r2" || value === "awards";
}
