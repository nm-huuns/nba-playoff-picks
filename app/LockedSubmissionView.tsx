import type { Submission as Round1Submission } from "@/lib/picks";
import type { Round2Submission } from "@/lib/round2";
import type { Round3Submission } from "@/lib/round3";
import type { FinalsSubmission } from "@/lib/finals";
import type { AwardsSubmission } from "@/lib/awards";
import type { ResultsState } from "@/lib/results";

type Section = "r1" | "r2" | "r3" | "finals" | "awards";

const SECTION_LABEL: Record<Section, string> = {
  r1: "Round 1",
  r2: "Round 2",
  r3: "Round 3",
  finals: "Finals",
  awards: "Award Winners",
};

const GREY = "text-gray-500 dark:text-gray-500";
const GREY_HEADING = "text-gray-600 dark:text-gray-400";
const CORRECT = "font-bold text-gray-900 dark:text-gray-100";

function pluralPts(n: number): string {
  return `${n} ${n === 1 ? "pt" : "pts"}`;
}

export function LockedR1ListView({
  submissions,
  r1Results,
}: {
  submissions: Round1Submission[];
  r1Results: ResultsState["r1"];
}) {
  const latest = latestByName(submissions);
  if (latest.length === 0) return <EmptyBanner section="r1" />;
  return (
    <ListWrapper section="r1" count={latest.length}>
      {latest.map((sub) => (
        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
          {sub.conferenceWinners && (
            <div className={`text-sm ${GREY}`}>
              <span className={GREY_HEADING}>Conference winners — </span>
              <ConfWinnerSpan
                side="East"
                pick={sub.conferenceWinners.east}
                actual={r1Results.conferenceWinners.east}
              />
              <span className="mx-2">·</span>
              <ConfWinnerSpan
                side="West"
                pick={sub.conferenceWinners.west}
                actual={r1Results.conferenceWinners.west}
              />
            </div>
          )}
          <ul className={`mt-2 space-y-1 text-sm ${GREY}`}>
            {sub.picks.map((p) => {
              const actual = r1Results.series[p.seriesId];
              const hasResult = !!(actual && actual.winner);
              const winnerCorrect = hasResult && p.winner === actual.winner;
              const gamesCorrect =
                winnerCorrect && actual.games !== 0 && p.games === actual.games;
              const points = (winnerCorrect ? 1 : 0) + (gamesCorrect ? 2 : 0);
              return (
                <li key={p.seriesId}>
                  <span className="font-mono">{p.seriesId}</span>
                  <span className="mx-2">·</span>
                  <span className={winnerCorrect ? CORRECT : ""}>{p.winner}</span>
                  <span className="mx-2">·</span>
                  <span className={gamesCorrect ? CORRECT : ""}>{p.games} games</span>
                  {hasResult && <span> ({pluralPts(points)})</span>}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </ListWrapper>
  );
}

function ConfWinnerSpan({
  side,
  pick,
  actual,
}: {
  side: "East" | "West";
  pick: string;
  actual: string;
}) {
  const hasResult = actual.length > 0;
  const correct = hasResult && pick === actual;
  const points = correct ? 2 : 0;
  return (
    <>
      <span className={GREY_HEADING}>{side}: </span>
      <span className={correct ? CORRECT : ""}>{pick}</span>
      {hasResult && <span> ({pluralPts(points)})</span>}
    </>
  );
}

export function LockedR2ListView({
  submissions,
  r2Results,
}: {
  submissions: Round2Submission[];
  r2Results: ResultsState["r2"];
}) {
  const latest = latestByName(submissions);
  if (latest.length === 0) return <EmptyBanner section="r2" />;
  return (
    <ListWrapper section="r2" count={latest.length}>
      {latest.map((sub) => (
        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
          <ul className={`space-y-1 text-sm ${GREY}`}>
            {sub.picks.map((p) => {
              const actual = r2Results.series[p.matchupId];
              const hasResult = !!(actual && actual.winner);
              const winnerCorrect = hasResult && p.winner === actual.winner;
              const gamesCorrect =
                winnerCorrect && actual.games !== 0 && p.games === actual.games;
              const points = (winnerCorrect ? 1 : 0) + (gamesCorrect ? 2 : 0);
              return (
                <li key={p.matchupId}>
                  <span className="font-mono">{p.matchupId}</span>
                  <span className="mx-2">·</span>
                  <span className={winnerCorrect ? CORRECT : ""}>{p.winner}</span>
                  <span className="mx-2">·</span>
                  <span className={gamesCorrect ? CORRECT : ""}>{p.games} games</span>
                  {hasResult && <span> ({pluralPts(points)})</span>}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </ListWrapper>
  );
}

export function LockedR3ListView({
  submissions,
  r3Results,
}: {
  submissions: Round3Submission[];
  r3Results: ResultsState["r3"];
}) {
  const latest = latestByName(submissions);
  if (latest.length === 0) return <EmptyBanner section="r3" />;
  return (
    <ListWrapper section="r3" count={latest.length}>
      {latest.map((sub) => (
        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
          <ul className={`space-y-1 text-sm ${GREY}`}>
            {sub.picks.map((p) => {
              const actual = r3Results.series[p.matchupId];
              const hasResult = !!(actual && actual.winner);
              const winnerCorrect = hasResult && p.winner === actual.winner;
              const gamesCorrect =
                winnerCorrect && actual.games !== 0 && p.games === actual.games;
              const points = (winnerCorrect ? 1 : 0) + (gamesCorrect ? 2 : 0);
              return (
                <li key={p.matchupId}>
                  <span className="font-mono">{p.matchupId}</span>
                  <span className="mx-2">·</span>
                  <span className={winnerCorrect ? CORRECT : ""}>{p.winner}</span>
                  <span className="mx-2">·</span>
                  <span className={gamesCorrect ? CORRECT : ""}>{p.games} games</span>
                  {hasResult && <span> ({pluralPts(points)})</span>}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </ListWrapper>
  );
}

export function LockedFinalsListView({
  submissions,
  finalsResults,
}: {
  submissions: FinalsSubmission[];
  finalsResults: ResultsState["finals"];
}) {
  const latest = latestByName(submissions);
  if (latest.length === 0) return <EmptyBanner section="finals" />;
  return (
    <ListWrapper section="finals" count={latest.length}>
      {latest.map((sub) => (
        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
          <ul className={`space-y-1 text-sm ${GREY}`}>
            {sub.picks.map((p) => {
              const actual = finalsResults.series[p.matchupId];
              const hasResult = !!(actual && actual.winner);
              const winnerCorrect = hasResult && p.winner === actual.winner;
              const gamesCorrect =
                winnerCorrect && actual.games !== 0 && p.games === actual.games;
              const points = (winnerCorrect ? 1 : 0) + (gamesCorrect ? 2 : 0);
              return (
                <li key={p.matchupId}>
                  <span className="font-mono">{p.matchupId}</span>
                  <span className="mx-2">·</span>
                  <span className={winnerCorrect ? CORRECT : ""}>{p.winner}</span>
                  <span className="mx-2">·</span>
                  <span className={gamesCorrect ? CORRECT : ""}>{p.games} games</span>
                  {hasResult && <span> ({pluralPts(points)})</span>}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </ListWrapper>
  );
}

export function LockedAwardsListView({
  submissions,
  awardsResults,
}: {
  submissions: AwardsSubmission[];
  awardsResults: ResultsState["awards"];
}) {
  const latest = latestByName(submissions);
  if (latest.length === 0) return <EmptyBanner section="awards" />;
  return (
    <ListWrapper section="awards" count={latest.length}>
      {latest.map((sub) => (
        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
          <dl className={`grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 ${GREY}`}>
            <Row label="MVP" value={sub.mvp} actual={awardsResults.mvp} />
            <Row label="Rookie of the Year" value={sub.roy} actual={awardsResults.roy} />
            <Row label="Most Improved Player" value={sub.mip} actual={awardsResults.mip} />
            <Row label="Sixth Man of the Year" value={sub.smoy} actual={awardsResults.smoy} />
            <Row label="Coach of the Year" value={sub.coy} actual={awardsResults.coy} />
          </dl>
          <div className={`mt-3 space-y-1 text-sm ${GREY}`}>
            <TeamRow label="All-NBA 1st team" players={sub.allNBA.first} actual={awardsResults.allNBA.first} />
            <TeamRow label="All-NBA 2nd team" players={sub.allNBA.second} actual={awardsResults.allNBA.second} />
            <TeamRow label="All-NBA 3rd team" players={sub.allNBA.third} actual={awardsResults.allNBA.third} />
          </div>
        </Card>
      ))}
    </ListWrapper>
  );
}

function ListWrapper({
  section,
  count,
  children,
}: {
  section: Section;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className={`text-xs uppercase tracking-wide font-medium ${GREY_HEADING}`}>
        {SECTION_LABEL[section]} picks (locked) — {count} {count === 1 ? "submission" : "submissions"}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Card({
  name,
  timestamp,
  children,
}: {
  name: string;
  timestamp: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span className={`font-medium ${GREY_HEADING}`}>{name}</span>
        <span className={`text-xs font-mono ${GREY}`}>{timestamp}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyBanner({ section }: { section: Section }) {
  return (
    <div className="rounded border border-red-500/60 bg-red-50 dark:bg-red-950/30 px-4 py-4 text-sm">
      <p className="font-medium mb-1">{SECTION_LABEL[section]} picks are locked</p>
      <p className="text-gray-600 dark:text-gray-400">
        No submissions were recorded before this section closed.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  actual,
}: {
  label: string;
  value: string;
  actual: string;
}) {
  const hasResult = actual.length > 0;
  const correct = hasResult && value === actual;
  const points = correct ? 1 : 0;
  return (
    <div>
      <dt className={`inline ${GREY_HEADING}`}>{label}: </dt>
      <dd className="inline">
        <span className={correct ? CORRECT : ""}>{value || "—"}</span>
        {hasResult && <span> ({pluralPts(points)})</span>}
      </dd>
    </div>
  );
}

function TeamRow({
  label,
  players,
  actual,
}: {
  label: string;
  players: string[];
  actual: string[];
}) {
  const actualSet = new Set(actual.filter((a) => a.length > 0));
  const hasResult = actualSet.size > 0;
  const rendered = players.map((p) => ({
    text: p,
    correct: hasResult && p.length > 0 && actualSet.has(p),
  }));
  const teamPoints = new Set(
    players.filter((p) => p.length > 0 && actualSet.has(p))
  ).size;
  return (
    <div>
      <span className={GREY_HEADING}>{label}: </span>
      {rendered.length === 0 || rendered.every((r) => !r.text) ? (
        <span>—</span>
      ) : (
        rendered
          .filter((r) => r.text)
          .map((r, i, arr) => (
            <span key={i}>
              <span className={r.correct ? CORRECT : ""}>{r.text}</span>
              {i < arr.length - 1 && <span>, </span>}
            </span>
          ))
      )}
      {hasResult && <span> ({pluralPts(teamPoints)})</span>}
    </div>
  );
}

function latestByName<T extends { name: string; timestamp: string }>(
  items: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (!key) continue;
    const existing = map.get(key);
    if (!existing || item.timestamp >= existing.timestamp) map.set(key, item);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}
