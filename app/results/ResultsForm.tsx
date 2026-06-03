"use client";

import { useState } from "react";
import type {
  FinalsMatchup,
  Matchup,
  Round2Matchup,
  Round3Matchup,
} from "@/lib/bracket";
import type { ResultsState, SeriesResult } from "@/lib/results";
import { GAME_KEYS, type GameKey } from "@/lib/finals";

const TEAM_SIZE = 5;
const GAMES_OPTIONS = [0, 4, 5, 6, 7] as const;

type FinalsAwardField = "mvp" | "pointsLeader" | "reboundsLeader" | "assistsLeader";

export default function ResultsForm({
  matchups,
  round2Matchups,
  round3Matchups,
  finalsMatchups,
  eastTeams,
  westTeams,
  initialState,
}: {
  matchups: Matchup[];
  round2Matchups: Round2Matchup[];
  round3Matchups: Round3Matchup[];
  finalsMatchups: FinalsMatchup[];
  eastTeams: string[];
  westTeams: string[];
  initialState: ResultsState;
}) {
  const [state, setState] = useState<ResultsState>(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function setSeries(
    section: "r1" | "r2" | "r3",
    id: string,
    update: Partial<SeriesResult>
  ) {
    setState((prev) => {
      const current: SeriesResult = prev[section].series[id] ?? { winner: "", games: 0 };
      const merged: SeriesResult = { ...current, ...update };
      return {
        ...prev,
        [section]: {
          ...prev[section],
          series: { ...prev[section].series, [id]: merged },
        },
      };
    });
    setSavedAt(null);
    setError(null);
  }

  function setFinalsGame(k: GameKey, team: string) {
    setState((prev) => {
      const games = { ...prev.finals.games };
      if (team === "") delete games[k];
      else games[k] = team;
      return { ...prev, finals: { ...prev.finals, games } };
    });
    setSavedAt(null);
    setError(null);
  }

  function setFinalsAward(field: FinalsAwardField, value: string) {
    setState((prev) => ({ ...prev, finals: { ...prev.finals, [field]: value } }));
    setSavedAt(null);
    setError(null);
  }

  function setConferenceWinner(side: "east" | "west", value: string) {
    setState((prev) => ({
      ...prev,
      r1: {
        ...prev.r1,
        conferenceWinners: { ...prev.r1.conferenceWinners, [side]: value },
      },
    }));
    setSavedAt(null);
    setError(null);
  }

  function setSingleAward(
    field: "mvp" | "roy" | "mip" | "smoy" | "coy",
    value: string
  ) {
    setState((prev) => ({ ...prev, awards: { ...prev.awards, [field]: value } }));
    setSavedAt(null);
    setError(null);
  }

  function setAllNbaPlayer(
    team: "first" | "second" | "third",
    index: number,
    value: string
  ) {
    setState((prev) => {
      const next = [...prev.awards.allNBA[team]];
      next[index] = value;
      return {
        ...prev,
        awards: {
          ...prev.awards,
          allNBA: { ...prev.awards.allNBA, [team]: next },
        },
      };
    });
    setSavedAt(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
      } else {
        setSavedAt(new Date().toISOString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-[#999]">
        Leave a winner blank or games as 0 (—) to mark a result as not yet decided. Scoring will skip blank fields.
      </p>

      <section className="border-[3px] border-black p-4 space-y-4">
        <h3 className="text-[0.65rem] font-extrabold text-[#999] uppercase tracking-[0.12em] border-b-2 border-black pb-2.5">Round 1</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <ConferenceWinnerInput
            label="Eastern Conference winner"
            value={state.r1.conferenceWinners.east}
            options={eastTeams}
            onChange={(v) => setConferenceWinner("east", v)}
          />
          <ConferenceWinnerInput
            label="Western Conference winner"
            value={state.r1.conferenceWinners.west}
            options={westTeams}
            onChange={(v) => setConferenceWinner("west", v)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {matchups.map((m) => {
            const result = state.r1.series[m.id] ?? { winner: "", games: 0 };
            const teams = [m.high.team, m.low.team].filter(Boolean);
            return (
              <SeriesRow
                key={m.id}
                id={m.id}
                teams={teams}
                result={result}
                onChange={(update) => setSeries("r1", m.id, update)}
              />
            );
          })}
        </div>
      </section>

      <section className="border-[3px] border-black p-4 space-y-4">
        <h3 className="text-[0.65rem] font-extrabold text-[#999] uppercase tracking-[0.12em] border-b-2 border-black pb-2.5">Round 2</h3>
        {round2Matchups.length === 0 ? (
          <p className="text-xs text-[#999]">No Round 2 matchups configured yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {round2Matchups.map((m) => {
              const result = state.r2.series[m.id] ?? { winner: "", games: 0 };
              const teams = [m.teamA, m.teamB].filter(Boolean);
              return (
                <SeriesRow
                  key={m.id}
                  id={m.id}
                  teams={teams}
                  result={result}
                  onChange={(update) => setSeries("r2", m.id, update)}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="border-[3px] border-black p-4 space-y-4">
        <h3 className="text-[0.65rem] font-extrabold text-[#999] uppercase tracking-[0.12em] border-b-2 border-black pb-2.5">Round 3</h3>
        {round3Matchups.length === 0 ? (
          <p className="text-xs text-[#999]">No Round 3 matchups configured yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {round3Matchups.map((m) => {
              const result = state.r3.series[m.id] ?? { winner: "", games: 0 };
              const teams = [m.teamA, m.teamB].filter(Boolean);
              return (
                <SeriesRow
                  key={m.id}
                  id={m.id}
                  teams={teams}
                  result={result}
                  onChange={(update) => setSeries("r3", m.id, update)}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="border-[3px] border-black p-4 space-y-4">
        <h3 className="text-[0.65rem] font-extrabold text-[#999] uppercase tracking-[0.12em] border-b-2 border-black pb-2.5">Finals</h3>
        {finalsMatchups.length === 0 ? (
          <p className="text-xs text-[#999]">No Finals matchup configured yet.</p>
        ) : (
          (() => {
            const m = finalsMatchups[0];
            const teams = [m.teamA, m.teamB].filter(Boolean);
            return (
              <>
                <div className="space-y-2">
                  <h4 className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[#999]">
                    Champion
                  </h4>
                  <SeriesRow
                    id="champion"
                    teams={teams}
                    result={{ winner: state.finals.champion, games: state.finals.championGames }}
                    onChange={(update) => {
                      setState((prev) => ({
                        ...prev,
                        finals: {
                          ...prev.finals,
                          ...(update.winner !== undefined ? { champion: update.winner } : {}),
                          ...(update.games !== undefined ? { championGames: update.games } : {}),
                        },
                      }));
                      setSavedAt(null);
                      setError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[#999]">
                    Game winners
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {GAME_KEYS.map((k) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-[#999] w-8">{k}</span>
                        <select
                          value={state.finals.games[k] ?? ""}
                          onChange={(e) => setFinalsGame(k, e.target.value)}
                          className="flex-1 border-2 border-black rounded-none bg-white px-2 py-1 text-sm font-bold"
                        >
                          <option value="">—</option>
                          {teams.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Finals MVP" value={state.finals.mvp} onChange={(v) => setFinalsAward("mvp", v)} />
                  <TextField label="Points leader" value={state.finals.pointsLeader} onChange={(v) => setFinalsAward("pointsLeader", v)} />
                  <TextField label="Rebounds leader" value={state.finals.reboundsLeader} onChange={(v) => setFinalsAward("reboundsLeader", v)} />
                  <TextField label="Assists leader" value={state.finals.assistsLeader} onChange={(v) => setFinalsAward("assistsLeader", v)} />
                </div>
              </>
            );
          })()
        )}
      </section>

      <section className="border-[3px] border-black p-4 space-y-4">
        <h3 className="text-[0.65rem] font-extrabold text-[#999] uppercase tracking-[0.12em] border-b-2 border-black pb-2.5">Award Winners</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="MVP" value={state.awards.mvp} onChange={(v) => setSingleAward("mvp", v)} />
          <TextField label="Rookie of the Year" value={state.awards.roy} onChange={(v) => setSingleAward("roy", v)} />
          <TextField label="Most Improved Player" value={state.awards.mip} onChange={(v) => setSingleAward("mip", v)} />
          <TextField label="Sixth Man of the Year" value={state.awards.smoy} onChange={(v) => setSingleAward("smoy", v)} />
          <TextField label="Coach of the Year" value={state.awards.coy} onChange={(v) => setSingleAward("coy", v)} />
        </div>

        {(["first", "second", "third"] as const).map((team) => (
          <div key={team} className="space-y-2">
            <h4 className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[#999]">
              All-NBA {team === "first" ? "1st" : team === "second" ? "2nd" : "3rd"} team
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
              {Array.from({ length: TEAM_SIZE }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  value={state.awards.allNBA[team][i] ?? ""}
                  onChange={(e) => setAllNbaPlayer(team, i, e.target.value)}
                  maxLength={60}
                  placeholder={`Player ${i + 1}`}
                  className="border-2 border-black rounded-none bg-white px-2 py-1.5 text-sm font-bold"
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-black text-white px-5 py-2.5 text-[0.72rem] font-extrabold uppercase tracking-[0.06em] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save results"}
        </button>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        {savedAt && (
          <p className="text-sm font-bold text-accent">Saved.</p>
        )}
      </div>
    </div>
  );
}

function ConferenceWinnerInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#999] mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-black rounded-none bg-white px-2 py-1.5 text-sm font-bold"
      >
        <option value="">— not yet decided —</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

function SeriesRow({
  id,
  teams,
  result,
  onChange,
}: {
  id: string;
  teams: string[];
  result: SeriesResult;
  onChange: (update: Partial<SeriesResult>) => void;
}) {
  return (
    <div className="border-2 border-black p-3 space-y-2">
      <div className="text-[0.65rem] font-extrabold text-[#999] uppercase tracking-[0.12em]">{id}</div>
      <label className="block">
        <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#999] mb-1.5">Winner</span>
        <select
          value={result.winner}
          onChange={(e) => onChange({ winner: e.target.value })}
          className="w-full border-2 border-black rounded-none bg-white px-2 py-1.5 text-sm font-bold"
        >
          <option value="">— not yet decided —</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#999] mb-1.5">Games</span>
        <select
          value={result.games}
          onChange={(e) => onChange({ games: Number(e.target.value) })}
          className="w-full border-2 border-black rounded-none bg-white px-2 py-1.5 text-sm font-bold"
        >
          {GAMES_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g === 0 ? "—" : g}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#999] mb-1.5">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={60}
        className="w-full border-2 border-black rounded-none bg-white px-2 py-1.5 text-sm font-bold"
        placeholder="—"
      />
    </label>
  );
}
