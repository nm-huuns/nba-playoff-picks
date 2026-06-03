import type { Submission as Round1Submission } from "@/lib/picks";
import type { Round2Submission } from "@/lib/round2";
import type { Round3Submission } from "@/lib/round3";
import type { FinalsSubmission } from "@/lib/finals";
import { GAME_KEYS } from "@/lib/finals";
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

const GREY = "text-[#999]";
const GREY_HEADING = "text-[#666]";
const CORRECT = "font-black text-black dark:text-white";

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
  const awardRows: { label: string; field: "mvp" | "pointsLeader" | "reboundsLeader" | "assistsLeader" }[] = [
    { label: "MVP", field: "mvp" },
    { label: "Points leader", field: "pointsLeader" },
    { label: "Rebounds leader", field: "reboundsLeader" },
    { label: "Assists leader", field: "assistsLeader" },
  ];
  return (
    <ListWrapper section="finals" count={latest.length}>
      {latest.map((sub) => {
        const gameKeysPicked = GAME_KEYS.filter((k) => sub.games[k]);
        const championCorrect = !!finalsResults.champion && sub.champion === finalsResults.champion;
        const gamesCorrect = championCorrect && finalsResults.championGames !== 0 && sub.championGames === finalsResults.championGames;
        const championPts = (championCorrect ? 1 : 0) + (gamesCorrect ? 2 : 0);
        const hasChampionResult = !!finalsResults.champion;
        return (
          <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
            {sub.champion && (
              <div className={`text-sm mb-2 ${GREY}`}>
                <span className={GREY_HEADING}>Champion — </span>
                <span className={championCorrect ? CORRECT : ""}>{sub.champion}</span>
                {sub.championGames > 0 && (
                  <>
                    <span className="mx-1">in</span>
                    <span className={gamesCorrect ? CORRECT : ""}>{sub.championGames}</span>
                  </>
                )}
                {hasChampionResult && <span> ({pluralPts(championPts)})</span>}
              </div>
            )}
            <div className={`text-sm ${GREY}`}>
              <span className={GREY_HEADING}>Games — </span>
              {gameKeysPicked.length === 0 ? (
                <span>—</span>
              ) : (
                gameKeysPicked.map((k, i) => {
                  const actual = finalsResults.games[k];
                  const hasResult = !!actual;
                  const correct = hasResult && sub.games[k] === actual;
                  return (
                    <span key={k}>
                      {i > 0 && <span className="mx-1">·</span>}
                      <span className="font-mono text-xs">{k}</span>{" "}
                      <span className={correct ? CORRECT : ""}>{sub.games[k]}</span>
                      {correct && <span> ✓</span>}
                    </span>
                  );
                })
              )}
            </div>
            <dl className={`mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 ${GREY}`}>
              {awardRows.map(({ label, field }) => {
                const actual = finalsResults[field];
                const hasResult = !!actual;
                const correct = hasResult && sub[field] === actual;
                return (
                  <div key={field}>
                    <dt className={`inline ${GREY_HEADING}`}>{label}: </dt>
                    <dd className="inline">
                      <span className={correct ? CORRECT : ""}>{sub[field] || "—"}</span>
                      {correct && <span> ✓</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        );
      })}
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
      <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#999]">
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
    <div className="border-[3px] border-black px-4 py-3 dark:border-[#2a2a2a]">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-black pb-2 mb-3 dark:border-[#2a2a2a]">
        <span className="font-black text-sm tracking-[-0.01em]">{name}</span>
        <span className={`text-xs font-mono ${GREY}`}>{timestamp}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyBanner({ section }: { section: Section }) {
  return (
    <div className="border-2 border-black px-4 py-4 text-sm dark:border-[#2a2a2a]">
      <p className="font-extrabold mb-1">{SECTION_LABEL[section]} picks are locked</p>
      <p className={GREY}>
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
