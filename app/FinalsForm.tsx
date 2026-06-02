"use client";

import { useMemo, useState } from "react";
import type { FinalsMatchup } from "@/lib/bracket";
<<<<<<< HEAD
import { GAME_KEYS, REQUIRED_GAME_KEYS, type GameKey, type GamePicks } from "@/lib/finals";

type PlayerField = "mvp" | "pointsLeader" | "reboundsLeader" | "assistsLeader";

const PLAYER_FIELDS: { key: PlayerField; label: string }[] = [
  { key: "mvp", label: "Finals MVP" },
  { key: "pointsLeader", label: "Series points leader" },
  { key: "reboundsLeader", label: "Series rebounds leader" },
  { key: "assistsLeader", label: "Series assists leader" },
];
=======

interface PickState {
  winner?: string;
  games?: number;
}

type PicksMap = Record<string, PickState>;

const GAMES_OPTIONS = [4, 5, 6, 7];
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9

export default function FinalsForm({
  name,
  matchups,
}: {
  name: string;
  matchups: FinalsMatchup[];
}) {
<<<<<<< HEAD
  const matchup = matchups[0];
  const [games, setGames] = useState<GamePicks>({});
  const [players, setPlayers] = useState<Record<PlayerField, string>>({
    mvp: "",
    pointsLeader: "",
    reboundsLeader: "",
    assistsLeader: "",
  });
=======
  const [picks, setPicks] = useState<PicksMap>({});
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

<<<<<<< HEAD
  const ready = useMemo(
    () => !!matchup && matchup.teamA.length > 0 && matchup.teamB.length > 0,
    [matchup]
  );

  function setGame(k: GameKey, team: string) {
    setGames((prev) => ({ ...prev, [k]: team }));
    setSuccess(false);
    setError(null);
  }

  function setPlayer(field: PlayerField, value: string) {
    setPlayers((prev) => ({ ...prev, [field]: value }));
=======
  const allReady = useMemo(
    () => matchups.length > 0 && matchups.every((m) => m.teamA.length > 0 && m.teamB.length > 0),
    [matchups]
  );

  function setPick(id: string, patch: Partial<PickState>) {
    setPicks((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
    setSuccess(false);
    setError(null);
  }

  function findMissing(): string | null {
<<<<<<< HEAD
    if (!ready) return "Finals bracket is not fully configured yet";
    if (!name.trim()) return "Please enter your name";
    for (const k of REQUIRED_GAME_KEYS) {
      if (!games[k]) return `Pick a winner for ${k}`;
    }
    for (const { key, label } of PLAYER_FIELDS) {
      if (!players[key].trim()) return `Enter your ${label} pick`;
=======
    if (matchups.length === 0) return "Finals is not yet configured";
    if (!allReady) return "Finals bracket is not fully configured yet";
    if (!name.trim()) return "Please enter your name";
    for (const m of matchups) {
      const p = picks[m.id];
      if (!p?.winner) return `Pick a winner for ${m.id} (${m.teamA} vs ${m.teamB})`;
      if (typeof p.games !== "number") return `Pick the series length for ${m.id}`;
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
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
<<<<<<< HEAD
      games,
      mvp: players.mvp.trim(),
      pointsLeader: players.pointsLeader.trim(),
      reboundsLeader: players.reboundsLeader.trim(),
      assistsLeader: players.assistsLeader.trim(),
=======
      picks: matchups.map((m) => ({
        matchupId: m.id,
        winner: picks[m.id].winner,
        games: picks[m.id].games,
      })),
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
    };

    try {
      const res = await fetch("/api/submit/finals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Submission failed");
      } else {
        setSuccess(true);
<<<<<<< HEAD
        setGames({});
        setPlayers({ mvp: "", pointsLeader: "", reboundsLeader: "", assistsLeader: "" });
=======
        setPicks({});
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

<<<<<<< HEAD
  if (!ready) {
    return (
      <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
        Finals matchup isn&apos;t set yet. Check back once the two teams are confirmed.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <ScoringRules />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Game-by-game winners</h2>
        <p className="text-xs text-gray-500">
          Games 1–4 are required. Games 5–7 are optional — leave them blank if you think the
          series ends sooner.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-separate border-spacing-1">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left pr-3">Team</th>
                {GAME_KEYS.map((k) => (
                  <th key={k} className="px-1 text-center font-medium">
                    {k}
                    {!REQUIRED_GAME_KEYS.includes(k) && (
                      <span className="block text-[9px] normal-case text-gray-400">opt</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[matchup.teamA, matchup.teamB].map((team) => (
                <tr key={team}>
                  <td className="pr-3 font-medium whitespace-nowrap">{team}</td>
                  {GAME_KEYS.map((k) => (
                    <td key={k} className="text-center">
                      <input
                        type="radio"
                        name={`finals-${k}`}
                        aria-label={`${team} wins ${k}`}
                        checked={games[k] === team}
                        onChange={() => setGame(k, team)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Finals awards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLAYER_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1" htmlFor={`finals-${key}`}>
                {label}
              </label>
              <input
                id={`finals-${key}`}
                type="text"
                value={players[key]}
                onChange={(e) => setPlayer(key, e.target.value)}
                maxLength={60}
                className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                placeholder="Player name"
              />
            </div>
          ))}
        </div>
=======
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {matchups.length === 0 && (
        <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
          Finals hasn&apos;t been configured yet.
        </div>
      )}

      {matchups.length > 0 && !allReady && (
        <div className="rounded border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm">
          Finals matchup isn&apos;t fully filled in yet.
        </div>
      )}

      <section className="space-y-4 max-w-md">
        <h2 className="text-base font-semibold">NBA Finals</h2>

        {matchups.length === 0 ? (
          <p className="text-sm italic text-gray-500">No finals matchup configured.</p>
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
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
<<<<<<< HEAD
          disabled={submitting}
          className="rounded bg-black text-white px-5 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit Finals picks"}
=======
          disabled={submitting || !allReady}
          className="rounded bg-black text-white px-5 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit Finals pick"}
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
<<<<<<< HEAD
          <p className="text-sm text-green-700 dark:text-green-400">Finals picks saved!</p>
=======
          <p className="text-sm text-green-700 dark:text-green-400">Finals pick saved!</p>
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
        )}
      </div>
    </form>
  );
}

<<<<<<< HEAD
function ScoringRules() {
  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm">
      <p className="font-medium mb-2">Finals scoring</p>
      <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
        <li>1 point for each game whose winner you pick correctly (only games that are actually played count)</li>
        <li>1 point for the correct Finals MVP</li>
        <li>1 point each for the correct series leader in points, rebounds, and assists</li>
      </ul>
    </div>
=======
function MatchupCard({
  matchup,
  pick,
  onChange,
}: {
  matchup: FinalsMatchup;
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
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
  );
}
