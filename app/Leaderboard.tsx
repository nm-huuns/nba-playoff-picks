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
      <div className="border-2 border-black px-4 py-4 text-sm text-muted dark:border-[#2a2a2a]">
        Results haven&apos;t been entered yet — the leaderboard will populate as
        the admin records actual playoff outcomes.
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted">No submissions to score yet.</p>
    );
  }
  const topTotal = entries[0]?.total ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[0.62rem] uppercase tracking-[0.1em] text-[#aaa] dark:text-[#bbb] font-extrabold border-b-2 border-black dark:border-white">
            <th className="pb-3 pr-2.5">#</th>
            <th className="pb-3 pr-2.5">Name</th>
            <th className="pb-3 px-2.5 text-right">R1</th>
            <th className="pb-3 px-2.5 text-right">R2</th>
            <th className="pb-3 px-2.5 text-right">CF</th>
            <th className="pb-3 px-2.5 text-right">Finals</th>
            <th className="pb-3 px-2.5 text-right">Awards</th>
            <th className="pb-3 pl-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isLead = e.total === topTotal && e.total > 0;
            const r1 = e.breakdown.r1Series + e.breakdown.r1ConferenceWinners;
            const awards = e.breakdown.awardsSingle + e.breakdown.awardsAllNba;
            return (
              <tr key={e.name} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] dark:border-[#1f1f1f] dark:hover:bg-[#1a1a1a]">
                <td className={`py-3 pr-2.5 text-[0.8rem] font-extrabold w-7 ${i === 0 ? "text-accent" : "text-[#ccc] dark:text-[#333]"}`}>{i + 1}</td>
                <td className="py-3 pr-2.5 font-black text-[0.95rem] tracking-[-0.01em]">{e.name}</td>
                <td className="py-3 px-2.5 text-right tabular-nums">{r1}</td>
                <td className="py-3 px-2.5 text-right tabular-nums">{e.breakdown.r2Series}</td>
                <td className="py-3 px-2.5 text-right tabular-nums">{e.breakdown.r3Series}</td>
                <td className="py-3 px-2.5 text-right tabular-nums">{e.breakdown.finalsSeries}</td>
                <td className="py-3 px-2.5 text-right tabular-nums">{awards}</td>
                <td className={`py-3 pl-2.5 text-right tabular-nums font-black text-[1.05rem] ${isLead ? "text-accent" : ""}`}>{e.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
