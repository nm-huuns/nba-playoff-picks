"use client";

import { useMemo, useState } from "react";
import type { Matchup } from "@/lib/bracket";

interface PickState {
  winner?: string;
  games?: number;
}

type PicksMap = Record<string, PickState>;

const GAMES_OPTIONS = [4, 5, 6, 7];

export default function PicksForm({ matchups }: { matchups: Matchup[] }) {
  const [name, setName] = useState("");
  const [picks, setPicks] = useState<PicksMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const east = useMemo(() => matchups.filter((m) => m.conference === "East"), [matchups]);
  const west = useMemo(() => matchups.filter((m) => m.conference === "West"), [matchups]);

  const allReady = useMemo(
    () => matchups.every((m) => m.high.team.length > 0 && m.low.team.length > 0),
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
    if (!allReady) return "Bracket is not fully configured yet";
    if (!name.trim()) return "Please enter your name";
    for (const m of matchups) {
      const p = picks[m.id];
      if (!p?.winner) return `Pick a winner for ${m.id} (${m.high.team} vs ${m.low.team})`;
      if (typeof p.games !== "number") return `Pick the series length for ${m.id}`;
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
        seriesId: m.id,
        winner: picks[m.id].winner,
        games: picks[m.id].games,
      })),
    };

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Submission failed");
      } else {
        setSuccess(true);
        // Clear picks but keep name so the user can see what they submitted.
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
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          className="w-full sm:w-64 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          placeholder="e.g. Sunny"
        />
      </div>

      {!allReady && (
        <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
          The bracket isn&apos;t fully configured yet. Fill in the team names in{" "}
          <code>bracket.json</code> to enable submissions.
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
          {submitting ? "Submitting…" : "Submit picks"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700 dark:text-green-400">Picks saved!</p>}
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
  matchups: Matchup[];
  picks: PicksMap;
  setPick: (id: string, patch: Partial<PickState>) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>
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
    </section>
  );
}

function MatchupCard({
  matchup,
  pick,
  onChange,
}: {
  matchup: Matchup;
  pick: PickState | undefined;
  onChange: (patch: Partial<PickState>) => void;
}) {
  const ready = matchup.high.team.length > 0 && matchup.low.team.length > 0;

  return (
    <li className="rounded border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{matchup.id}</p>

      {!ready ? (
        <p className="text-sm italic text-gray-500">TBD — team(s) not yet set in bracket.json</p>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {[matchup.high, matchup.low].map((t) => (
              <label key={t.seed} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={matchup.id}
                  value={t.team}
                  checked={pick?.winner === t.team}
                  onChange={() => onChange({ winner: t.team })}
                />
                <span className="text-xs font-mono text-gray-500 w-4">{t.seed}</span>
                <span>{t.team}</span>
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
