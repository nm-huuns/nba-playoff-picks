"use client";

import { useState } from "react";
import type { LockState } from "@/lib/lock";
import type { Matchup, Round2Matchup, Team } from "@/lib/bracket";
import PicksForm from "./PicksForm";
import Round2Form from "./Round2Form";
import AwardsForm from "./AwardsForm";

type TabKey = "r1" | "r2" | "awards";

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
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
}: {
  matchups: Matchup[];
  round2Matchups: Round2Matchup[];
  eastTeams: Team[];
  westTeams: Team[];
  locks: LockState;
}) {
  const [active, setActive] = useState<TabKey>("r1");
  const [name, setName] = useState("");
  const isLocked = locks[active];

  return (
    <div className="space-y-6">
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
              {locks[t.key] && (
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
        {isLocked ? (
          <LockedBanner tab={active} />
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

function LockedBanner({ tab }: { tab: TabKey }) {
  const label =
    tab === "r1" ? "Round 1" : tab === "r2" ? "Round 2" : "Award Winners";
  return (
    <div className="rounded border border-red-500/60 bg-red-50 dark:bg-red-950/30 px-4 py-4 text-sm">
      <p className="font-medium mb-1">{label} picks are locked</p>
      <p className="text-gray-600 dark:text-gray-400">
        Submissions for this section are closed. Check back when it re-opens.
      </p>
    </div>
  );
}
