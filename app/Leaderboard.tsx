import type { LeaderboardEntry } from "@/lib/scoring";

export default function Leaderboard({
  entries,
  hasResults,
}: {
  entries: LeaderboardEntry[];
  hasResults: boolean;
}) {
  if (!hasResults) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-600 dark:text-gray-400">
        Results haven&apos;t been entered yet — the leaderboard will populate as
        the admin records actual playoff outcomes.
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">No submissions to score yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3 text-right">R1 series</th>
            <th className="py-2 pr-3 text-right">R1 conf</th>
            <th className="py-2 pr-3 text-right">R2</th>
            <th className="py-2 pr-3 text-right">Awards</th>
            <th className="py-2 pr-3 text-right">All-NBA</th>
            <th className="py-2 pr-3 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr
              key={e.name}
              className="border-t border-gray-200 dark:border-gray-800"
            >
              <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
              <td className="py-2 pr-3 font-medium">{e.name}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.r1Series}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.r1ConferenceWinners}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.r2Series}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.awardsSingle}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{e.breakdown.awardsAllNba}</td>
              <td className="py-2 pr-3 text-right tabular-nums font-semibold">{e.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
