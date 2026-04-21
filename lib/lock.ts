import { put, get } from "@vercel/blob";

export const LOCK_BLOB_PATHNAME = "lock.json";

export interface LockState {
  locked: boolean;
}

const DEFAULT_STATE: LockState = { locked: false };

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

export async function readLockState(): Promise<LockState> {
  try {
    const result = await get(LOCK_BLOB_PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode === 304 || !result.stream) return DEFAULT_STATE;
    const text = await streamToString(result.stream);
    if (!text.trim()) return DEFAULT_STATE;
    const parsed = JSON.parse(text) as Partial<LockState>;
    return { locked: Boolean(parsed.locked) };
  } catch (err) {
    // Missing blob → default unlocked. Log other errors for diagnostics.
    if (err instanceof Error && err.name !== "BlobNotFoundError") {
      console.error("readLockState error:", err);
    }
    return DEFAULT_STATE;
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

export async function toggleLockState(): Promise<LockState> {
  const current = await readLockState();
  const next: LockState = { locked: !current.locked };
  await writeLockState(next);
  return next;
}
