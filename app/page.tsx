export const dynamic = "force-dynamic";

import bracketData from "@/bracket.json";
import {
  getMatchups,
  getRound2Matchups,
  type BracketConfig,
} from "@/lib/bracket";
import { readLockState } from "@/lib/lock";
import PicksTabs from "./PicksTabs";

const bracket = bracketData as BracketConfig;

export default async function Home() {
  const matchups = getMatchups(bracket);
  const round2Matchups = getRound2Matchups(bracket);
  const locks = await readLockState();

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
        </div>
      </section>

      <PicksTabs
        matchups={matchups}
        round2Matchups={round2Matchups}
        eastTeams={bracket.east}
        westTeams={bracket.west}
        locks={locks}
      />
    </main>
  );
}
