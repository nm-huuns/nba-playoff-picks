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

      <PicksForm matchups={matchups} />
    </main>
  );
}
