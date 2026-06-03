export const dynamic = "force-dynamic";

import bracketData from "@/bracket.json";
import {
  getFinalsMatchups,
  getMatchups,
  getRound2Matchups,
  getRound3Matchups,
  type BracketConfig,
} from "@/lib/bracket";
import {
  parsePicksFile,
  readPicksRaw,
  FINALS_BLOB_PATHNAME,
  ROUND2_BLOB_PATHNAME,
  ROUND3_BLOB_PATHNAME,
} from "@/lib/picks";
import { parseRound2File } from "@/lib/round2";
import { parseRound3File } from "@/lib/round3";
import { parseFinalsFile } from "@/lib/finals";
import { parseAwardsFile, readAwardsRaw } from "@/lib/awards";
import { readLockState } from "@/lib/lock";
import { readResultsState } from "@/lib/results";
import LockToggle from "./LockToggle";
import ThemeToggle from "../ThemeToggle";
import ResultsForm from "./ResultsForm";
import SubmissionsTabs from "./SubmissionsTabs";

const bracket = bracketData as BracketConfig;

const MAX_ROWS = 20;

export default async function Results() {
  const [r1Raw, r2Raw, r3Raw, finalsRaw, awardsRaw, locks, results] = await Promise.all([
    readPicksRaw().catch(() => ""),
    readPicksRaw(ROUND2_BLOB_PATHNAME).catch(() => ""),
    readPicksRaw(ROUND3_BLOB_PATHNAME).catch(() => ""),
    readPicksRaw(FINALS_BLOB_PATHNAME).catch(() => ""),
    readAwardsRaw().catch(() => ""),
    readLockState(),
    readResultsState(),
  ]);

  const matchups = getMatchups(bracket);
  const round2Matchups = getRound2Matchups(bracket);
  const round3Matchups = getRound3Matchups(bracket);
  const finalsMatchups = getFinalsMatchups(bracket);
  const r1Submissions = parsePicksFile(r1Raw).slice(-MAX_ROWS).reverse();
  const r2Submissions = parseRound2File(r2Raw).slice(-MAX_ROWS).reverse();
  const r3Submissions = parseRound3File(r3Raw).slice(-MAX_ROWS).reverse();
  const finalsSubmissions = parseFinalsFile(finalsRaw).slice(-MAX_ROWS).reverse();
  const awardsSubmissions = parseAwardsFile(awardsRaw).slice(-MAX_ROWS).reverse();

  return (
    <>
      <header className="bg-black px-6 py-5">
        <div className="max-w-[860px] mx-auto flex items-end justify-between">
          <h1 className="text-[2.2rem] font-black leading-none tracking-[-0.05em] text-white">
            Playoff<br />
            <em className="not-italic text-accent">Results.</em>
          </h1>
          <div className="flex flex-col items-end gap-1.5 pb-1">
            <ThemeToggle />
            <div className="text-[0.75rem] font-bold tracking-[0.1em] text-[#555] dark:text-[#999] uppercase">
              {bracket.season} · Admin
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 w-full pb-16">

      <section className="mt-8 mb-8">
        <h2 className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-3">Submission locks</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <LockToggle kind="r1" label="1st Round" initialLocked={locks.r1} />
          <LockToggle kind="r2" label="2nd Round" initialLocked={locks.r2} />
          <LockToggle kind="r3" label="Conf Finals" initialLocked={locks.r3} />
          <LockToggle kind="finals" label="Finals" initialLocked={locks.finals} />
          <LockToggle kind="awards" label="Awards" initialLocked={locks.awards} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-3">Actual results</h2>
        <ResultsForm
          matchups={matchups}
          round2Matchups={round2Matchups}
          round3Matchups={round3Matchups}
          finalsMatchups={finalsMatchups}
          eastTeams={bracket.east.map((t) => t.team).filter(Boolean)}
          westTeams={bracket.west.map((t) => t.team).filter(Boolean)}
          initialState={results}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted mb-4">Recent submissions</h2>
        <SubmissionsTabs
          r1Submissions={r1Submissions}
          r2Submissions={r2Submissions}
          r3Submissions={r3Submissions}
          finalsSubmissions={finalsSubmissions}
          awardsSubmissions={awardsSubmissions}
        />
      </section>
      </main>
    </>
  );
}
