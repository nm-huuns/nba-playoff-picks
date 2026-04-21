export const dynamic = "force-dynamic";

import bracketData from "@/bracket.json";
import { type BracketConfig } from "@/lib/bracket";
import { parsePicksFile, readPicksRaw } from "@/lib/picks";
import { readLockState } from "@/lib/lock";
import LockToggle from "./LockToggle";

const bracket = bracketData as BracketConfig;

export default async function Results() {
  const [raw, { locked }] = await Promise.all([
    readPicksRaw().catch(() => ""),
    readLockState(),
  ]);
  const submissions = parsePicksFile(raw).slice(-20).reverse();

  return (
    <main className="max-w-5xl mx-auto py-12 px-4 w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">NBA Playoff Picks — Results ({bracket.season})</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Most recent submissions from everyone who&apos;s picked so far.
        </p>
      </header>

      <LockToggle initialLocked={locked} />

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent submissions</h2>
          <a href="/api/picks" className="text-xs underline text-gray-500" target="_blank" rel="noreferrer">
            raw picks.txt
          </a>
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-gray-500">No submissions yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {submissions.map((s, i) => (
              <li key={`${s.timestamp}-${i}`} className="border border-gray-200 dark:border-gray-800 rounded p-3">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{s.timestamp}</span>
                </div>
                {s.conferenceWinners && (
                  <div className="text-xs mb-2">
                    <span className="text-gray-500">Conference winners — </span>
                    <span className="font-medium">East:</span> {s.conferenceWinners.east}
                    <span className="text-gray-500"> · </span>
                    <span className="font-medium">West:</span> {s.conferenceWinners.west}
                  </div>
                )}
                <div className="text-xs text-gray-500 font-mono break-all">
                  {s.picks.map((p) => `${p.seriesId}: ${p.winner} in ${p.games}`).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
