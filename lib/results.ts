import { put, get } from "@vercel/blob";
import type { Games } from "./picks";
import { VALID_GAMES } from "./picks";

export const RESULTS_BLOB_PATHNAME = "results.json";

export interface SeriesResult {
  winner: string; // empty string = not yet decided
  games: number;  // 0 = not yet decided; otherwise 4..7
}

export interface AwardsResults {
  mvp: string;
  roy: string;
  mip: string;
  smoy: string;
  coy: string;
  allNBA: {
    first: string[];  // 5 entries; "" = not yet decided
    second: string[];
    third: string[];
  };
}

export interface ResultsState {
  r1: {
    conferenceWinners: { east: string; west: string };
    series: Record<string, SeriesResult>;
  };
  r2: {
    series: Record<string, SeriesResult>;
  };
  r3: {
    series: Record<string, SeriesResult>;
  };
  finals: {
    series: Record<string, SeriesResult>;
  };
  awards: AwardsResults;
}

const TEAM_SIZE = 5;

function emptyTeam(): string[] {
  return Array.from({ length: TEAM_SIZE }, () => "");
}

export function emptyResultsState(): ResultsState {
  return {
    r1: {
      conferenceWinners: { east: "", west: "" },
      series: {},
    },
    r2: {
      series: {},
    },
    r3: {
      series: {},
    },
    finals: {
      series: {},
    },
    awards: {
      mvp: "",
      roy: "",
      mip: "",
      smoy: "",
      coy: "",
      allNBA: {
        first: emptyTeam(),
        second: emptyTeam(),
        third: emptyTeam(),
      },
    },
  };
}

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

function isSeriesResult(x: unknown): x is SeriesResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.winner === "string" && typeof o.games === "number";
}

function normalizeSeriesMap(raw: unknown): Record<string, SeriesResult> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, SeriesResult> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isSeriesResult(value)) {
      out[id] = { winner: value.winner, games: value.games };
    }
  }
  return out;
}

function normalizeStringArr(raw: unknown): string[] {
  if (!Array.isArray(raw)) return emptyTeam();
  const out = raw.slice(0, TEAM_SIZE).map((v) => (typeof v === "string" ? v : ""));
  while (out.length < TEAM_SIZE) out.push("");
  return out;
}

function normalize(raw: unknown): ResultsState {
  const empty = emptyResultsState();
  if (!raw || typeof raw !== "object") return empty;
  const root = raw as Record<string, unknown>;

  const r1 = (root.r1 as Record<string, unknown> | undefined) ?? {};
  const r1cw = (r1.conferenceWinners as Record<string, unknown> | undefined) ?? {};
  const r2 = (root.r2 as Record<string, unknown> | undefined) ?? {};
  const r3 = (root.r3 as Record<string, unknown> | undefined) ?? {};
  const finals = (root.finals as Record<string, unknown> | undefined) ?? {};
  const aw = (root.awards as Record<string, unknown> | undefined) ?? {};
  const allNBA = (aw.allNBA as Record<string, unknown> | undefined) ?? {};

  return {
    r1: {
      conferenceWinners: {
        east: typeof r1cw.east === "string" ? r1cw.east : "",
        west: typeof r1cw.west === "string" ? r1cw.west : "",
      },
      series: normalizeSeriesMap(r1.series),
    },
    r2: {
      series: normalizeSeriesMap(r2.series),
    },
    r3: {
      series: normalizeSeriesMap(r3.series),
    },
    finals: {
      series: normalizeSeriesMap(finals.series),
    },
    awards: {
      mvp: typeof aw.mvp === "string" ? aw.mvp : "",
      roy: typeof aw.roy === "string" ? aw.roy : "",
      mip: typeof aw.mip === "string" ? aw.mip : "",
      smoy: typeof aw.smoy === "string" ? aw.smoy : "",
      coy: typeof aw.coy === "string" ? aw.coy : "",
      allNBA: {
        first: normalizeStringArr(allNBA.first),
        second: normalizeStringArr(allNBA.second),
        third: normalizeStringArr(allNBA.third),
      },
    },
  };
}

export async function readResultsState(): Promise<ResultsState> {
  try {
    const result = await get(RESULTS_BLOB_PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode === 304 || !result.stream) return emptyResultsState();
    const text = await streamToString(result.stream);
    if (!text.trim()) return emptyResultsState();
    return normalize(JSON.parse(text) as unknown);
  } catch (err) {
    if (err instanceof Error && err.name !== "BlobNotFoundError") {
      console.error("readResultsState error:", err);
    }
    return emptyResultsState();
  }
}

export async function writeResultsState(state: ResultsState): Promise<void> {
  await put(RESULTS_BLOB_PATHNAME, JSON.stringify(state), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 0,
  });
}

// ---------- Validation ----------
//
// Results validation is deliberately permissive: blank winner / 0 games means
// "not yet decided". When a winner is set, games (if non-zero) must be valid;
// when games is set, winner must also be set.

export type ResultsValidationResult =
  | { ok: true; state: ResultsState }
  | { ok: false; error: string };

function validateSeries(label: string, value: SeriesResult): string | null {
  const winner = value.winner.trim();
  const games = value.games;
  if (winner === "" && games === 0) return null;
  if (winner === "" && games !== 0) {
    return `${label}: winner is required when games is set`;
  }
  if (games !== 0 && !VALID_GAMES.includes(games as Games)) {
    return `${label}: games must be 0 (undecided), 4, 5, 6, or 7`;
  }
  return null;
}

export function validateResultsState(raw: unknown): ResultsValidationResult {
  const state = normalize(raw);
  for (const [id, s] of Object.entries(state.r1.series)) {
    const err = validateSeries(`r1.${id}`, s);
    if (err) return { ok: false, error: err };
  }
  for (const [id, s] of Object.entries(state.r2.series)) {
    const err = validateSeries(`r2.${id}`, s);
    if (err) return { ok: false, error: err };
  }
  for (const [id, s] of Object.entries(state.r3.series)) {
    const err = validateSeries(`r3.${id}`, s);
    if (err) return { ok: false, error: err };
  }
  for (const [id, s] of Object.entries(state.finals.series)) {
    const err = validateSeries(`finals.${id}`, s);
    if (err) return { ok: false, error: err };
  }
  return { ok: true, state };
}
