"use client";

import { useState } from "react";
import type { Submission as Round1Submission } from "@/lib/picks";
import type { Round2Submission } from "@/lib/round2";
import type { Round3Submission } from "@/lib/round3";
import type { FinalsSubmission } from "@/lib/finals";
import { GAME_KEYS } from "@/lib/finals";
import type { AwardsSubmission } from "@/lib/awards";

type TabKey = "r1" | "r2" | "r3" | "finals" | "awards";

const TABS: { key: TabKey; label: string }[] = [
  { key: "r1", label: "1st Round" },
  { key: "r2", label: "2nd Round" },
  { key: "r3", label: "Conf Finals" },
  { key: "finals", label: "Finals" },
  { key: "awards", label: "Awards" },
];

export default function SubmissionsTabs({
  r1Submissions,
  r2Submissions,
  r3Submissions,
  finalsSubmissions,
  awardsSubmissions,
}: {
  r1Submissions: Round1Submission[];
  r2Submissions: Round2Submission[];
  r3Submissions: Round3Submission[];
  finalsSubmissions: FinalsSubmission[];
  awardsSubmissions: AwardsSubmission[];
}) {
  const [active, setActive] = useState<TabKey>("r1");

  return (
    <div>
      <nav className="flex border-b-4 border-black dark:border-white" role="tablist" aria-label="Submissions by round">
        {TABS.map((t) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`sub-panel-${t.key}`}
              id={`sub-tab-${t.key}`}
              onClick={() => setActive(t.key)}
              className={
                "px-[18px] py-3 text-[0.72rem] font-extrabold uppercase tracking-[0.06em] border-b-4 -mb-1 transition-colors " +
                (selected
                  ? "border-accent text-black dark:text-white"
                  : "border-transparent text-muted hover:text-black dark:hover:text-white")
              }
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div
        role="tabpanel"
        id={`sub-panel-${active}`}
        aria-labelledby={`sub-tab-${active}`}
        className="pt-8"
      >
        {active === "r1" && (
          <R1Panel submissions={r1Submissions} />
        )}
        {active === "r2" && (
          <PicksPanel
            submissions={r2Submissions}
            empty="No Round 2 submissions yet."
            renderRow={(s, i) => (
              <PickGridRow
                key={`r2-${s.timestamp}-${i}`}
                name={s.name}
                timestamp={s.timestamp}
                east={s.picks.filter((p) => p.matchupId.startsWith("E-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
                west={s.picks.filter((p) => p.matchupId.startsWith("W-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
              />
            )}
          />
        )}
        {active === "r3" && (
          <PicksPanel
            submissions={r3Submissions}
            empty="No Conference Finals submissions yet."
            renderRow={(s, i) => (
              <PickGridRow
                key={`r3-${s.timestamp}-${i}`}
                name={s.name}
                timestamp={s.timestamp}
                east={s.picks.filter((p) => p.matchupId.startsWith("E-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
                west={s.picks.filter((p) => p.matchupId.startsWith("W-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
              />
            )}
          />
        )}
        {active === "finals" && (
          <PicksPanel
            submissions={finalsSubmissions}
            empty="No Finals submissions yet."
            renderRow={(s, i) => <FinalsRow key={`finals-${s.timestamp}-${i}`} submission={s} />}
          />
        )}
        {active === "awards" && (
          <PicksPanel
            submissions={awardsSubmissions}
            empty="No award submissions yet."
            renderRow={(s, i) => <AwardsRow key={`aw-${s.timestamp}-${i}`} submission={s} />}
          />
        )}
      </div>
    </div>
  );
}

function R1Panel({ submissions }: { submissions: Round1Submission[] }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted">
          {submissions.length} {submissions.length === 1 ? "submission" : "submissions"}
        </span>
        <a
          href="/api/picks"
          className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-muted underline"
          target="_blank"
          rel="noreferrer"
        >
          raw picks.txt
        </a>
      </div>
      {submissions.length === 0 ? (
        <p className="text-sm text-muted">No submissions yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {submissions.map((s, i) => (
            <li key={`r1-${s.timestamp}-${i}`} className="border-[3px] border-black p-3">
              <div className="flex items-baseline justify-between gap-4 border-b-2 border-black pb-2 mb-2">
                <span className="font-black text-sm">{s.name}</span>
                <span className="text-xs text-muted font-mono">{s.timestamp}</span>
              </div>
              {s.conferenceWinners && (
                <div className="text-xs mb-2">
                  <span className="text-muted">Conference winners — </span>
                  <span className="font-extrabold">East:</span> {s.conferenceWinners.east}
                  <span className="text-muted"> · </span>
                  <span className="font-extrabold">West:</span> {s.conferenceWinners.west}
                </div>
              )}
              <PickGrid
                east={s.picks.filter((p) => p.seriesId.startsWith("E-")).map((p) => ({ id: p.seriesId, winner: p.winner, games: p.games }))}
                west={s.picks.filter((p) => p.seriesId.startsWith("W-")).map((p) => ({ id: p.seriesId, winner: p.winner, games: p.games }))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PicksPanel<T>({
  submissions,
  empty,
  renderRow,
}: {
  submissions: T[];
  empty: string;
  renderRow: (s: T, i: number) => React.ReactNode;
}) {
  if (submissions.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="space-y-3 text-sm">
      {submissions.map((s, i) => renderRow(s, i))}
    </ul>
  );
}

function PickGridRow({
  name,
  timestamp,
  east,
  west,
}: {
  name: string;
  timestamp: string;
  east: { id: string; winner: string; games: number }[];
  west: { id: string; winner: string; games: number }[];
}) {
  return (
    <li className="border-[3px] border-black p-3 dark:border-[#2a2a2a]">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-black pb-2 mb-2 dark:border-[#2a2a2a]">
        <span className="font-black text-sm">{name}</span>
        <span className="text-xs text-muted font-mono">{timestamp}</span>
      </div>
      <PickGrid east={east} west={west} />
    </li>
  );
}

function FinalsRow({ submission }: { submission: FinalsSubmission }) {
  const gamesPicked = GAME_KEYS.filter((k) => submission.games[k]);
  return (
    <li className="border-[3px] border-black p-3 dark:border-[#2a2a2a]">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-black pb-2 mb-2 dark:border-[#2a2a2a]">
        <span className="font-black text-sm">{submission.name}</span>
        <span className="text-xs text-muted font-mono">{submission.timestamp}</span>
      </div>
      {submission.champion && (
        <div className="text-xs mb-1">
          <span className="text-muted">Champion — </span>
          <span className="font-extrabold">{submission.champion}</span>
          {submission.championGames > 0 && (
            <span className="text-muted"> in {submission.championGames}</span>
          )}
        </div>
      )}
      <div className="text-xs mb-1">
        <span className="text-muted">Games — </span>
        {gamesPicked.length === 0
          ? "—"
          : gamesPicked.map((k) => `${k}: ${submission.games[k]}`).join(" · ")}
      </div>
      <div className="text-xs">
        <span className="text-muted">MVP:</span>{" "}
        <span className="font-extrabold">{submission.mvp || "—"}</span>
        <span className="text-muted"> · Pts:</span>{" "}
        <span className="font-extrabold">{submission.pointsLeader || "—"}</span>
        <span className="text-muted"> · Reb:</span>{" "}
        <span className="font-extrabold">{submission.reboundsLeader || "—"}</span>
        <span className="text-muted"> · Ast:</span>{" "}
        <span className="font-extrabold">{submission.assistsLeader || "—"}</span>
      </div>
    </li>
  );
}

function AwardsRow({ submission }: { submission: AwardsSubmission }) {
  return (
    <li className="border-[3px] border-black p-3 dark:border-[#2a2a2a]">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-black pb-2 mb-2 dark:border-[#2a2a2a]">
        <span className="font-black text-sm">{submission.name}</span>
        <span className="text-xs text-muted font-mono">{submission.timestamp}</span>
      </div>
      <div className="text-xs mb-1">
        <span className="text-muted">MVP:</span>{" "}
        <span className="font-extrabold">{submission.mvp}</span>
        <span className="text-muted"> · ROY:</span>{" "}
        <span className="font-extrabold">{submission.roy}</span>
        <span className="text-muted"> · MIP:</span>{" "}
        <span className="font-extrabold">{submission.mip || "—"}</span>
        <span className="text-muted"> · 6MOY:</span>{" "}
        <span className="font-extrabold">{submission.smoy || "—"}</span>
        <span className="text-muted"> · COY:</span>{" "}
        <span className="font-extrabold">{submission.coy || "—"}</span>
      </div>
      <dl className="text-xs text-muted space-y-0.5">
        <div>
          <dt className="inline font-extrabold text-black dark:text-white">1st team: </dt>
          <dd className="inline">{submission.allNBA.first.join(", ")}</dd>
        </div>
        <div>
          <dt className="inline font-extrabold text-black dark:text-white">2nd team: </dt>
          <dd className="inline">{submission.allNBA.second.join(", ")}</dd>
        </div>
        <div>
          <dt className="inline font-extrabold text-black dark:text-white">3rd team: </dt>
          <dd className="inline">{submission.allNBA.third.join(", ")}</dd>
        </div>
      </dl>
    </li>
  );
}

function PickGrid({
  east,
  west,
}: {
  east: { id: string; winner: string; games: number }[];
  west: { id: string; winner: string; games: number }[];
}) {
  return (
    <div className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      <PickColumn label="East" picks={east} />
      <PickColumn label="West" picks={west} />
    </div>
  );
}

function PickColumn({
  label,
  picks,
}: {
  label: string;
  picks: { id: string; winner: string; games: number }[];
}) {
  return (
    <div>
      <div className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-muted mb-1">
        {label}
      </div>
      <ul className="space-y-0.5">
        {picks.map((p) => (
          <li key={p.id} className="flex items-baseline gap-2">
            <span className="font-mono text-muted w-16 shrink-0">{p.id}</span>
            <span className="font-extrabold">{p.winner}</span>
            <span className="text-muted">in {p.games}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
