"use client";

import { useMemo, useState } from "react";
import type { Round3Matchup } from "@/lib/bracket";

interface PickState {
  winner?: string;
  games?: number;
}

type PicksMap = Record<string, PickState>;

const GAMES_OPTIONS = [4, 5, 6, 7];

export default function Round3Form({
  name,
  matchups,
}: {
  name: string;
  matchups: Round3Matchup[];
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
    if (matchups.length === 0) return "Round 3 is not yet configured";
    if (!allReady) return "Round 3 bracket is not fully configured yet";
    if (!name.trim()) return "Please enter your name";
    for (const m of matchups) {
      const p = picks[m.id];
      if (!p?.winner) return `Pick a winner for ${m.id} (${m.teamA} vs ${m.teamB})`;
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
        matchupId: m.id,
        winner: picks[m.id].winner,
        games: picks[m.id].games,
      })),
    };

    try {
      const res = await fetch("/api/submit/r3", {
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
        <div className="border-2 border-black px-4 py-3 text-sm dark:border-[#2a2a2a]">
          Round 3 hasn&apos;t been configured yet.
        </div>
      )}

      {matchups.length > 0 && !allReady && (
        <div className="border-2 border-black px-4 py-3 text-sm dark:border-[#2a2a2a]">
          Round 3 matchups aren&apos;t fully filled in yet.
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Column title="Eastern Conference Final" matchups={east} picks={picks} setPick={setPick} />
        <Column title="Western Conference Final" matchups={west} picks={picks} setPick={setPick} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting || !allReady}
          className="bg-black text-white px-5 py-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em] disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit Round 3 picks"}
        </button>

        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        {success && (
          <p className="text-sm font-bold text-accent">Round 3 picks saved!</p>
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
  matchups: Round3Matchup[];
  picks: PicksMap;
  setPick: (id: string, patch: Partial<PickState>) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.06em]">{title}</h2>

      {matchups.length === 0 ? (
        <p className="text-sm text-muted">No conference final matchups configured.</p>
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
  matchup: Round3Matchup;
  pick: PickState | undefined;
  onChange: (patch: Partial<PickState>) => void;
}) {
  const ready = matchup.teamA.length > 0 && matchup.teamB.length > 0;

  return (
    <li className="border-[3px] border-black p-5 dark:border-[#2a2a2a]">
      <div className="text-[0.65rem] font-extrabold text-muted uppercase tracking-[0.12em] border-b-2 border-black pb-2.5 mb-3.5 dark:border-[#2a2a2a]">
        {matchup.id}
      </div>
      {!ready ? (
        <p className="text-sm text-muted">TBD — teams not yet set in bracket.json</p>
      ) : (
        <>
          <div className="mb-1">
            {[matchup.teamA, matchup.teamB].map((t) => (
              <label
                key={t}
                className={`flex items-center justify-between text-sm font-extrabold py-3 border-b border-[#f0f0f0] cursor-pointer dark:border-[#1f1f1f] ${pick?.winner === t ? "text-black dark:text-white" : "text-[#ccc] dark:text-[#333]"}`}
              >
                <span>{t}</span>
                <input
                  type="radio"
                  name={matchup.id}
                  value={t}
                  checked={pick?.winner === t}
                  onChange={() => onChange({ winner: t })}
                  className="ml-2"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm mt-3.5">
            <span className="text-muted font-bold">In</span>
            <select
              value={pick?.games ?? ""}
              onChange={(e) => onChange({ games: Number(e.target.value) })}
              className="bg-white border-2 border-black rounded-none px-2.5 py-1 text-[0.82rem] font-extrabold text-black dark:bg-[#1a1a1a] dark:border-white dark:text-white"
            >
              <option value="" disabled>—</option>
              {GAMES_OPTIONS.map((g) => (
                <option key={g} value={g}>{g} games</option>
              ))}
            </select>
          </div>
        </>
      )}
    </li>
  );
}
