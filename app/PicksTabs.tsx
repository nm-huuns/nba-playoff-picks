"use client";

import { useState } from "react";
import type { LockState } from "@/lib/lock";
import type { Matchup, Round2Matchup, Team } from "@/lib/bracket";
import type { LeaderboardEntry } from "@/lib/scoring";
import type { Submission as Round1Submission } from "@/lib/picks";
import type { Round2Submission } from "@/lib/round2";
import type { AwardsSubmission } from "@/lib/awards";
import type { ResultsState } from "@/lib/results";
import PicksForm from "./PicksForm";
import Round2Form from "./Round2Form";
import AwardsForm from "./AwardsForm";
import Leaderboard from "./Leaderboard";
import {
  LockedR1ListView,
  LockedR2ListView,
  LockedAwardsListView,
} from "./LockedSubmissionView";

type TabKey = "r1" | "r2" | "awards" | "scores";

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: "scores", label: "Scores" },
  { key: "r1", label: "Round 1" },
  { key: "r2", label: "Round 2" },
  { key: "awards", label: "Award Winners" },
];

export default function PicksTabs({
  matchups,
  round2Matchups,
  eastTeams,
  westTeams,
  locks,
  leaderboard,
  resultsEntered,
  r1Submissions,
  r2Submissions,
  awardsSubmissions,
  results,
}: {
  matchups: Matchup[];
  round2Matchups: Round2Matchup[];
  eastTeams: Team[];
  westTeams: Team[];
  locks: LockState;
  leaderboard: LeaderboardEntry[];
  resultsEntered: boolean;
  r1Submissions: Round1Submission[];
  r2Submissions: Round2Submission[];
  awardsSubmissions: AwardsSubmission[];
  results: ResultsState;
}) {
  const [active, setActive] = useState<TabKey>("scores");
  const [name, setName] = useState("");

  return (
    <div className="space-y-6">
      {active !== "scores" && !locks[active] && (
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
            placeholder="Name here"
          />
          <p className="text-xs text-gray-500 mt-1">Used across all tabs.</p>
        </div>
      )}

      <nav
        className="flex gap-1 border-b border-gray-200 dark:border-gray-800"
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
                "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors " +
                (selected
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200")
              }
            >
              {t.label}
              {t.key !== "scores" && locks[t.key] && (
                <span className="ml-2 text-xs text-red-600" aria-label="locked">
                  (locked)
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="pt-2"
      >
        {active === "scores" ? (
          <Leaderboard entries={leaderboard} hasResults={resultsEntered} />
        ) : locks[active] ? (
          active === "r1" ? (
            <LockedR1ListView submissions={r1Submissions} r1Results={results.r1} />
          ) : active === "r2" ? (
            <LockedR2ListView submissions={r2Submissions} />
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
        ) : (
          <AwardsForm name={name} />
        )}
      </div>
    </div>
  );
}

