#!/usr/bin/env -S npx tsx
//
// Scaffold a new series-pick section across the entire codebase.
//
// Usage:
//   npx tsx .claude/skills/add-section/scripts/scaffold.ts \
//     --key <key> \
//     --label "<Label>" \
//     --conferenceSplit <true|false> \
//     [--east "<id1>,<id2>"] \   # required when conferenceSplit=true
//     [--west "<id1>,<id2>"] \
//     [--matchupId "<id>"] \      # required when conferenceSplit=false
//     [--yes]                     # skip confirm prompt
//
// See ../SKILL.md for full docs.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

// ----------------------------------------------------------------------------
// CLI + config
// ----------------------------------------------------------------------------

interface SectionConfig {
  key: string;       // lowercase identifier, e.g. "playin"
  pascal: string;    // PascalCase, e.g. "Playin"
  upper: string;     // UPPER_SNAKE, e.g. "PLAYIN"
  label: string;     // user-facing label, e.g. "Play-In"
  conferenceSplit: boolean;
  eastIds: string[]; // matchup IDs for East (when conferenceSplit)
  westIds: string[]; // matchup IDs for West (when conferenceSplit)
  singleId: string;  // matchup ID (when !conferenceSplit)
}

function parseArgs(argv: string[]): { config: SectionConfig; yes: boolean } {
  const args: Record<string, string> = {};
  let yes = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes") {
      yes = true;
      continue;
    }
    if (a.startsWith("--")) {
      const name = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        console.error(`Missing value for --${name}`);
        process.exit(2);
      }
      args[name] = next;
      i++;
    }
  }

  const key = args.key;
  if (!key || !/^[a-z][a-z0-9]*$/.test(key)) {
    console.error(`--key must be lowercase alphanumeric (e.g. "playin")`);
    process.exit(2);
  }
  if (["r1", "r2", "r3", "finals", "awards", "scores"].includes(key)) {
    console.error(`--key "${key}" collides with an existing section`);
    process.exit(2);
  }
  const label = args.label;
  if (!label) {
    console.error(`--label is required`);
    process.exit(2);
  }
  const conferenceSplit = args.conferenceSplit === "true";
  if (args.conferenceSplit !== "true" && args.conferenceSplit !== "false") {
    console.error(`--conferenceSplit must be "true" or "false"`);
    process.exit(2);
  }

  let eastIds: string[] = [];
  let westIds: string[] = [];
  let singleId = "";

  if (conferenceSplit) {
    eastIds = (args.east ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    westIds = (args.west ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (eastIds.length === 0 || westIds.length === 0) {
      console.error(`--east and --west required when conferenceSplit=true`);
      process.exit(2);
    }
  } else {
    singleId = (args.matchupId ?? "").trim();
    if (!singleId) {
      console.error(`--matchupId required when conferenceSplit=false`);
      process.exit(2);
    }
  }

  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  const upper = key.toUpperCase();
  return {
    yes,
    config: { key, pascal, upper, label, conferenceSplit, eastIds, westIds, singleId },
  };
}

// ----------------------------------------------------------------------------
// Templates (placeholders: {{KEY}}, {{Key}}, {{UPPER}}, {{LABEL}})
// ----------------------------------------------------------------------------

function fill(tpl: string, c: SectionConfig): string {
  return tpl
    .replaceAll("{{KEY}}", c.key)
    .replaceAll("{{Key}}", c.pascal)
    .replaceAll("{{UPPER}}", c.upper)
    .replaceAll("{{LABEL}}", c.label);
}

const LIB_TPL_CONF = `import {
  type BracketConfig,
  type {{Key}}Matchup,
  get{{Key}}Matchups,
  is{{Key}}Complete,
} from "./bracket";
import { VALID_GAMES, type Games } from "./picks";

export interface {{Key}}Pick {
  matchupId: string;
  winner: string;
  games: Games;
}

export interface {{Key}}Submission {
  timestamp: string;
  name: string;
  picks: {{Key}}Pick[];
}

// ---------- Line format ----------

function sanitizeName(name: string): string {
  return name.replace(/[|\\n\\r,]/g, " ").trim();
}

function sanitizeTeam(team: string): string {
  return team.replace(/[|\\n\\r,:]/g, " ").trim();
}

export function format{{Key}}Line(submission: {{Key}}Submission): string {
  const picksStr = submission.picks
    .map((p) => \`\${p.matchupId}:\${sanitizeTeam(p.winner)}-\${p.games}\`)
    .join(",");
  return \`\${submission.timestamp} | \${sanitizeName(submission.name)} | \${picksStr}\`;
}

export function parse{{Key}}Line(line: string): {{Key}}Submission | null {
  const parts = line.split(" | ");
  if (parts.length < 3) return null;
  const [timestamp, name, picksStr] = parts;
  const picks: {{Key}}Pick[] = [];
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

export function parse{{Key}}File(contents: string): {{Key}}Submission[] {
  return contents
    .split("\\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parse{{Key}}Line)
    .filter((s): s is {{Key}}Submission => s !== null);
}

// ---------- Validation ----------

export type {{Key}}ValidationResult =
  | { ok: true; picks: {{Key}}Pick[] }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 50;

interface {{Key}}SubmitBody {
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

export function validate{{Key}}Submission(
  body: {{Key}}SubmitBody,
  config: BracketConfig
): {{Key}}ValidationResult {
  if (!is{{Key}}Complete(config)) {
    return { ok: false, error: "{{LABEL}} bracket is not yet configured" };
  }

  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  if (nameRaw.length === 0) return { ok: false, error: "Name is required" };
  if (nameRaw.length > MAX_NAME_LENGTH) {
    return { ok: false, error: \`Name must be \${MAX_NAME_LENGTH} characters or fewer\` };
  }

  const matchups = get{{Key}}Matchups(config);
  if (!Array.isArray(body.picks)) {
    return { ok: false, error: "picks must be an array" };
  }
  if (body.picks.length !== matchups.length) {
    return { ok: false, error: \`Expected \${matchups.length} picks, got \${body.picks.length}\` };
  }

  const matchupById = new Map<string, {{Key}}Matchup>(matchups.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const picks: {{Key}}Pick[] = [];

  for (const raw of body.picks) {
    if (!isPickShape(raw)) {
      return { ok: false, error: "Each pick must have matchupId, winner, games" };
    }
    const m = matchupById.get(raw.matchupId);
    if (!m) return { ok: false, error: \`Unknown matchupId: \${raw.matchupId}\` };
    if (seen.has(raw.matchupId)) {
      return { ok: false, error: \`Duplicate matchupId: \${raw.matchupId}\` };
    }
    seen.add(raw.matchupId);

    const allowed = [m.teamA, m.teamB];
    if (!allowed.includes(raw.winner)) {
      return { ok: false, error: \`Winner for \${raw.matchupId} must be one of: \${allowed.join(", ")}\` };
    }
    if (!VALID_GAMES.includes(raw.games as Games)) {
      return { ok: false, error: \`Games for \${raw.matchupId} must be 4, 5, 6, or 7\` };
    }
    picks.push({ matchupId: raw.matchupId, winner: raw.winner, games: raw.games as Games });
  }

  const ordered = matchups.map((m) => picks.find((p) => p.matchupId === m.id)!);
  return { ok: true, picks: ordered };
}
`;

// Single-matchup variant differs only in helper names: get{{Key}}Matchups / is{{Key}}Complete
// are the same shape, so the LIB template is actually identical for both variants.
// Only bracket.ts types and bracket.json shape diverge.

const ROUTE_TPL = `import { NextRequest, NextResponse } from "next/server";
import bracket from "@/bracket.json";
import { appendSubmissionLine, {{UPPER}}_BLOB_PATHNAME } from "@/lib/picks";
import { format{{Key}}Line, validate{{Key}}Submission } from "@/lib/{{KEY}}";
import { readLockState } from "@/lib/lock";
import type { BracketConfig } from "@/lib/bracket";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const lockState = await readLockState();
  if (lockState.{{KEY}}) {
    return NextResponse.json(
      { ok: false, error: "{{LABEL}} picks are locked" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validate{{Key}}Submission(
    body as Record<string, unknown>,
    bracket as BracketConfig
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const name = ((body as { name?: unknown }).name as string).trim();
  const timestamp = new Date().toISOString();
  const line = format{{Key}}Line({ timestamp, name, picks: result.picks });

  try {
    await appendSubmissionLine(line, {{UPPER}}_BLOB_PATHNAME);
  } catch (err) {
    const detail = err instanceof Error ? \`\${err.name}: \${err.message}\` : String(err);
    console.error("Failed to append {{LABEL}} picks line:", err);
    return NextResponse.json(
      { ok: false, error: \`Failed to save picks — \${detail}\` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, line });
}
`;

const FORM_TPL_CONF = `"use client";

import { useMemo, useState } from "react";
import type { {{Key}}Matchup } from "@/lib/bracket";

interface PickState {
  winner?: string;
  games?: number;
}

type PicksMap = Record<string, PickState>;

const GAMES_OPTIONS = [4, 5, 6, 7];

export default function {{Key}}Form({
  name,
  matchups,
}: {
  name: string;
  matchups: {{Key}}Matchup[];
}) {
  const [picks, setPicks] = useState<PicksMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const east = useMemo(() => matchups.filter((m) => m.conference === "East"), [matchups]);
  const west = useMemo(() => matchups.filter((m) => m.conference === "West"), [matchups]);

  const allReady = useMemo(
    () => matchups.length > 0 && matchups.every((m) => m.teamA.length > 0 && m.teamB.length > 0),
    [matchups]
  );

  function setPick(id: string, patch: Partial<PickState>) {
    setPicks((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
    setSuccess(false);
    setError(null);
  }

  function findMissing(): string | null {
    if (matchups.length === 0) return "{{LABEL}} is not yet configured";
    if (!allReady) return "{{LABEL}} bracket is not fully configured yet";
    if (!name.trim()) return "Please enter your name";
    for (const m of matchups) {
      const p = picks[m.id];
      if (!p?.winner) return \`Pick a winner for \${m.id} (\${m.teamA} vs \${m.teamB})\`;
      if (typeof p.games !== "number") return \`Pick the series length for \${m.id}\`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = findMissing();
    if (missing) {
      setError(missing);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const body = {
      name: name.trim(),
      picks: matchups.map((m) => ({
        matchupId: m.id,
        winner: picks[m.id].winner,
        games: picks[m.id].games,
      })),
    };

    try {
      const res = await fetch("/api/submit/{{KEY}}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Submission failed");
      } else {
        setSuccess(true);
        setPicks({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {matchups.length === 0 && (
        <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
          {{LABEL}} hasn&apos;t been configured yet.
        </div>
      )}

      {matchups.length > 0 && !allReady && (
        <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
          {{LABEL}} matchups aren&apos;t fully filled in yet.
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Column title="Eastern Conference" matchups={east} picks={picks} setPick={setPick} />
        <Column title="Western Conference" matchups={west} picks={picks} setPick={setPick} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting || !allReady}
          className="rounded bg-black text-white px-5 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit {{LABEL}} picks"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-green-700 dark:text-green-400">{{LABEL}} picks saved!</p>
        )}
      </div>
    </form>
  );
}

function Column({
  title,
  matchups,
  picks,
  setPick,
}: {
  title: string;
  matchups: {{Key}}Matchup[];
  picks: PicksMap;
  setPick: (id: string, patch: Partial<PickState>) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>

      {matchups.length === 0 ? (
        <p className="text-sm italic text-gray-500">No matchups configured.</p>
      ) : (
        <ul className="space-y-3">
          {matchups.map((m) => (
            <MatchupCard
              key={m.id}
              matchup={m}
              pick={picks[m.id]}
              onChange={(patch) => setPick(m.id, patch)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MatchupCard({
  matchup,
  pick,
  onChange,
}: {
  matchup: {{Key}}Matchup;
  pick: PickState | undefined;
  onChange: (patch: Partial<PickState>) => void;
}) {
  const ready = matchup.teamA.length > 0 && matchup.teamB.length > 0;

  return (
    <li className="rounded border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-xs font-mono text-gray-500 mb-2">{matchup.id}</p>
      {!ready ? (
        <p className="text-sm italic text-gray-500">TBD — teams not yet set in bracket.json</p>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {[matchup.teamA, matchup.teamB].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={matchup.id}
                  value={t}
                  checked={pick?.winner === t}
                  onChange={() => onChange({ winner: t })}
                />
                <span>{t}</span>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">in</span>
            <select
              value={pick?.games ?? ""}
              onChange={(e) => onChange({ games: Number(e.target.value) })}
              className="rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
            >
              <option value="" disabled>
                —
              </option>
              {GAMES_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g} games
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </li>
  );
}
`;

const FORM_TPL_SINGLE = `"use client";

import { useMemo, useState } from "react";
import type { {{Key}}Matchup } from "@/lib/bracket";

interface PickState {
  winner?: string;
  games?: number;
}

type PicksMap = Record<string, PickState>;

const GAMES_OPTIONS = [4, 5, 6, 7];

export default function {{Key}}Form({
  name,
  matchups,
}: {
  name: string;
  matchups: {{Key}}Matchup[];
}) {
  const [picks, setPicks] = useState<PicksMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const allReady = useMemo(
    () => matchups.length > 0 && matchups.every((m) => m.teamA.length > 0 && m.teamB.length > 0),
    [matchups]
  );

  function setPick(id: string, patch: Partial<PickState>) {
    setPicks((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
    setSuccess(false);
    setError(null);
  }

  function findMissing(): string | null {
    if (matchups.length === 0) return "{{LABEL}} is not yet configured";
    if (!allReady) return "{{LABEL}} bracket is not fully configured yet";
    if (!name.trim()) return "Please enter your name";
    for (const m of matchups) {
      const p = picks[m.id];
      if (!p?.winner) return \`Pick a winner for \${m.id} (\${m.teamA} vs \${m.teamB})\`;
      if (typeof p.games !== "number") return \`Pick the series length for \${m.id}\`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = findMissing();
    if (missing) {
      setError(missing);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const body = {
      name: name.trim(),
      picks: matchups.map((m) => ({
        matchupId: m.id,
        winner: picks[m.id].winner,
        games: picks[m.id].games,
      })),
    };

    try {
      const res = await fetch("/api/submit/{{KEY}}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Submission failed");
      } else {
        setSuccess(true);
        setPicks({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {matchups.length === 0 && (
        <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
          {{LABEL}} hasn&apos;t been configured yet.
        </div>
      )}

      {matchups.length > 0 && !allReady && (
        <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
          {{LABEL}} matchup isn&apos;t fully filled in yet.
        </div>
      )}

      <section className="space-y-4 max-w-md">
        <h2 className="text-base font-semibold">{{LABEL}}</h2>

        {matchups.length === 0 ? (
          <p className="text-sm italic text-gray-500">No matchup configured.</p>
        ) : (
          <ul className="space-y-3">
            {matchups.map((m) => (
              <MatchupCard
                key={m.id}
                matchup={m}
                pick={picks[m.id]}
                onChange={(patch) => setPick(m.id, patch)}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting || !allReady}
          className="rounded bg-black text-white px-5 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit {{LABEL}} pick"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-green-700 dark:text-green-400">{{LABEL}} pick saved!</p>
        )}
      </div>
    </form>
  );
}

function MatchupCard({
  matchup,
  pick,
  onChange,
}: {
  matchup: {{Key}}Matchup;
  pick: PickState | undefined;
  onChange: (patch: Partial<PickState>) => void;
}) {
  const ready = matchup.teamA.length > 0 && matchup.teamB.length > 0;

  return (
    <li className="rounded border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-xs font-mono text-gray-500 mb-2">{matchup.id}</p>
      {!ready ? (
        <p className="text-sm italic text-gray-500">TBD — teams not yet set in bracket.json</p>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {[matchup.teamA, matchup.teamB].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={matchup.id}
                  value={t}
                  checked={pick?.winner === t}
                  onChange={() => onChange({ winner: t })}
                />
                <span>{t}</span>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">in</span>
            <select
              value={pick?.games ?? ""}
              onChange={(e) => onChange({ games: Number(e.target.value) })}
              className="rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
            >
              <option value="" disabled>
                —
              </option>
              {GAMES_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g} games
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </li>
  );
}
`;

const TEST_TPL = `import { describe, it, expect } from "vitest";
import {
  format{{Key}}Line,
  parse{{Key}}Line,
  parse{{Key}}File,
  validate{{Key}}Submission,
  type {{Key}}Submission,
  type {{Key}}Pick,
} from "./{{KEY}}";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-01-01T00:00:00Z";

// NOTE: this test scaffold uses a minimal config skeleton. After running the
// scaffolder, you may need to fill in the bracket teams to make every test
// meaningful — but the round-trip / format / validate basics already work.
function fullConfig(): BracketConfig {
  return JSON.parse(JSON.stringify({{CONFIG_JSON}}));
}

function validPicks(): {{Key}}Pick[] {
  return [{{VALID_PICKS}}];
}

function validBody(overrides: Record<string, unknown> = {}) {
  return { name: "Sunny", picks: validPicks(), ...overrides };
}

describe("format{{Key}}Line & parse{{Key}}Line", () => {
  it("round-trips a basic submission", () => {
    const submission: {{Key}}Submission = {
      timestamp: TIMESTAMP,
      name: "Sunny",
      picks: validPicks(),
    };
    const line = format{{Key}}Line(submission);
    expect(line.startsWith(\`\${TIMESTAMP} | Sunny | \`)).toBe(true);
    expect(line.split(" | ")).toHaveLength(3);
    expect(parse{{Key}}Line(line)).toEqual(submission);
  });

  it("sanitizes pipes in the name", () => {
    const line = format{{Key}}Line({
      timestamp: TIMESTAMP,
      name: "Su|nny",
      picks: validPicks(),
    });
    expect(line).toContain("Su nny");
    expect(line.split(" | ")).toHaveLength(3);
  });

  it("returns null for malformed lines", () => {
    expect(parse{{Key}}Line("bad")).toBeNull();
  });
});

describe("parse{{Key}}File", () => {
  it("parses multiple lines and skips blanks", () => {
    const a = format{{Key}}Line({ timestamp: TIMESTAMP, name: "A", picks: validPicks() });
    const b = format{{Key}}Line({ timestamp: TIMESTAMP, name: "B", picks: validPicks() });
    const parsed = parse{{Key}}File(\`\${a}\\n\\n\${b}\\n\`);
    expect(parsed).toHaveLength(2);
  });
});

describe("validate{{Key}}Submission", () => {
  it("accepts a valid submission", () => {
    const result = validate{{Key}}Submission(validBody(), fullConfig());
    expect(result.ok).toBe(true);
  });

  it("rejects empty name", () => {
    const result = validate{{Key}}Submission(validBody({ name: "   " }), fullConfig());
    expect(result.ok).toBe(false);
  });

  it("rejects non-array picks", () => {
    const result = validate{{Key}}Submission(validBody({ picks: "nope" }), fullConfig());
    expect(result.ok).toBe(false);
  });
});
`;

// ----------------------------------------------------------------------------
// Plan + transforms
// ----------------------------------------------------------------------------

interface Op {
  description: string;
  path: string;
  apply: (cwd: string) => void;
}

function planCreateFile(path: string, content: string, description: string): Op {
  return {
    description,
    path,
    apply: (cwd) => {
      const abs = resolve(cwd, path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    },
  };
}

function planEditFile(
  path: string,
  description: string,
  transform: (content: string) => string
): Op {
  return {
    description,
    path,
    apply: (cwd) => {
      const abs = resolve(cwd, path);
      const before = readFileSync(abs, "utf8");
      const after = transform(before);
      if (before === after) {
        throw new Error(`No change applied to ${path} (anchor not found?)`);
      }
      writeFileSync(abs, after);
    },
  };
}

function requireReplace(content: string, find: string, replacement: string, file: string): string {
  if (!content.includes(find)) {
    throw new Error(`Anchor not found in ${file}: ${JSON.stringify(find.slice(0, 80))}…`);
  }
  return content.replace(find, replacement);
}

// ---- Per-file transforms ----

function buildBracketJsonEdit(c: SectionConfig): string {
  const block = c.conferenceSplit
    ? `,\n  "${c.key}": {\n    "east": [\n${c.eastIds.map((id) => `      { "id": "${id}", "teamA": "", "teamB": "" }`).join(",\n")}\n    ],\n    "west": [\n${c.westIds.map((id) => `      { "id": "${id}", "teamA": "", "teamB": "" }`).join(",\n")}\n    ]\n  }`
    : `,\n  "${c.key}": { "id": "${c.singleId}", "teamA": "", "teamB": "" }`;

  return block;
}

function transformBracketJson(content: string, c: SectionConfig): string {
  // Insert before the final closing brace of the top-level object.
  // Strategy: replace `\n}\n` at end-of-file.
  const trailing = "\n}\n";
  if (!content.endsWith(trailing)) {
    throw new Error("bracket.json does not end with `\\n}\\n` — manual review needed");
  }
  const head = content.slice(0, content.length - trailing.length);
  return head + buildBracketJsonEdit(c) + "\n}\n";
}

function transformLibBracketTs(content: string, c: SectionConfig): string {
  const conf = c.conferenceSplit;
  const interfaces = conf
    ? `
// ${c.label} — generated by add-section skill.
export interface ${c.pascal}Config {
  east: ${c.pascal}MatchupConfig[];
  west: ${c.pascal}MatchupConfig[];
}

export interface ${c.pascal}MatchupConfig {
  id: string;
  teamA: string;
  teamB: string;
}

export interface ${c.pascal}Matchup {
  id: string;
  conference: Conference;
  teamA: string;
  teamB: string;
}
`
    : `
// ${c.label} — generated by add-section skill.
export interface ${c.pascal}Config {
  id: string;
  teamA: string;
  teamB: string;
}

export interface ${c.pascal}Matchup {
  id: string;
  teamA: string;
  teamB: string;
}
`;

  const helpers = conf
    ? `
export function get${c.pascal}Matchups(config: BracketConfig): ${c.pascal}Matchup[] {
  const r = config.${c.key};
  if (!r) return [];
  const east: ${c.pascal}Matchup[] = r.east.map((m) => ({
    id: m.id,
    conference: "East" as Conference,
    teamA: m.teamA,
    teamB: m.teamB,
  }));
  const west: ${c.pascal}Matchup[] = r.west.map((m) => ({
    id: m.id,
    conference: "West" as Conference,
    teamA: m.teamA,
    teamB: m.teamB,
  }));
  return [...east, ...west];
}

export function is${c.pascal}Complete(config: BracketConfig): boolean {
  const ms = get${c.pascal}Matchups(config);
  if (ms.length === 0) return false;
  return ms.every((m) => m.teamA.length > 0 && m.teamB.length > 0);
}

export function get${c.pascal}MatchupById(
  config: BracketConfig,
  id: string
): ${c.pascal}Matchup | undefined {
  return get${c.pascal}Matchups(config).find((m) => m.id === id);
}
`
    : `
export function get${c.pascal}Matchups(config: BracketConfig): ${c.pascal}Matchup[] {
  const f = config.${c.key};
  if (!f) return [];
  return [{ id: f.id, teamA: f.teamA, teamB: f.teamB }];
}

export function is${c.pascal}Complete(config: BracketConfig): boolean {
  const ms = get${c.pascal}Matchups(config);
  if (ms.length === 0) return false;
  return ms.every((m) => m.teamA.length > 0 && m.teamB.length > 0);
}

export function get${c.pascal}MatchupById(
  config: BracketConfig,
  id: string
): ${c.pascal}Matchup | undefined {
  return get${c.pascal}Matchups(config).find((m) => m.id === id);
}
`;

  // 1. Add `<key>?: <Key>Config` to BracketConfig — insert before closing brace of BracketConfig.
  content = requireReplace(
    content,
    "  finals?: FinalsConfig;\n}",
    `  finals?: FinalsConfig;\n  ${c.key}?: ${c.pascal}Config;\n}`,
    "lib/bracket.ts"
  );

  // 2. Append interfaces + helpers at the end of the file.
  return content.trimEnd() + "\n" + interfaces + helpers;
}

function transformLibPicksTs(content: string, c: SectionConfig): string {
  return requireReplace(
    content,
    `export const FINALS_BLOB_PATHNAME = "picks-finals.txt";\n`,
    `export const FINALS_BLOB_PATHNAME = "picks-finals.txt";\nexport const ${c.upper}_BLOB_PATHNAME = "picks-${c.key}.txt";\n`,
    "lib/picks.ts"
  );
}

function transformLibLockTs(content: string, c: SectionConfig): string {
  // 1. LockKind union: insert `| "<key>" ` before `| "awards";`
  content = requireReplace(
    content,
    `export type LockKind = "r1" | "r2" | "r3" | "finals" | "awards";`,
    `export type LockKind = "r1" | "r2" | "r3" | "finals" | "${c.key}" | "awards";`,
    "lib/lock.ts"
  );

  // 2. LOCK_KINDS array
  content = requireReplace(
    content,
    `export const LOCK_KINDS: LockKind[] = ["r1", "r2", "r3", "finals", "awards"];`,
    `export const LOCK_KINDS: LockKind[] = ["r1", "r2", "r3", "finals", "${c.key}", "awards"];`,
    "lib/lock.ts"
  );

  // 3. LockState fields
  content = requireReplace(
    content,
    `  finals: boolean;\n  awards: boolean;\n}`,
    `  finals: boolean;\n  ${c.key}: boolean;\n  awards: boolean;\n}`,
    "lib/lock.ts"
  );

  // 4. DEFAULT_STATE
  content = requireReplace(
    content,
    `  finals: false,\n  awards: false,\n};`,
    `  finals: false,\n  ${c.key}: false,\n  awards: false,\n};`,
    "lib/lock.ts"
  );

  // 5. normalize hasPerKind check
  content = requireReplace(
    content,
    `    "finals" in obj ||\n    "awards" in obj;`,
    `    "finals" in obj ||\n    "${c.key}" in obj ||\n    "awards" in obj;`,
    "lib/lock.ts"
  );

  // 6. normalize return object (per-kind branch)
  content = requireReplace(
    content,
    `      finals: Boolean(obj.finals),\n      awards: Boolean(obj.awards),\n    };`,
    `      finals: Boolean(obj.finals),\n      ${c.key}: Boolean(obj.${c.key}),\n      awards: Boolean(obj.awards),\n    };`,
    "lib/lock.ts"
  );

  // 7. normalize return object (legacy locked branch)
  content = requireReplace(
    content,
    `      finals: false,\n      awards: false,\n    };`,
    `      finals: false,\n      ${c.key}: false,\n      awards: false,\n    };`,
    "lib/lock.ts"
  );

  // 8. isLockKind
  content = requireReplace(
    content,
    `    value === "finals" ||\n    value === "awards"`,
    `    value === "finals" ||\n    value === "${c.key}" ||\n    value === "awards"`,
    "lib/lock.ts"
  );

  return content;
}

function transformLibResultsTs(content: string, c: SectionConfig): string {
  // 1. Extend ResultsState interface — add slice before awards
  content = requireReplace(
    content,
    `  finals: {\n    series: Record<string, SeriesResult>;\n  };\n  awards: AwardsResults;\n}`,
    `  finals: {\n    series: Record<string, SeriesResult>;\n  };\n  ${c.key}: {\n    series: Record<string, SeriesResult>;\n  };\n  awards: AwardsResults;\n}`,
    "lib/results.ts"
  );

  // 2. emptyResultsState
  content = requireReplace(
    content,
    `    finals: {\n      series: {},\n    },\n    awards: {`,
    `    finals: {\n      series: {},\n    },\n    ${c.key}: {\n      series: {},\n    },\n    awards: {`,
    "lib/results.ts"
  );

  // 3. normalize() — declare variable
  content = requireReplace(
    content,
    `  const finals = (root.finals as Record<string, unknown> | undefined) ?? {};`,
    `  const finals = (root.finals as Record<string, unknown> | undefined) ?? {};\n  const ${c.key} = (root.${c.key} as Record<string, unknown> | undefined) ?? {};`,
    "lib/results.ts"
  );

  // 4. normalize() — return object slice
  content = requireReplace(
    content,
    `    finals: {\n      series: normalizeSeriesMap(finals.series),\n    },\n    awards: {`,
    `    finals: {\n      series: normalizeSeriesMap(finals.series),\n    },\n    ${c.key}: {\n      series: normalizeSeriesMap(${c.key}.series),\n    },\n    awards: {`,
    "lib/results.ts"
  );

  // 5. validateResultsState loop
  content = requireReplace(
    content,
    `  for (const [id, s] of Object.entries(state.finals.series)) {\n    const err = validateSeries(\`finals.\${id}\`, s);\n    if (err) return { ok: false, error: err };\n  }\n  return { ok: true, state };\n}`,
    `  for (const [id, s] of Object.entries(state.finals.series)) {\n    const err = validateSeries(\`finals.\${id}\`, s);\n    if (err) return { ok: false, error: err };\n  }\n  for (const [id, s] of Object.entries(state.${c.key}.series)) {\n    const err = validateSeries(\`${c.key}.\${id}\`, s);\n    if (err) return { ok: false, error: err };\n  }\n  return { ok: true, state };\n}`,
    "lib/results.ts"
  );

  return content;
}

function transformLibScoringTs(content: string, c: SectionConfig): string {
  // 1. Import the submission type
  content = requireReplace(
    content,
    `import type { FinalsSubmission } from "./finals";`,
    `import type { FinalsSubmission } from "./finals";\nimport type { ${c.pascal}Submission } from "./${c.key}";`,
    "lib/scoring.ts"
  );

  // 2. ScoreBreakdown
  content = requireReplace(
    content,
    `  finalsSeries: number;\n  awardsSingle: number;`,
    `  finalsSeries: number;\n  ${c.key}Series: number;\n  awardsSingle: number;`,
    "lib/scoring.ts"
  );

  // 3. Add score<Key> function (after scoreFinals)
  const scoreFn = `\nexport function score${c.pascal}(\n  submission: ${c.pascal}Submission,\n  results: ResultsState\n): number {\n  let series = 0;\n  for (const p of submission.picks) {\n    series += scoreSeries(p.winner, p.games, results.${c.key}.series[p.matchupId]);\n  }\n  return series;\n}\n`;
  content = requireReplace(
    content,
    `  return series;\n}\n\nfunction scoreSingleAward(`,
    `  return series;\n}\n${scoreFn}\nfunction scoreSingleAward(`,
    "lib/scoring.ts"
  );

  // 4. buildLeaderboard input type
  content = requireReplace(
    content,
    `  finals: FinalsSubmission[];\n  awards: AwardsSubmission[];`,
    `  finals: FinalsSubmission[];\n  ${c.key}: ${c.pascal}Submission[];\n  awards: AwardsSubmission[];`,
    "lib/scoring.ts"
  );

  // 5. buildLeaderboard destructure
  content = requireReplace(
    content,
    `  const { r1, r2, r3, finals, awards, results } = input;`,
    `  const { r1, r2, r3, finals, ${c.key}, awards, results } = input;`,
    "lib/scoring.ts"
  );

  // 6. lastBy maps
  content = requireReplace(
    content,
    `  const finalsByName = lastBy(finals);\n  const awardsByName = lastBy(awards);`,
    `  const finalsByName = lastBy(finals);\n  const ${c.key}ByName = lastBy(${c.key});\n  const awardsByName = lastBy(awards);`,
    "lib/scoring.ts"
  );

  // 7. allNames
  content = requireReplace(
    content,
    `    ...finalsByName.keys(),\n    ...awardsByName.keys(),`,
    `    ...finalsByName.keys(),\n    ...${c.key}ByName.keys(),\n    ...awardsByName.keys(),`,
    "lib/scoring.ts"
  );

  // 8. inner loop: get submission, score, breakdown, total
  content = requireReplace(
    content,
    `    const fs = finalsByName.get(name);\n    const aws = awardsByName.get(name);`,
    `    const fs = finalsByName.get(name);\n    const ${c.key}s = ${c.key}ByName.get(name);\n    const aws = awardsByName.get(name);`,
    "lib/scoring.ts"
  );

  content = requireReplace(
    content,
    `    const finalsScore = fs ? scoreFinals(fs, results) : 0;\n    const awScore = aws`,
    `    const finalsScore = fs ? scoreFinals(fs, results) : 0;\n    const ${c.key}Score = ${c.key}s ? score${c.pascal}(${c.key}s, results) : 0;\n    const awScore = aws`,
    "lib/scoring.ts"
  );

  content = requireReplace(
    content,
    `      finalsSeries: finalsScore,\n      awardsSingle: awScore.single,`,
    `      finalsSeries: finalsScore,\n      ${c.key}Series: ${c.key}Score,\n      awardsSingle: awScore.single,`,
    "lib/scoring.ts"
  );

  content = requireReplace(
    content,
    `        finalsScore +\n        awScore.single +`,
    `        finalsScore +\n        ${c.key}Score +\n        awScore.single +`,
    "lib/scoring.ts"
  );

  return content;
}

function transformLibScoringTestTs(content: string, c: SectionConfig): string {
  // 1. Update buildLeaderboard call sites — add `${key}: [],` before `awards: []` or before `awards: [aw(...)`.
  // There are multiple call sites; replace all `r3: [r3(...)],\n      awards:` with `r3: ..., ${key}: [], awards:` style.
  // Easiest: find every "awards: [aw" or "awards: []" pattern in buildLeaderboard call sites and prepend.

  // Match `      awards: ` (with indentation) — replace with `      <key>: [],\n      awards: `
  const pattern = `      awards:`;
  const replacement = `      ${c.key}: [],\n      awards:`;

  // Use replaceAll
  if (!content.includes(pattern)) {
    throw new Error(`Could not find "${pattern}" in lib/scoring.test.ts`);
  }
  content = content.split(pattern).join(replacement);

  return content;
}

function transformAppPageTsx(content: string, c: SectionConfig): string {
  // 1. import getFinalsMatchups → add get<Key>Matchups
  content = requireReplace(
    content,
    `  getFinalsMatchups,`,
    `  getFinalsMatchups,\n  get${c.pascal}Matchups,`,
    "app/page.tsx"
  );

  // 2. import FINALS_BLOB_PATHNAME → add <UPPER>_BLOB_PATHNAME
  content = requireReplace(
    content,
    `  FINALS_BLOB_PATHNAME,`,
    `  FINALS_BLOB_PATHNAME,\n  ${c.upper}_BLOB_PATHNAME,`,
    "app/page.tsx"
  );

  // 3. import parseFinalsFile → add parse<Key>File
  content = requireReplace(
    content,
    `import { parseFinalsFile } from "@/lib/finals";`,
    `import { parseFinalsFile } from "@/lib/finals";\nimport { parse${c.pascal}File } from "@/lib/${c.key}";`,
    "app/page.tsx"
  );

  // 4. matchups variable
  content = requireReplace(
    content,
    `  const finalsMatchups = getFinalsMatchups(bracket);`,
    `  const finalsMatchups = getFinalsMatchups(bracket);\n  const ${c.key}Matchups = get${c.pascal}Matchups(bracket);`,
    "app/page.tsx"
  );

  // 5. destructure
  content = requireReplace(
    content,
    `  const [locks, r1Raw, r2Raw, r3Raw, finalsRaw, awardsRaw, results] = await Promise.all([`,
    `  const [locks, r1Raw, r2Raw, r3Raw, finalsRaw, ${c.key}Raw, awardsRaw, results] = await Promise.all([`,
    "app/page.tsx"
  );

  // 6. readPicksRaw entry — insert before readAwardsRaw
  content = requireReplace(
    content,
    `    readPicksRaw(FINALS_BLOB_PATHNAME).catch(() => ""),\n    readAwardsRaw().catch(() => ""),`,
    `    readPicksRaw(FINALS_BLOB_PATHNAME).catch(() => ""),\n    readPicksRaw(${c.upper}_BLOB_PATHNAME).catch(() => ""),\n    readAwardsRaw().catch(() => ""),`,
    "app/page.tsx"
  );

  // 7. parse submissions
  content = requireReplace(
    content,
    `  const finalsSubmissions = parseFinalsFile(finalsRaw);`,
    `  const finalsSubmissions = parseFinalsFile(finalsRaw);\n  const ${c.key}Submissions = parse${c.pascal}File(${c.key}Raw);`,
    "app/page.tsx"
  );

  // 8. buildLeaderboard input
  content = requireReplace(
    content,
    `    finals: finalsSubmissions,\n    awards: awardsSubmissions,`,
    `    finals: finalsSubmissions,\n    ${c.key}: ${c.key}Submissions,\n    awards: awardsSubmissions,`,
    "app/page.tsx"
  );

  // 9. PicksTabs prop — finalsMatchups
  content = requireReplace(
    content,
    `        finalsMatchups={finalsMatchups}`,
    `        finalsMatchups={finalsMatchups}\n        ${c.key}Matchups={${c.key}Matchups}`,
    "app/page.tsx"
  );

  // 10. PicksTabs prop — submissions
  content = requireReplace(
    content,
    `        finalsSubmissions={finalsSubmissions}\n        awardsSubmissions={awardsSubmissions}`,
    `        finalsSubmissions={finalsSubmissions}\n        ${c.key}Submissions={${c.key}Submissions}\n        awardsSubmissions={awardsSubmissions}`,
    "app/page.tsx"
  );

  return content;
}

function transformAppPicksTabsTsx(content: string, c: SectionConfig): string {
  // 1. Import matchup type
  content = requireReplace(
    content,
    `  FinalsMatchup,\n  Matchup,`,
    `  FinalsMatchup,\n  ${c.pascal}Matchup,\n  Matchup,`,
    "app/PicksTabs.tsx"
  );

  // 2. Import submission type
  content = requireReplace(
    content,
    `import type { FinalsSubmission } from "@/lib/finals";`,
    `import type { FinalsSubmission } from "@/lib/finals";\nimport type { ${c.pascal}Submission } from "@/lib/${c.key}";`,
    "app/PicksTabs.tsx"
  );

  // 3. Import form
  content = requireReplace(
    content,
    `import FinalsForm from "./FinalsForm";`,
    `import FinalsForm from "./FinalsForm";\nimport ${c.pascal}Form from "./${c.pascal}Form";`,
    "app/PicksTabs.tsx"
  );

  // 4. Import LockedListView
  content = requireReplace(
    content,
    `  LockedFinalsListView,\n  LockedAwardsListView,`,
    `  LockedFinalsListView,\n  Locked${c.pascal}ListView,\n  LockedAwardsListView,`,
    "app/PicksTabs.tsx"
  );

  // 5. TabKey union
  content = requireReplace(
    content,
    `type TabKey = "r1" | "r2" | "r3" | "finals" | "awards" | "scores";`,
    `type TabKey = "r1" | "r2" | "r3" | "finals" | "${c.key}" | "awards" | "scores";`,
    "app/PicksTabs.tsx"
  );

  // 6. TABS array — insert after the awards entry. Robust to user reordering
  // (the user has been seen to put awards mid-list, not always last).
  content = requireReplace(
    content,
    `  { key: "awards", label: "Awards" },\n`,
    `  { key: "awards", label: "Awards" },\n  { key: "${c.key}", label: "${c.label}" },\n`,
    "app/PicksTabs.tsx"
  );

  // 7. Function param — matchups
  content = requireReplace(
    content,
    `  finalsMatchups,\n  eastTeams,`,
    `  finalsMatchups,\n  ${c.key}Matchups,\n  eastTeams,`,
    "app/PicksTabs.tsx"
  );

  // 8. Function param — submissions
  content = requireReplace(
    content,
    `  finalsSubmissions,\n  awardsSubmissions,`,
    `  finalsSubmissions,\n  ${c.key}Submissions,\n  awardsSubmissions,`,
    "app/PicksTabs.tsx"
  );

  // 9. Type — matchups
  content = requireReplace(
    content,
    `  finalsMatchups: FinalsMatchup[];\n  eastTeams: Team[];`,
    `  finalsMatchups: FinalsMatchup[];\n  ${c.key}Matchups: ${c.pascal}Matchup[];\n  eastTeams: Team[];`,
    "app/PicksTabs.tsx"
  );

  // 10. Type — submissions
  content = requireReplace(
    content,
    `  finalsSubmissions: FinalsSubmission[];\n  awardsSubmissions: AwardsSubmission[];`,
    `  finalsSubmissions: FinalsSubmission[];\n  ${c.key}Submissions: ${c.pascal}Submission[];\n  awardsSubmissions: AwardsSubmission[];`,
    "app/PicksTabs.tsx"
  );

  // 11. Locked branch — insert before LockedAwardsListView
  const lockedBranch = `          ) : active === "${c.key}" ? (\n            <Locked${c.pascal}ListView\n              submissions={${c.key}Submissions}\n              ${c.key}Results={results.${c.key}}\n            />\n          `;
  content = requireReplace(
    content,
    `          ) : (\n            <LockedAwardsListView`,
    `${lockedBranch}) : (\n            <LockedAwardsListView`,
    "app/PicksTabs.tsx"
  );

  // 12. Form branch — insert before AwardsForm
  const formBranch = `        ) : active === "${c.key}" ? (\n          <${c.pascal}Form name={name} matchups={${c.key}Matchups} />\n        `;
  content = requireReplace(
    content,
    `        ) : (\n          <AwardsForm name={name} />`,
    `${formBranch}) : (\n          <AwardsForm name={name} />`,
    "app/PicksTabs.tsx"
  );

  return content;
}

function transformLockedSubmissionViewTsx(content: string, c: SectionConfig): string {
  // 1. Import submission type
  content = requireReplace(
    content,
    `import type { FinalsSubmission } from "@/lib/finals";`,
    `import type { FinalsSubmission } from "@/lib/finals";\nimport type { ${c.pascal}Submission } from "@/lib/${c.key}";`,
    "app/LockedSubmissionView.tsx"
  );

  // 2. Section union
  content = requireReplace(
    content,
    `type Section = "r1" | "r2" | "r3" | "finals" | "awards";`,
    `type Section = "r1" | "r2" | "r3" | "finals" | "${c.key}" | "awards";`,
    "app/LockedSubmissionView.tsx"
  );

  // 3. SECTION_LABEL
  content = requireReplace(
    content,
    `  finals: "Finals",\n  awards: "Award Winners",`,
    `  finals: "Finals",\n  ${c.key}: "${c.label}",\n  awards: "Award Winners",`,
    "app/LockedSubmissionView.tsx"
  );

  // 4. Add new Locked<Key>ListView function before LockedAwardsListView
  const newFn = `export function Locked${c.pascal}ListView({\n  submissions,\n  ${c.key}Results,\n}: {\n  submissions: ${c.pascal}Submission[];\n  ${c.key}Results: ResultsState["${c.key}"];\n}) {\n  const latest = latestByName(submissions);\n  if (latest.length === 0) return <EmptyBanner section="${c.key}" />;\n  return (\n    <ListWrapper section="${c.key}" count={latest.length}>\n      {latest.map((sub) => (\n        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>\n          <ul className={\`space-y-1 text-sm \${GREY}\`}>\n            {sub.picks.map((p) => {\n              const actual = ${c.key}Results.series[p.matchupId];\n              const hasResult = !!(actual && actual.winner);\n              const winnerCorrect = hasResult && p.winner === actual.winner;\n              const gamesCorrect =\n                winnerCorrect && actual.games !== 0 && p.games === actual.games;\n              const points = (winnerCorrect ? 1 : 0) + (gamesCorrect ? 2 : 0);\n              return (\n                <li key={p.matchupId}>\n                  <span className="font-mono">{p.matchupId}</span>\n                  <span className="mx-2">·</span>\n                  <span className={winnerCorrect ? CORRECT : ""}>{p.winner}</span>\n                  <span className="mx-2">·</span>\n                  <span className={gamesCorrect ? CORRECT : ""}>{p.games} games</span>\n                  {hasResult && <span> ({pluralPts(points)})</span>}\n                </li>\n              );\n            })}\n          </ul>\n        </Card>\n      ))}\n    </ListWrapper>\n  );\n}\n\n`;

  content = requireReplace(
    content,
    `export function LockedAwardsListView({`,
    `${newFn}export function LockedAwardsListView({`,
    "app/LockedSubmissionView.tsx"
  );

  return content;
}

function transformLeaderboardTsx(content: string, c: SectionConfig): string {
  // 1. Header
  content = requireReplace(
    content,
    `            <th className="py-2 pr-3 text-right">Finals</th>\n            <th className="py-2 pr-3 text-right">Awards</th>`,
    `            <th className="py-2 pr-3 text-right">Finals</th>\n            <th className="py-2 pr-3 text-right">${c.label}</th>\n            <th className="py-2 pr-3 text-right">Awards</th>`,
    "app/Leaderboard.tsx"
  );

  // 2. Cell
  content = requireReplace(
    content,
    `              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.finalsSeries}</td>\n              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.awardsSingle}</td>`,
    `              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.finalsSeries}</td>\n              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.${c.key}Series}</td>\n              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.awardsSingle}</td>`,
    "app/Leaderboard.tsx"
  );

  return content;
}

function transformResultsFormTsx(content: string, c: SectionConfig): string {
  // 1. Import matchup type — find the import block
  content = requireReplace(
    content,
    `  FinalsMatchup,\n  Matchup,`,
    `  FinalsMatchup,\n  ${c.pascal}Matchup,\n  Matchup,`,
    "app/results/ResultsForm.tsx"
  );

  // 2. Function param
  content = requireReplace(
    content,
    `  finalsMatchups,\n  eastTeams,`,
    `  finalsMatchups,\n  ${c.key}Matchups,\n  eastTeams,`,
    "app/results/ResultsForm.tsx"
  );

  // 3. Type — finalsMatchups
  content = requireReplace(
    content,
    `  finalsMatchups: FinalsMatchup[];\n  eastTeams: string[];`,
    `  finalsMatchups: FinalsMatchup[];\n  ${c.key}Matchups: ${c.pascal}Matchup[];\n  eastTeams: string[];`,
    "app/results/ResultsForm.tsx"
  );

  // 4. setSeries union
  content = requireReplace(
    content,
    `    section: "r1" | "r2" | "r3" | "finals",`,
    `    section: "r1" | "r2" | "r3" | "finals" | "${c.key}",`,
    "app/results/ResultsForm.tsx"
  );

  // 5. New admin section block — insert before Awards section
  const newSection = `      <section className="rounded border border-gray-200 dark:border-gray-800 p-4 space-y-4">\n        <h3 className="text-sm font-semibold">${c.label}</h3>\n        {${c.key}Matchups.length === 0 ? (\n          <p className="text-xs text-gray-500">No ${c.label} matchups configured yet.</p>\n        ) : (\n          <div className="grid gap-3 md:grid-cols-2">\n            {${c.key}Matchups.map((m) => {\n              const result = state.${c.key}.series[m.id] ?? { winner: "", games: 0 };\n              const teams = [m.teamA, m.teamB].filter(Boolean);\n              return (\n                <SeriesRow\n                  key={m.id}\n                  id={m.id}\n                  teams={teams}\n                  result={result}\n                  onChange={(update) => setSeries("${c.key}", m.id, update)}\n                />\n              );\n            })}\n          </div>\n        )}\n      </section>\n\n`;
  content = requireReplace(
    content,
    `      <section className="rounded border border-gray-200 dark:border-gray-800 p-4 space-y-4">\n        <h3 className="text-sm font-semibold">Award Winners</h3>`,
    `${newSection}      <section className="rounded border border-gray-200 dark:border-gray-800 p-4 space-y-4">\n        <h3 className="text-sm font-semibold">Award Winners</h3>`,
    "app/results/ResultsForm.tsx"
  );

  return content;
}

function transformResultsPageTsx(content: string, c: SectionConfig): string {
  // 1. Import getMatchups + isComplete (only get and isComplete used here actually)
  content = requireReplace(
    content,
    `  getFinalsMatchups,\n  getMatchups,`,
    `  getFinalsMatchups,\n  get${c.pascal}Matchups,\n  getMatchups,`,
    "app/results/page.tsx"
  );

  // 2. Import BLOB_PATHNAME
  content = requireReplace(
    content,
    `  FINALS_BLOB_PATHNAME,`,
    `  FINALS_BLOB_PATHNAME,\n  ${c.upper}_BLOB_PATHNAME,`,
    "app/results/page.tsx"
  );

  // 3. Import parse + type
  content = requireReplace(
    content,
    `import { parseFinalsFile, type FinalsSubmission } from "@/lib/finals";`,
    `import { parseFinalsFile, type FinalsSubmission } from "@/lib/finals";\nimport { parse${c.pascal}File, type ${c.pascal}Submission } from "@/lib/${c.key}";`,
    "app/results/page.tsx"
  );

  // 4. Destructure + Promise.all
  content = requireReplace(
    content,
    `  const [r1Raw, r2Raw, r3Raw, finalsRaw, awardsRaw, locks, results] = await Promise.all([`,
    `  const [r1Raw, r2Raw, r3Raw, finalsRaw, ${c.key}Raw, awardsRaw, locks, results] = await Promise.all([`,
    "app/results/page.tsx"
  );

  content = requireReplace(
    content,
    `    readPicksRaw(FINALS_BLOB_PATHNAME).catch(() => ""),\n    readAwardsRaw().catch(() => ""),`,
    `    readPicksRaw(FINALS_BLOB_PATHNAME).catch(() => ""),\n    readPicksRaw(${c.upper}_BLOB_PATHNAME).catch(() => ""),\n    readAwardsRaw().catch(() => ""),`,
    "app/results/page.tsx"
  );

  // 5. Matchups + submissions
  content = requireReplace(
    content,
    `  const finalsMatchups = getFinalsMatchups(bracket);`,
    `  const finalsMatchups = getFinalsMatchups(bracket);\n  const ${c.key}Matchups = get${c.pascal}Matchups(bracket);`,
    "app/results/page.tsx"
  );

  content = requireReplace(
    content,
    `  const finalsSubmissions = parseFinalsFile(finalsRaw).slice(-MAX_ROWS).reverse();`,
    `  const finalsSubmissions = parseFinalsFile(finalsRaw).slice(-MAX_ROWS).reverse();\n  const ${c.key}Submissions = parse${c.pascal}File(${c.key}Raw).slice(-MAX_ROWS).reverse();`,
    "app/results/page.tsx"
  );

  // 6. LockToggle entry — insert before awards
  content = requireReplace(
    content,
    `          <LockToggle kind="finals" label="Finals" initialLocked={locks.finals} />\n          <LockToggle kind="awards" label="Award Winners" initialLocked={locks.awards} />`,
    `          <LockToggle kind="finals" label="Finals" initialLocked={locks.finals} />\n          <LockToggle kind="${c.key}" label="${c.label}" initialLocked={locks.${c.key}} />\n          <LockToggle kind="awards" label="Award Winners" initialLocked={locks.awards} />`,
    "app/results/page.tsx"
  );

  // 7. ResultsForm — pass <key>Matchups prop
  content = requireReplace(
    content,
    `          finalsMatchups={finalsMatchups}`,
    `          finalsMatchups={finalsMatchups}\n          ${c.key}Matchups={${c.key}Matchups}`,
    "app/results/page.tsx"
  );

  // 8. New submissions section — insert before Awards section
  const newSection = `      <section className="mb-10">\n        <h2 className="text-lg font-semibold mb-4">${c.label} — recent submissions</h2>\n\n        {${c.key}Submissions.length === 0 ? (\n          <p className="text-sm text-gray-500">No ${c.label} submissions yet.</p>\n        ) : (\n          <ul className="space-y-3 text-sm">\n            {${c.key}Submissions.map((s, i) => (\n              <${c.pascal}Row key={\`${c.key}-\${s.timestamp}-\${i}\`} submission={s} />\n            ))}\n          </ul>\n        )}\n      </section>\n\n`;

  // Find the Awards header to insert before it. Most reliable anchor:
  content = requireReplace(
    content,
    `      <section>\n        <h2 className="text-lg font-semibold mb-4">Award Winners — recent submissions</h2>`,
    `${newSection}      <section>\n        <h2 className="text-lg font-semibold mb-4">Award Winners — recent submissions</h2>`,
    "app/results/page.tsx"
  );

  // 9. New Row component — insert before AwardsRow
  const rowFn = c.conferenceSplit
    ? `function ${c.pascal}Row({ submission }: { submission: ${c.pascal}Submission }) {\n  return (\n    <li className="border border-gray-200 dark:border-gray-800 rounded p-3">\n      <div className="flex items-baseline justify-between gap-4 mb-2">\n        <span className="font-medium">{submission.name}</span>\n        <span className="text-xs text-gray-500 font-mono">{submission.timestamp}</span>\n      </div>\n      <PickGrid\n        east={submission.picks.filter((p) => p.matchupId.startsWith("E-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}\n        west={submission.picks.filter((p) => p.matchupId.startsWith("W-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}\n      />\n    </li>\n  );\n}\n\n`
    : `function ${c.pascal}Row({ submission }: { submission: ${c.pascal}Submission }) {\n  return (\n    <li className="border border-gray-200 dark:border-gray-800 rounded p-3">\n      <div className="flex items-baseline justify-between gap-4 mb-2">\n        <span className="font-medium">{submission.name}</span>\n        <span className="text-xs text-gray-500 font-mono">{submission.timestamp}</span>\n      </div>\n      <ul className="space-y-0.5 text-xs">\n        {submission.picks.map((p) => (\n          <li key={p.matchupId} className="flex items-baseline gap-2">\n            <span className="font-mono text-gray-500 w-16 shrink-0">{p.matchupId}</span>\n            <span className="font-medium">{p.winner}</span>\n            <span className="text-gray-500">in {p.games}</span>\n          </li>\n        ))}\n      </ul>\n    </li>\n  );\n}\n\n`;

  content = requireReplace(
    content,
    `function AwardsRow({ submission }: { submission: AwardsSubmission }) {`,
    `${rowFn}function AwardsRow({ submission }: { submission: AwardsSubmission }) {`,
    "app/results/page.tsx"
  );

  return content;
}

function transformBlobAdminPullTs(content: string, c: SectionConfig): string {
  // 1. Doc comment
  content = requireReplace(
    content,
    `// <name> ∈ picks | r2 | r3 | finals | awards | lock | results`,
    `// <name> ∈ picks | r2 | r3 | finals | ${c.key} | awards | lock | results`,
    ".claude/skills/blob-admin/scripts/pull.ts"
  );

  // 2. Import — add BLOB_PATHNAME
  content = requireReplace(
    content,
    `  FINALS_BLOB_PATHNAME,\n} from "@/lib/picks";`,
    `  FINALS_BLOB_PATHNAME,\n  ${c.upper}_BLOB_PATHNAME,\n} from "@/lib/picks";`,
    ".claude/skills/blob-admin/scripts/pull.ts"
  );

  // 3. NAMES tuple
  content = requireReplace(
    content,
    `const NAMES = ["picks", "r2", "r3", "finals", "awards", "lock", "results"] as const;`,
    `const NAMES = ["picks", "r2", "r3", "finals", "${c.key}", "awards", "lock", "results"] as const;`,
    ".claude/skills/blob-admin/scripts/pull.ts"
  );

  // 4. load() branch
  const branch = `  if (name === "${c.key}") {\n    return {\n      pathname: "picks-${c.key}.txt",\n      content: await readPicksRaw(${c.upper}_BLOB_PATHNAME),\n    };\n  }\n`;
  content = requireReplace(
    content,
    `  if (name === "awards") {`,
    `${branch}  if (name === "awards") {`,
    ".claude/skills/blob-admin/scripts/pull.ts"
  );

  return content;
}

function transformBlobAdminPushTs(content: string, c: SectionConfig): string {
  // 1. Doc comments
  content = requireReplace(
    content,
    `// <name> ∈ picks | r2 | r3 | finals | awards | lock | results`,
    `// <name> ∈ picks | r2 | r3 | finals | ${c.key} | awards | lock | results`,
    ".claude/skills/blob-admin/scripts/push.ts"
  );

  content = requireReplace(
    content,
    `// Plain-text blobs (picks, r2, r3, finals, awards) are uploaded byte-for-byte.`,
    `// Plain-text blobs (picks, r2, r3, finals, ${c.key}, awards) are uploaded byte-for-byte.`,
    ".claude/skills/blob-admin/scripts/push.ts"
  );

  // 2. Import — add BLOB_PATHNAME
  content = requireReplace(
    content,
    `  FINALS_BLOB_PATHNAME,\n} from "@/lib/picks";`,
    `  FINALS_BLOB_PATHNAME,\n  ${c.upper}_BLOB_PATHNAME,\n} from "@/lib/picks";`,
    ".claude/skills/blob-admin/scripts/push.ts"
  );

  // 3. NAMES tuple
  content = requireReplace(
    content,
    `const NAMES = ["picks", "r2", "r3", "finals", "awards", "lock", "results"] as const;`,
    `const NAMES = ["picks", "r2", "r3", "finals", "${c.key}", "awards", "lock", "results"] as const;`,
    ".claude/skills/blob-admin/scripts/push.ts"
  );

  // 4. FILES map
  content = requireReplace(
    content,
    `  finals: "picks-finals.txt",\n  awards: "awards.txt",`,
    `  finals: "picks-finals.txt",\n  ${c.key}: "picks-${c.key}.txt",\n  awards: "awards.txt",`,
    ".claude/skills/blob-admin/scripts/push.ts"
  );

  // 5. pushAndVerify branch
  const branch = `  if (name === "${c.key}") {\n    await writePicksRaw(localContent, ${c.upper}_BLOB_PATHNAME);\n    const after = await readPicksRaw(${c.upper}_BLOB_PATHNAME);\n    console.log(\n      \`picks-${c.key}.txt uploaded — byte match=\${localContent === after}, size=\${after.length}\`\n    );\n    return;\n  }\n`;
  content = requireReplace(
    content,
    `  if (name === "picks") {`,
    `${branch}  if (name === "picks") {`,
    ".claude/skills/blob-admin/scripts/push.ts"
  );

  return content;
}

// ----------------------------------------------------------------------------
// Test template helper
// ----------------------------------------------------------------------------

function buildTestConfigJson(c: SectionConfig): string {
  const base: Record<string, unknown> = {
    season: "test",
    east: Array.from({ length: 8 }, (_, i) => ({ seed: i + 1, team: `E${i + 1}` })),
    west: Array.from({ length: 8 }, (_, i) => ({ seed: i + 1, team: `W${i + 1}` })),
  };
  if (c.conferenceSplit) {
    base[c.key] = {
      east: c.eastIds.map((id) => ({ id, teamA: "E1", teamB: "E2" })),
      west: c.westIds.map((id) => ({ id, teamA: "W1", teamB: "W2" })),
    };
  } else {
    base[c.key] = { id: c.singleId, teamA: "E1", teamB: "W1" };
  }
  return JSON.stringify(base, null, 2);
}

function buildTestValidPicks(c: SectionConfig): string {
  const ids = c.conferenceSplit
    ? [...c.eastIds, ...c.westIds]
    : [c.singleId];
  return ids
    .map((id, i) => {
      const winner = c.conferenceSplit
        ? id.startsWith("E-")
          ? "E1"
          : "W1"
        : i % 2 === 0
          ? "E1"
          : "W1";
      return `\n    { matchupId: "${id}", winner: "${winner}", games: ${4 + (i % 4)} }`;
    })
    .join(",") + "\n  ";
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  const { config, yes } = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  const ops: Op[] = [];

  // New files
  const libContent = fill(LIB_TPL_CONF, config);
  ops.push(planCreateFile(`lib/${config.key}.ts`, libContent, `create lib/${config.key}.ts`));

  const testContent = fill(TEST_TPL, config)
    .replaceAll("{{CONFIG_JSON}}", buildTestConfigJson(config))
    .replaceAll("{{VALID_PICKS}}", buildTestValidPicks(config));
  ops.push(planCreateFile(`lib/${config.key}.test.ts`, testContent, `create lib/${config.key}.test.ts`));

  const routeContent = fill(ROUTE_TPL, config);
  ops.push(planCreateFile(`app/api/submit/${config.key}/route.ts`, routeContent, `create app/api/submit/${config.key}/route.ts`));

  const formTpl = config.conferenceSplit ? FORM_TPL_CONF : FORM_TPL_SINGLE;
  const formContent = fill(formTpl, config);
  ops.push(planCreateFile(`app/${config.pascal}Form.tsx`, formContent, `create app/${config.pascal}Form.tsx`));

  // Edits
  ops.push(planEditFile("bracket.json", "add finals-adjacent section to bracket.json", (s) => transformBracketJson(s, config)));
  ops.push(planEditFile("lib/bracket.ts", `add ${config.pascal}Config/Matchup types + helpers`, (s) => transformLibBracketTs(s, config)));
  ops.push(planEditFile("lib/picks.ts", `add ${config.upper}_BLOB_PATHNAME`, (s) => transformLibPicksTs(s, config)));
  ops.push(planEditFile("lib/lock.ts", `extend LockState with ${config.key}`, (s) => transformLibLockTs(s, config)));
  ops.push(planEditFile("lib/results.ts", `extend ResultsState with ${config.key}`, (s) => transformLibResultsTs(s, config)));
  ops.push(planEditFile("lib/scoring.ts", `add score${config.pascal} + leaderboard wiring`, (s) => transformLibScoringTs(s, config)));
  ops.push(planEditFile("lib/scoring.test.ts", `add ${config.key}: [] to buildLeaderboard call sites`, (s) => transformLibScoringTestTs(s, config)));
  ops.push(planEditFile("app/page.tsx", `load + wire ${config.key} submissions`, (s) => transformAppPageTsx(s, config)));
  ops.push(planEditFile("app/PicksTabs.tsx", `add ${config.label} tab`, (s) => transformAppPicksTabsTsx(s, config)));
  ops.push(planEditFile("app/LockedSubmissionView.tsx", `add Locked${config.pascal}ListView`, (s) => transformLockedSubmissionViewTsx(s, config)));
  ops.push(planEditFile("app/Leaderboard.tsx", `add ${config.label} column`, (s) => transformLeaderboardTsx(s, config)));
  ops.push(planEditFile("app/results/ResultsForm.tsx", `add ${config.label} admin block`, (s) => transformResultsFormTsx(s, config)));
  ops.push(planEditFile("app/results/page.tsx", `add ${config.label} lock toggle + submissions section`, (s) => transformResultsPageTsx(s, config)));
  ops.push(planEditFile(".claude/skills/blob-admin/scripts/pull.ts", `register ${config.key} in blob-admin pull`, (s) => transformBlobAdminPullTs(s, config)));
  ops.push(planEditFile(".claude/skills/blob-admin/scripts/push.ts", `register ${config.key} in blob-admin push`, (s) => transformBlobAdminPushTs(s, config)));

  // Print plan
  console.log(`\nadd-section scaffolder — key=${config.key}, label="${config.label}", conferenceSplit=${config.conferenceSplit}\n`);
  console.log("Will perform these operations:\n");
  for (const op of ops) {
    console.log(`  ${op.description.padEnd(60)} ${op.path}`);
  }
  console.log("");

  if (!yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question("Proceed? [y/N] ")).trim().toLowerCase();
    rl.close();
    if (answer !== "y" && answer !== "yes") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  // Apply
  const errors: string[] = [];
  for (const op of ops) {
    try {
      op.apply(cwd);
      console.log(`  ✓ ${op.path}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${op.path}: ${msg}`);
      console.error(`  ✗ ${op.path} — ${msg}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} operation(s) failed. The codebase may be in a partially-modified state.`);
    process.exit(1);
  }

  console.log(`\nScaffold complete. Post-scaffold checklist:`);
  console.log(`  1. Fill in actual teamA / teamB in bracket.json under "${config.key}"`);
  console.log(`  2. Run: npx tsc --noEmit`);
  console.log(`  3. Run: npm test`);
  console.log(`  4. Run: npm run lint`);
  console.log(`  5. (Optional) reorder the new tab in app/PicksTabs.tsx's TABS array`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
