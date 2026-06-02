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
import { parseRound2File, type Round2Submission } from "@/lib/round2";
import { parseRound3File, type Round3Submission } from "@/lib/round3";
import { parseFinalsFile, GAME_KEYS, type FinalsSubmission } from "@/lib/finals";
import {
  parseAwardsFile,
  readAwardsRaw,
  type AwardsSubmission,
} from "@/lib/awards";
import { readLockState } from "@/lib/lock";
import { readResultsState } from "@/lib/results";
import LockToggle from "./LockToggle";
import ResultsForm from "./ResultsForm";

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
    <main className="max-w-5xl mx-auto py-12 px-4 w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">NBA Playoff Picks — Results ({bracket.season})</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Most recent submissions from everyone who&apos;s picked so far.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Submission locks</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <LockToggle kind="r1" label="Round 1" initialLocked={locks.r1} />
          <LockToggle kind="r2" label="Round 2" initialLocked={locks.r2} />
          <LockToggle kind="r3" label="Round 3" initialLocked={locks.r3} />
          <LockToggle kind="finals" label="Finals" initialLocked={locks.finals} />
          <LockToggle kind="awards" label="Award Winners" initialLocked={locks.awards} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-semibold mb-3">Actual results (admin)</h2>
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
                <PickGrid
                  east={s.picks.filter((p) => p.seriesId.startsWith("E-")).map((p) => ({ id: p.seriesId, winner: p.winner, games: p.games }))}
                  west={s.picks.filter((p) => p.seriesId.startsWith("W-")).map((p) => ({ id: p.seriesId, winner: p.winner, games: p.games }))}
                />
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

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Round 3 — recent submissions</h2>

        {r3Submissions.length === 0 ? (
          <p className="text-sm text-gray-500">No Round 3 submissions yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {r3Submissions.map((s, i) => (
              <R3Row key={`r3-${s.timestamp}-${i}`} submission={s} />
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Finals — recent submissions</h2>

        {finalsSubmissions.length === 0 ? (
          <p className="text-sm text-gray-500">No Finals submissions yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {finalsSubmissions.map((s, i) => (
              <FinalsRow key={`finals-${s.timestamp}-${i}`} submission={s} />
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
      <PickGrid
        east={submission.picks.filter((p) => p.matchupId.startsWith("E-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
        west={submission.picks.filter((p) => p.matchupId.startsWith("W-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
      />
    </li>
  );
}

function R3Row({ submission }: { submission: Round3Submission }) {
  return (
    <li className="border border-gray-200 dark:border-gray-800 rounded p-3">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span className="font-medium">{submission.name}</span>
        <span className="text-xs text-gray-500 font-mono">{submission.timestamp}</span>
      </div>
      <PickGrid
        east={submission.picks.filter((p) => p.matchupId.startsWith("E-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
        west={submission.picks.filter((p) => p.matchupId.startsWith("W-")).map((p) => ({ id: p.matchupId, winner: p.winner, games: p.games }))}
      />
    </li>
  );
}

function FinalsRow({ submission }: { submission: FinalsSubmission }) {
  const gamesPicked = GAME_KEYS.filter((k) => submission.games[k]);
  return (
    <li className="border border-gray-200 dark:border-gray-800 rounded p-3">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span className="font-medium">{submission.name}</span>
        <span className="text-xs text-gray-500 font-mono">{submission.timestamp}</span>
      </div>
      <div className="text-xs mb-1">
        <span className="text-gray-500">Games — </span>
        {gamesPicked.length === 0
          ? "—"
          : gamesPicked.map((k) => `${k}: ${submission.games[k]}`).join(" · ")}
      </div>
      <div className="text-xs">
        <span className="text-gray-500">MVP:</span>{" "}
        <span className="font-medium">{submission.mvp || "—"}</span>
        <span className="text-gray-500"> · Pts:</span>{" "}
        <span className="font-medium">{submission.pointsLeader || "—"}</span>
        <span className="text-gray-500"> · Reb:</span>{" "}
        <span className="font-medium">{submission.reboundsLeader || "—"}</span>
        <span className="text-gray-500"> · Ast:</span>{" "}
        <span className="font-medium">{submission.assistsLeader || "—"}</span>
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
        <span className="text-gray-500">MVP:</span>{" "}
        <span className="font-medium">{submission.mvp}</span>
        <span className="text-gray-500"> · ROY:</span>{" "}
        <span className="font-medium">{submission.roy}</span>
        <span className="text-gray-500"> · MIP:</span>{" "}
        <span className="font-medium">{submission.mip || "—"}</span>
        <span className="text-gray-500"> · 6MOY:</span>{" "}
        <span className="font-medium">{submission.smoy || "—"}</span>
        <span className="text-gray-500"> · COY:</span>{" "}
        <span className="font-medium">{submission.coy || "—"}</span>
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
      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </div>
      <ul className="space-y-0.5">
        {picks.map((p) => (
          <li key={p.id} className="flex items-baseline gap-2">
            <span className="font-mono text-gray-500 w-16 shrink-0">{p.id}</span>
            <span className="font-medium">{p.winner}</span>
            <span className="text-gray-500">in {p.games}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
