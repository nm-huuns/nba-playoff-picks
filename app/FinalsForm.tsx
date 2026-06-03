"use client";

import { useMemo, useState } from "react";
import type { FinalsMatchup } from "@/lib/bracket";
import { GAME_KEYS, REQUIRED_GAME_KEYS, VALID_CHAMPION_GAMES, type GameKey, type GamePicks } from "@/lib/finals";

type PlayerField = "mvp" | "pointsLeader" | "reboundsLeader" | "assistsLeader";

const PLAYER_FIELDS: { key: PlayerField; label: string }[] = [
  { key: "mvp", label: "Finals MVP" },
  { key: "pointsLeader", label: "Series points leader" },
  { key: "reboundsLeader", label: "Series rebounds leader" },
  { key: "assistsLeader", label: "Series assists leader" },
];

export default function FinalsForm({
  name,
  matchups,
}: {
  name: string;
  matchups: FinalsMatchup[];
}) {
  const matchup = matchups[0];
  const [champion, setChampion] = useState<string>("");
  const [championGames, setChampionGames] = useState<number>(0);
  const [games, setGames] = useState<GamePicks>({});
  const [players, setPlayers] = useState<Record<PlayerField, string>>({
    mvp: "",
    pointsLeader: "",
    reboundsLeader: "",
    assistsLeader: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

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
    setSuccess(false);
    setError(null);
  }

  function findMissing(): string | null {
    if (!ready) return "Finals bracket is not fully configured yet";
    if (!name.trim()) return "Please enter your name";
    if (!champion) return "Pick a series champion";
    if (!VALID_CHAMPION_GAMES.includes(championGames as (typeof VALID_CHAMPION_GAMES)[number]))
      return "Pick a series length (4–7 games)";
    for (const k of REQUIRED_GAME_KEYS) {
      if (!games[k]) return `Pick a winner for ${k}`;
    }
    for (const { key, label } of PLAYER_FIELDS) {
      if (!players[key].trim()) return `Enter your ${label} pick`;
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
      champion,
      championGames,
      games,
      mvp: players.mvp.trim(),
      pointsLeader: players.pointsLeader.trim(),
      reboundsLeader: players.reboundsLeader.trim(),
      assistsLeader: players.assistsLeader.trim(),
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
        setChampion("");
        setChampionGames(0);
        setGames({});
        setPlayers({ mvp: "", pointsLeader: "", reboundsLeader: "", assistsLeader: "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="border-2 border-black px-4 py-3 text-sm dark:border-[#2a2a2a]">
        Finals matchup isn&apos;t set yet. Check back once the two teams are confirmed.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.06em]">Championship pick</h2>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted" htmlFor="finals-champion">Champion</label>
            <select
              id="finals-champion"
              value={champion}
              onChange={(e) => { setChampion(e.target.value); setSuccess(false); setError(null); }}
              className="border-2 border-black rounded-none bg-white px-2.5 py-2 text-[0.82rem] font-extrabold text-black dark:border-white dark:bg-[#1a1a1a] dark:text-white"
            >
              <option value="">— select team —</option>
              {[matchup.teamA, matchup.teamB].map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted" htmlFor="finals-champion-games">In how many games?</label>
            <select
              id="finals-champion-games"
              value={championGames === 0 ? "" : championGames}
              onChange={(e) => { setChampionGames(Number(e.target.value)); setSuccess(false); setError(null); }}
              className="border-2 border-black rounded-none bg-white px-2.5 py-2 text-[0.82rem] font-extrabold text-black dark:border-white dark:bg-[#1a1a1a] dark:text-white"
            >
              <option value="">— select —</option>
              {VALID_CHAMPION_GAMES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.06em]">Game-by-game results</h2>
        <div className="overflow-x-auto">
          <table className="text-sm border-separate border-spacing-1">
            <thead>
              <tr className="text-[0.62rem] uppercase tracking-[0.1em] text-[#aaa] font-extrabold">
                <th className="text-left pr-3">Team</th>
                {GAME_KEYS.map((k) => (
                  <th key={k} className="px-1 text-center">
                    {k}
                    {!REQUIRED_GAME_KEYS.includes(k) && (
                      <span className="block text-[9px] normal-case text-[#ccc] dark:text-[#333]">opt</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[matchup.teamA, matchup.teamB].map((team) => (
                <tr key={team}>
                  <td className="pr-3 font-extrabold whitespace-nowrap">{team}</td>
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
        <h2 className="text-sm font-extrabold uppercase tracking-[0.06em]">Finals awards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLAYER_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-1.5" htmlFor={`finals-${key}`}>
                {label}
              </label>
              <input
                id={`finals-${key}`}
                type="text"
                value={players[key]}
                onChange={(e) => setPlayer(key, e.target.value)}
                maxLength={60}
                className="w-full border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold dark:border-white dark:bg-[#1a1a1a] dark:text-white"
                placeholder="Player name"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white px-5 py-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em] disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit Finals picks"}
        </button>

        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        {success && (
          <p className="text-sm font-bold text-accent">Finals picks saved!</p>
        )}
      </div>
    </form>
  );
}
