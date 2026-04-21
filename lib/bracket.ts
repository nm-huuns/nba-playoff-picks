export type Conference = "East" | "West";

export interface Team {
  seed: number;
  team: string;
}

export interface BracketConfig {
  season: string;
  east: Team[];
  west: Team[];
  round2?: Round2Config;
}

export interface Round2Config {
  east: Round2MatchupConfig[];
  west: Round2MatchupConfig[];
}

export interface Round2MatchupConfig {
  id: string;     // e.g. "E-semi-1"
  teamA: string;  // empty string means TBD
  teamB: string;
}

export interface Round2Matchup {
  id: string;
  conference: Conference;
  teamA: string;
  teamB: string;
}

export interface Matchup {
  id: string;            // e.g. "E-1v8"
  conference: Conference;
  high: Team;            // higher-seeded team (lower seed number)
  low: Team;             // lower-seeded team (higher seed number)
}

// First-round seed pairings, in display order (top of bracket to bottom).
export const FIRST_ROUND_MATCHUP_ORDER: ReadonlyArray<[number, number]> = [
  [1, 8],
  [4, 5],
  [3, 6],
  [2, 7],
];

const CONFERENCE_PREFIX: Record<Conference, "E" | "W"> = {
  East: "E",
  West: "W",
};

export const SERIES_IDS: string[] = (["East", "West"] as Conference[]).flatMap((conf) =>
  FIRST_ROUND_MATCHUP_ORDER.map(([a, b]) => `${CONFERENCE_PREFIX[conf]}-${a}v${b}`)
);

function seedLookup(teams: Team[]): Map<number, Team> {
  const map = new Map<number, Team>();
  for (const t of teams) map.set(t.seed, t);
  return map;
}

function matchupsForConference(conf: Conference, teams: Team[]): Matchup[] {
  const bySeed = seedLookup(teams);
  return FIRST_ROUND_MATCHUP_ORDER.map(([highSeed, lowSeed]) => {
    const high = bySeed.get(highSeed) ?? { seed: highSeed, team: "" };
    const low = bySeed.get(lowSeed) ?? { seed: lowSeed, team: "" };
    return {
      id: `${CONFERENCE_PREFIX[conf]}-${highSeed}v${lowSeed}`,
      conference: conf,
      high,
      low,
    };
  });
}

export function getMatchups(config: BracketConfig): Matchup[] {
  return [
    ...matchupsForConference("East", config.east),
    ...matchupsForConference("West", config.west),
  ];
}

export function getAllTeams(config: BracketConfig): string[] {
  return [...config.east, ...config.west].map((t) => t.team).filter((t) => t.length > 0);
}

export function isBracketComplete(config: BracketConfig): boolean {
  return getAllTeams(config).length === 16;
}

export function getMatchupById(config: BracketConfig, id: string): Matchup | undefined {
  return getMatchups(config).find((m) => m.id === id);
}

// ---------- Round 2 helpers ----------

export function getRound2Matchups(config: BracketConfig): Round2Matchup[] {
  const r2 = config.round2;
  if (!r2) return [];
  const east: Round2Matchup[] = r2.east.map((m) => ({
    id: m.id,
    conference: "East" as Conference,
    teamA: m.teamA,
    teamB: m.teamB,
  }));
  const west: Round2Matchup[] = r2.west.map((m) => ({
    id: m.id,
    conference: "West" as Conference,
    teamA: m.teamA,
    teamB: m.teamB,
  }));
  return [...east, ...west];
}

export function isRound2Complete(config: BracketConfig): boolean {
  const ms = getRound2Matchups(config);
  if (ms.length === 0) return false;
  return ms.every((m) => m.teamA.length > 0 && m.teamB.length > 0);
}

export function getRound2MatchupById(
  config: BracketConfig,
  id: string
): Round2Matchup | undefined {
  return getRound2Matchups(config).find((m) => m.id === id);
}
