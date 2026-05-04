import type { Submission as Round1Submission } from "./picks";
import type { Round2Submission } from "./round2";
import type { AwardsSubmission } from "./awards";
import type { ResultsState } from "./results";

export const POINTS = {
  seriesWinner: 1,
  seriesGames: 2,
  conferenceWinner: 2,
  singleAward: 1,
  allNbaPlayer: 1, // 1 pt per player placed on the correct team
} as const;

export interface ScoreBreakdown {
  r1Series: number;
  r1ConferenceWinners: number;
  r2Series: number;
  awardsSingle: number;
  awardsAllNba: number;
  total: number;
}

export interface LeaderboardEntry {
  name: string;
  total: number;
  breakdown: ScoreBreakdown;
}

function scoreSeries(
  pickWinner: string,
  pickGames: number,
  result: { winner: string; games: number } | undefined
): number {
  if (!result || !result.winner) return 0;
  let pts = 0;
  if (pickWinner === result.winner) {
    pts += POINTS.seriesWinner;
    if (result.games !== 0 && pickGames === result.games) {
      pts += POINTS.seriesGames;
    }
  }
  return pts;
}

export function scoreRound1(
  submission: Round1Submission,
  results: ResultsState
): { series: number; conference: number } {
  let series = 0;
  for (const p of submission.picks) {
    series += scoreSeries(p.winner, p.games, results.r1.series[p.seriesId]);
  }

  let conference = 0;
  const cw = submission.conferenceWinners;
  const rcw = results.r1.conferenceWinners;
  if (cw && rcw.east && cw.east === rcw.east) conference += POINTS.conferenceWinner;
  if (cw && rcw.west && cw.west === rcw.west) conference += POINTS.conferenceWinner;
  return { series, conference };
}

export function scoreRound2(
  submission: Round2Submission,
  results: ResultsState
): number {
  let series = 0;
  for (const p of submission.picks) {
    series += scoreSeries(p.winner, p.games, results.r2.series[p.matchupId]);
  }
  return series;
}

function scoreSingleAward(pick: string, result: string): number {
  if (!result) return 0;
  return pick === result ? POINTS.singleAward : 0;
}

function scoreAllNbaTeam(picked: string[], actual: string[]): number {
  const actualSet = new Set(actual.filter((a) => a.length > 0));
  if (actualSet.size === 0) return 0;
  const uniqueCorrect = new Set(
    picked.filter((p) => p.length > 0 && actualSet.has(p))
  );
  return uniqueCorrect.size * POINTS.allNbaPlayer;
}

export function scoreAwards(
  submission: AwardsSubmission,
  results: ResultsState
): { single: number; allNba: number } {
  const a = results.awards;
  let single = 0;
  single += scoreSingleAward(submission.mvp, a.mvp);
  single += scoreSingleAward(submission.roy, a.roy);
  single += scoreSingleAward(submission.mip, a.mip);
  single += scoreSingleAward(submission.smoy, a.smoy);
  single += scoreSingleAward(submission.coy, a.coy);

  let allNba = 0;
  allNba += scoreAllNbaTeam(submission.allNBA.first, a.allNBA.first);
  allNba += scoreAllNbaTeam(submission.allNBA.second, a.allNBA.second);
  allNba += scoreAllNbaTeam(submission.allNBA.third, a.allNBA.third);

  return { single, allNba };
}

// ---------- Leaderboard aggregation ----------

// Submissions across the three sections are joined by name. If the same person
// submits multiple times in the same section, we use the most recent (last)
// submission for that section.
export function buildLeaderboard(input: {
  r1: Round1Submission[];
  r2: Round2Submission[];
  awards: AwardsSubmission[];
  results: ResultsState;
}): LeaderboardEntry[] {
  const { r1, r2, awards, results } = input;

  const lastBy = <T extends { name: string; timestamp: string }>(
    items: T[]
  ): Map<string, T> => {
    const map = new Map<string, T>();
    for (const item of items) {
      const key = item.name.trim();
      if (!key) continue;
      const existing = map.get(key);
      if (!existing || item.timestamp >= existing.timestamp) {
        map.set(key, item);
      }
    }
    return map;
  };

  const r1ByName = lastBy(r1);
  const r2ByName = lastBy(r2);
  const awardsByName = lastBy(awards);

  const allNames = new Set<string>([
    ...r1ByName.keys(),
    ...r2ByName.keys(),
    ...awardsByName.keys(),
  ]);

  const entries: LeaderboardEntry[] = [];
  for (const name of allNames) {
    const r1s = r1ByName.get(name);
    const r2s = r2ByName.get(name);
    const aws = awardsByName.get(name);

    const r1Score = r1s
      ? scoreRound1(r1s, results)
      : { series: 0, conference: 0 };
    const r2Score = r2s ? scoreRound2(r2s, results) : 0;
    const awScore = aws
      ? scoreAwards(aws, results)
      : { single: 0, allNba: 0 };

    const breakdown: ScoreBreakdown = {
      r1Series: r1Score.series,
      r1ConferenceWinners: r1Score.conference,
      r2Series: r2Score,
      awardsSingle: awScore.single,
      awardsAllNba: awScore.allNba,
      total:
        r1Score.series +
        r1Score.conference +
        r2Score +
        awScore.single +
        awScore.allNba,
    };

    entries.push({ name, total: breakdown.total, breakdown });
  }

  entries.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });
  return entries;
}
