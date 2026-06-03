"use client";

import { useState } from "react";
import type { LockState } from "@/lib/lock";
import type {
  FinalsMatchup,
  Matchup,
  Round2Matchup,
  Round3Matchup,
  Team,
} from "@/lib/bracket";
import type { LeaderboardEntry } from "@/lib/scoring";
import type { Submission as Round1Submission } from "@/lib/picks";
import type { Round2Submission } from "@/lib/round2";
import type { Round3Submission } from "@/lib/round3";
import type { FinalsSubmission } from "@/lib/finals";
import type { AwardsSubmission } from "@/lib/awards";
import type { ResultsState } from "@/lib/results";
import PicksForm from "./PicksForm";
import Round2Form from "./Round2Form";
import Round3Form from "./Round3Form";
import FinalsForm from "./FinalsForm";
import AwardsForm from "./AwardsForm";
import Leaderboard from "./Leaderboard";
import {
  LockedR1ListView,
  LockedR2ListView,
  LockedR3ListView,
  LockedFinalsListView,
  LockedAwardsListView,
} from "./LockedSubmissionView";

type TabKey = "r1" | "r2" | "r3" | "finals" | "awards" | "scores";

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: "scores", label: "Points" },
  { key: "finals", label: "Finals" },
  { key: "awards", label: "Awards" },
  { key: "r3", label: "Conference Finals" },
  { key: "r2", label: "2nd Round" },
  { key: "r1", label: "1st Round" },
];

export default function PicksTabs({
  matchups,
  round2Matchups,
  round3Matchups,
  finalsMatchups,
  eastTeams,
  westTeams,
  locks,
  leaderboard,
  resultsEntered,
  r1Submissions,
  r2Submissions,
  r3Submissions,
  finalsSubmissions,
  awardsSubmissions,
  results,
}: {
  matchups: Matchup[];
  round2Matchups: Round2Matchup[];
  round3Matchups: Round3Matchup[];
  finalsMatchups: FinalsMatchup[];
  eastTeams: Team[];
  westTeams: Team[];
  locks: LockState;
  leaderboard: LeaderboardEntry[];
  resultsEntered: boolean;
  r1Submissions: Round1Submission[];
  r2Submissions: Round2Submission[];
  r3Submissions: Round3Submission[];
  finalsSubmissions: FinalsSubmission[];
  awardsSubmissions: AwardsSubmission[];
  results: ResultsState;
}) {
  const [active, setActive] = useState<TabKey>("scores");
  const [name, setName] = useState("");

  return (
    <div>
      <nav
        className="flex border-b-4 border-black"
        role="tablist"
        aria-label="Picks sections"
      >
        {TABS.map((t) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              onClick={() => setActive(t.key)}
              className={
                "px-[18px] py-3 text-[0.72rem] font-extrabold uppercase tracking-[0.06em] border-b-4 -mb-1 transition-colors " +
                (selected
                  ? "border-accent text-black"
                  : "border-transparent text-[#999] hover:text-black")
              }
            >
              {t.label}
              {t.key !== "scores" && locks[t.key] && (
                <span className="ml-1.5 text-[0.6rem] font-extrabold text-accent uppercase tracking-[0.06em]" aria-label="locked">
                  locked
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {active !== "scores" && !locks[active] && (
        <div className="pt-8 pb-4">
          <label className="block text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#999] mb-2" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            required
            className="w-full sm:w-64 border-2 border-black rounded-none bg-white px-3 py-2 text-sm font-bold"
            placeholder="Name here"
          />
        </div>
      )}

      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="pt-8"
      >
        {active === "scores" ? (
          <Leaderboard entries={leaderboard} hasResults={resultsEntered} />
        ) : locks[active] ? (
          active === "r1" ? (
            <LockedR1ListView submissions={r1Submissions} r1Results={results.r1} />
          ) : active === "r2" ? (
            <LockedR2ListView submissions={r2Submissions} r2Results={results.r2} />
          ) : active === "r3" ? (
            <LockedR3ListView submissions={r3Submissions} r3Results={results.r3} />
          ) : active === "finals" ? (
            <LockedFinalsListView
              submissions={finalsSubmissions}
              finalsResults={results.finals}
            />
          ) : (
            <LockedAwardsListView
              submissions={awardsSubmissions}
              awardsResults={results.awards}
            />
          )
        ) : active === "r1" ? (
          <PicksForm
            name={name}
            matchups={matchups}
            eastTeams={eastTeams}
            westTeams={westTeams}
          />
        ) : active === "r2" ? (
          <Round2Form name={name} matchups={round2Matchups} />
        ) : active === "r3" ? (
          <Round3Form name={name} matchups={round3Matchups} />
        ) : active === "finals" ? (
          <FinalsForm name={name} matchups={finalsMatchups} />
        ) : (
          <AwardsForm name={name} />
        )}
      </div>
    </div>
  );
}

