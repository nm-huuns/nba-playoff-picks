export const dynamic = "force-dynamic";

import bracketData from "@/bracket.json";
import { type BracketConfig } from "@/lib/bracket";
import {
  parsePicksFile,
  readPicksRaw,
  ROUND2_BLOB_PATHNAME,
} from "@/lib/picks";
import { parseRound2File, type Round2Submission } from "@/lib/round2";
import {
  parseAwardsFile,
  readAwardsRaw,
  type AwardsSubmission,
} from "@/lib/awards";
import { readLockState } from "@/lib/lock";
import LockToggle from "./LockToggle";

const bracket = bracketData as BracketConfig;

const MAX_ROWS = 20;

export default async function Results() {
  const [r1Raw, r2Raw, awardsRaw, locks] = await Promise.all([
    readPicksRaw().catch(() => ""),
    readPicksRaw(ROUND2_BLOB_PATHNAME).catch(() => ""),
    readAwardsRaw().catch(() => ""),
    readLockState(),
  ]);

  const r1Submissions = parsePicksFile(r1Raw).slice(-MAX_ROWS).reverse();
  const r2Submissions = parseRound2File(r2Raw).slice(-MAX_ROWS).reverse();
  const awardsSubmissions = parseAwardsFile(awardsRaw).slice(-MAX_ROWS).reverse();

  return (
    <main className="max-w-5xl mx-auto py-12 px-4 w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">NBA Playoff Picks — Results ({bracket.season})</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Most recent submissions from everyone who&apos;s picked so far.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Submission locks</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <LockToggle kind="r1" label="Round 1" initialLocked={locks.r1} />
          <LockToggle kind="r2" label="Round 2" initialLocked={locks.r2} />
          <LockToggle kind="awards" label="Award Winners" initialLocked={locks.awards} />
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold">Round 1 — recent submissions</h2>
          <a
            href="/api/picks"
            className="text-xs underline text-gray-500"
            target="_blank"
            rel="noreferrer"
          >
            raw picks.txt
          </a>
        </div>

        {r1Submissions.length === 0 ? (
          <p className="text-sm text-gray-500">No submissions yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {r1Submissions.map((s, i) => (
              <li
                key={`r1-${s.timestamp}-${i}`}
                className="border border-gray-200 dark:border-gray-800 rounded p-3"
              >
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

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Round 2 — recent submissions</h2>

        {r2Submissions.length === 0 ? (
          <p className="text-sm text-gray-500">No Round 2 submissions yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {r2Submissions.map((s, i) => (
              <R2Row key={`r2-${s.timestamp}-${i}`} submission={s} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Award Winners — recent submissions</h2>

        {awardsSubmissions.length === 0 ? (
          <p className="text-sm text-gray-500">No award submissions yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {awardsSubmissions.map((s, i) => (
              <AwardsRow key={`aw-${s.timestamp}-${i}`} submission={s} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function R2Row({ submission }: { submission: Round2Submission }) {
  return (
    <li className="border border-gray-200 dark:border-gray-800 rounded p-3">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span className="font-medium">{submission.name}</span>
        <span className="text-xs text-gray-500 font-mono">{submission.timestamp}</span>
      </div>
      <div className="text-xs text-gray-500 font-mono break-all">
        {submission.picks
          .map((p) => `${p.matchupId}: ${p.winner} in ${p.games}`)
          .join(" · ")}
      </div>
    </li>
  );
}

function AwardsRow({ submission }: { submission: AwardsSubmission }) {
  return (
    <li className="border border-gray-200 dark:border-gray-800 rounded p-3">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span className="font-medium">{submission.name}</span>
        <span className="text-xs text-gray-500 font-mono">{submission.timestamp}</span>
      </div>
      <div className="text-xs mb-1">
        <span className="text-gray-500">MVP:</span> <span className="font-medium">{submission.mvp}</span>
        <span className="text-gray-500"> · ROY:</span>{" "}
        <span className="font-medium">{submission.roy}</span>
      </div>
      <dl className="text-xs text-gray-500 space-y-0.5">
        <div>
          <dt className="inline font-medium text-gray-700 dark:text-gray-300">1st team: </dt>
          <dd className="inline">{submission.allNBA.first.join(", ")}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-700 dark:text-gray-300">2nd team: </dt>
          <dd className="inline">{submission.allNBA.second.join(", ")}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-700 dark:text-gray-300">3rd team: </dt>
          <dd className="inline">{submission.allNBA.third.join(", ")}</dd>
        </div>
      </dl>
    </li>
  );
}
