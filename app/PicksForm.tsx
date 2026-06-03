"use client";

import { useMemo, useState } from "react";
import type { Matchup, Team } from "@/lib/bracket";

interface PickState {
  winner?: string;
  games?: number;
}

type PicksMap = Record<string, PickState>;

const GAMES_OPTIONS = [4, 5, 6, 7];

export default function PicksForm({
  name,
  matchups,
  eastTeams,
  westTeams,
}: {
  name: string;
  matchups: Matchup[];
  eastTeams: Team[];
  westTeams: Team[];
}) {
  const [picks, setPicks] = useState<PicksMap>({});
  const [eastWinner, setEastWinner] = useState<string>("");
  const [westWinner, setWestWinner] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const east = useMemo(() => matchups.filter((m) => m.conference === "East"), [matchups]);
  const west = useMemo(() => matchups.filter((m) => m.conference === "West"), [matchups]);

  const eastTeamOptions = useMemo(
    () => eastTeams.filter((t) => t.team.length > 0),
    [eastTeams]
  );
  const westTeamOptions = useMemo(
    () => westTeams.filter((t) => t.team.length > 0),
    [westTeams]
  );

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
    if (!eastWinner) return "Pick the Eastern Conference winner";
    if (!westWinner) return "Pick the Western Conference winner";
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
      eastConferenceWinner: eastWinner,
      westConferenceWinner: westWinner,
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
        setEastWinner("");
        setWestWinner("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!allReady && (
        <div className="border-2 border-black px-4 py-3 text-sm">
          The bracket isn&apos;t fully configured yet. Fill in the team names in{" "}
          <code>bracket.json</code> to enable submissions.
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Column
          title="Eastern Conference"
          matchups={east}
          picks={picks}
          setPick={setPick}
          conferenceWinner={{
            id: "east-conference-winner",
            teams: eastTeamOptions,
            value: eastWinner,
            onChange: (v) => {
              setEastWinner(v);
              setSuccess(false);
              setError(null);
            },
          }}
        />
        <Column
          title="Western Conference"
          matchups={west}
          picks={picks}
          setPick={setPick}
          conferenceWinner={{
            id: "west-conference-winner",
            teams: westTeamOptions,
            value: westWinner,
            onChange: (v) => {
              setWestWinner(v);
              setSuccess(false);
              setError(null);
            },
          }}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting || !allReady}
          className="bg-black text-white px-5 py-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : "Submit picks"}
        </button>

        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        {success && <p className="text-sm font-bold text-accent">Picks saved!</p>}
      </div>
    </form>
  );
}

interface ConferenceWinnerField {
  id: string;
  teams: Team[];
  value: string;
  onChange: (next: string) => void;
}

function Column({
  title,
  matchups,
  picks,
  setPick,
  conferenceWinner,
}: {
  title: string;
  matchups: Matchup[];
  picks: PicksMap;
  setPick: (id: string, patch: Partial<PickState>) => void;
  conferenceWinner: ConferenceWinnerField;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.06em]">{title}</h2>

      <div className="border-[3px] border-black p-5">
        <label htmlFor={conferenceWinner.id} className="block">
          <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#999] mb-2">Conference winner</span>
          <select
            id={conferenceWinner.id}
            value={conferenceWinner.value}
            onChange={(e) => conferenceWinner.onChange(e.target.value)}
            disabled={conferenceWinner.teams.length === 0}
            className="w-full border-2 border-black rounded-none bg-white px-2.5 py-1.5 text-[0.82rem] font-extrabold text-black disabled:opacity-50"
          >
            <option value="" disabled>
              {conferenceWinner.teams.length === 0 ? "TBD" : "Pick a team…"}
            </option>
            {conferenceWinner.teams.map((t) => (
              <option key={t.seed} value={t.team}>
                {t.seed}. {t.team}
              </option>
            ))}
          </select>
        </label>
      </div>

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
    <li className="border-[3px] border-black p-5">
      <div className="text-[0.65rem] font-extrabold text-[#999] uppercase tracking-[0.12em] border-b-2 border-black pb-2.5 mb-3.5">
        {matchup.id}
      </div>
      {!ready ? (
        <p className="text-sm text-[#999]">TBD — team(s) not yet set</p>
      ) : (
        <>
          <div className="mb-1">
            {[matchup.high, matchup.low].map((t) => (
              <label
                key={t.seed}
                className={`flex items-center justify-between text-sm font-extrabold py-3 border-b border-[#f0f0f0] cursor-pointer ${pick?.winner === t.team ? "text-black" : "text-[#ccc]"}`}
              >
                <span>{t.team}</span>
                <input
                  type="radio"
                  name={matchup.id}
                  value={t.team}
                  checked={pick?.winner === t.team}
                  onChange={() => onChange({ winner: t.team })}
                  className="ml-2"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm mt-3.5">
            <span className="text-[#999] font-bold">In</span>
            <select
              value={pick?.games ?? ""}
              onChange={(e) => onChange({ games: Number(e.target.value) })}
              className="bg-white border-2 border-black rounded-none px-2.5 py-1 text-[0.82rem] font-extrabold text-black"
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
