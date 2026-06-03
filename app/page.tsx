export const dynamic = "force-dynamic";

import bracketData from "@/bracket.json";
import {
  getFinalsMatchups,
  getMatchups,
  getRound2Matchups,
  getRound3Matchups,
  type BracketConfig,
} from "@/lib/bracket";
import { readLockState } from "@/lib/lock";
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
import { readResultsState } from "@/lib/results";
import { buildLeaderboard } from "@/lib/scoring";
import PicksTabs from "./PicksTabs";
import ThemeToggle from "./ThemeToggle";

const bracket = bracketData as BracketConfig;

function hasAnyResults(results: Awaited<ReturnType<typeof readResultsState>>): boolean {
  if (results.r1.conferenceWinners.east || results.r1.conferenceWinners.west) return true;
  for (const s of Object.values(results.r1.series)) if (s.winner) return true;
  for (const s of Object.values(results.r2.series)) if (s.winner) return true;
  const a = results.awards;
  if (a.mvp || a.roy || a.mip || a.smoy || a.coy) return true;
  for (const team of [a.allNBA.first, a.allNBA.second, a.allNBA.third]) {
    if (team.some((p) => p)) return true;
  }
  return false;
}

export default async function Home() {
  const matchups = getMatchups(bracket);
  const round2Matchups = getRound2Matchups(bracket);
  const round3Matchups = getRound3Matchups(bracket);
  const finalsMatchups = getFinalsMatchups(bracket);
  const [locks, r1Raw, r2Raw, r3Raw, finalsRaw, awardsRaw, results] = await Promise.all([
    readLockState(),
    readPicksRaw().catch(() => ""),
    readPicksRaw(ROUND2_BLOB_PATHNAME).catch(() => ""),
    readPicksRaw(ROUND3_BLOB_PATHNAME).catch(() => ""),
    readPicksRaw(FINALS_BLOB_PATHNAME).catch(() => ""),
    readAwardsRaw().catch(() => ""),
    readResultsState(),
  ]);

  const r1Submissions = parsePicksFile(r1Raw);
  const r2Submissions = parseRound2File(r2Raw);
  const r3Submissions = parseRound3File(r3Raw);
  const finalsSubmissions = parseFinalsFile(finalsRaw);
  const awardsSubmissions = parseAwardsFile(awardsRaw);
  const leaderboard = buildLeaderboard({
    r1: r1Submissions,
    r2: r2Submissions,
    r3: r3Submissions,
    finals: finalsSubmissions,
    awards: awardsSubmissions,
    results,
  });
  const resultsEntered = hasAnyResults(results);

  return (
    <>
      <header className="bg-black px-6 py-5">
        <div className="max-w-[860px] mx-auto flex items-end justify-between">
          <h1 className="text-[2.2rem] font-black leading-none tracking-[-0.05em] text-white">
            Playoff<br />
            <em className="not-italic text-accent">Picks.</em>
          </h1>
          <div className="flex items-end gap-4">
            <div className="text-[0.75rem] font-bold tracking-[0.1em] text-[#555] uppercase pb-1">
              {bracket.season} Season
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 w-full pb-16">
        <PicksTabs
          matchups={matchups}
          round2Matchups={round2Matchups}
          round3Matchups={round3Matchups}
          finalsMatchups={finalsMatchups}
          eastTeams={bracket.east}
          westTeams={bracket.west}
          locks={locks}
          leaderboard={leaderboard}
          resultsEntered={resultsEntered}
          r1Submissions={r1Submissions}
          r2Submissions={r2Submissions}
          r3Submissions={r3Submissions}
          finalsSubmissions={finalsSubmissions}
          awardsSubmissions={awardsSubmissions}
          results={results}
        />
      </main>
    </>
  );
}
