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
    <main className="max-w-5xl mx-auto py-12 px-4 w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">NBA Playoff Picks — {bracket.season}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pick your playoff series winners, series length, and regular-season award winners.
        </p>
      </header>

      <section className="mb-8 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4">
        <h2 className="text-base font-semibold mb-2">Scoring rules</h2>
        <div className="text-sm space-y-3 text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-medium">Playoff rounds</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>1 point for picking the correct series winner</li>
              <li>2 extra points for picking the correct number of games</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Conference winner (Round 1 only)</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>2 points for picking the conference winner</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Award winners</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>1 point each for MVP, Rookie of the Year, Most Improved Player, Sixth Man of the Year, and Coach of the Year</li>
              <li>1 point per player placed on the correct All-NBA team (1st, 2nd, or 3rd)</li>
            </ul>
          </div>
        </div>
      </section>

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
  );
}
