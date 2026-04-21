export const dynamic = "force-dynamic";

import bracketData from "@/bracket.json";
import { getMatchups, type BracketConfig } from "@/lib/bracket";
import PicksForm from "./PicksForm";

const bracket = bracketData as BracketConfig;

export default function Home() {
  const matchups = getMatchups(bracket);

  return (
    <main className="max-w-5xl mx-auto py-12 px-4 w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">NBA Playoff Picks — {bracket.season}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pick the winner and series length for each first-round matchup.
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
            <p className="font-medium">Conference winner</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>2 points for picking the conference winner</li>
            </ul>
          </div>
        </div>
      </section>

      <PicksForm matchups={matchups} eastTeams={bracket.east} westTeams={bracket.west} />
    </main>
  );
}
