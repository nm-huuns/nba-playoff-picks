import type { Submission as Round1Submission } from "@/lib/picks";
import type { Round2Submission } from "@/lib/round2";
import type { AwardsSubmission } from "@/lib/awards";

type Section = "r1" | "r2" | "awards";

const SECTION_LABEL: Record<Section, string> = {
  r1: "Round 1",
  r2: "Round 2",
  awards: "Award Winners",
};

const GREY = "text-gray-500 dark:text-gray-500";
const GREY_HEADING = "text-gray-600 dark:text-gray-400";

export function LockedR1ListView({
  submissions,
}: {
  submissions: Round1Submission[];
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
              <span>East: {sub.conferenceWinners.east}</span>
              <span className="mx-2">·</span>
              <span>West: {sub.conferenceWinners.west}</span>
            </div>
          )}
          <ul className={`mt-2 space-y-1 text-sm ${GREY}`}>
            {sub.picks.map((p) => (
              <li key={p.seriesId}>
                <span className="font-mono">{p.seriesId}</span>
                <span className="mx-2">·</span>
                <span>{p.winner}</span>
                <span className="mx-2">·</span>
                <span>{p.games} games</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </ListWrapper>
  );
}

export function LockedR2ListView({
  submissions,
}: {
  submissions: Round2Submission[];
}) {
  const latest = latestByName(submissions);
  if (latest.length === 0) return <EmptyBanner section="r2" />;
  return (
    <ListWrapper section="r2" count={latest.length}>
      {latest.map((sub) => (
        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
          <ul className={`space-y-1 text-sm ${GREY}`}>
            {sub.picks.map((p) => (
              <li key={p.matchupId}>
                <span className="font-mono">{p.matchupId}</span>
                <span className="mx-2">·</span>
                <span>{p.winner}</span>
                <span className="mx-2">·</span>
                <span>{p.games} games</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </ListWrapper>
  );
}

export function LockedAwardsListView({
  submissions,
}: {
  submissions: AwardsSubmission[];
}) {
  const latest = latestByName(submissions);
  if (latest.length === 0) return <EmptyBanner section="awards" />;
  return (
    <ListWrapper section="awards" count={latest.length}>
      {latest.map((sub) => (
        <Card key={sub.name} name={sub.name} timestamp={sub.timestamp}>
          <dl className={`grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 ${GREY}`}>
            <Row label="MVP" value={sub.mvp} />
            <Row label="Rookie of the Year" value={sub.roy} />
            <Row label="Most Improved Player" value={sub.mip} />
            <Row label="Sixth Man of the Year" value={sub.smoy} />
            <Row label="Coach of the Year" value={sub.coy} />
          </dl>
          <div className={`mt-3 space-y-1 text-sm ${GREY}`}>
            <TeamRow label="All-NBA 1st team" players={sub.allNBA.first} />
            <TeamRow label="All-NBA 2nd team" players={sub.allNBA.second} />
            <TeamRow label="All-NBA 3rd team" players={sub.allNBA.third} />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={`inline ${GREY_HEADING}`}>{label}: </dt>
      <dd className="inline">{value || "—"}</dd>
    </div>
  );
}

function TeamRow({ label, players }: { label: string; players: string[] }) {
  return (
    <div>
      <span className={GREY_HEADING}>{label}: </span>
      <span>{players.filter(Boolean).join(", ") || "—"}</span>
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
