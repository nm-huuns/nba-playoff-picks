import { describe, it, expect } from "vitest";
import {
  FIRST_ROUND_MATCHUP_ORDER,
  SERIES_IDS,
  getMatchups,
  getAllTeams,
  isBracketComplete,
  getMatchupById,
  type BracketConfig,
} from "./bracket";

function makeConfig(east: string[] = [], west: string[] = []): BracketConfig {
  const fill = (names: string[]) =>
    Array.from({ length: 8 }, (_, i) => ({ seed: i + 1, team: names[i] ?? "" }));
  return { season: "2025-26", east: fill(east), west: fill(west) };
}

const EAST = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8"];
const WEST = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

describe("bracket", () => {
  it("FIRST_ROUND_MATCHUP_ORDER pairs 1v8, 4v5, 3v6, 2v7", () => {
    expect(FIRST_ROUND_MATCHUP_ORDER).toEqual([
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ]);
  });

  it("SERIES_IDS lists East then West, 8 total", () => {
    expect(SERIES_IDS).toEqual([
      "E-1v8",
      "E-4v5",
      "E-3v6",
      "E-2v7",
      "W-1v8",
      "W-4v5",
      "W-3v6",
      "W-2v7",
    ]);
  });

  it("getMatchups returns 8 matchups with correct team pairing", () => {
    const config = makeConfig(EAST, WEST);
    const matchups = getMatchups(config);
    expect(matchups).toHaveLength(8);
    expect(matchups[0]).toMatchObject({
      id: "E-1v8",
      conference: "East",
      high: { seed: 1, team: "E1" },
      low: { seed: 8, team: "E8" },
    });
    expect(matchups[4]).toMatchObject({
      id: "W-1v8",
      conference: "West",
      high: { seed: 1, team: "W1" },
      low: { seed: 8, team: "W8" },
    });
    expect(matchups[7]).toMatchObject({
      id: "W-2v7",
      high: { seed: 2, team: "W2" },
      low: { seed: 7, team: "W7" },
    });
  });

  it("getAllTeams returns only non-empty team names", () => {
    const partial = makeConfig(["E1", "", "E3"], []);
    expect(getAllTeams(partial)).toEqual(["E1", "E3"]);
  });

  it("isBracketComplete returns true only when all 16 teams are filled", () => {
    expect(isBracketComplete(makeConfig(EAST, WEST))).toBe(true);
    expect(isBracketComplete(makeConfig(EAST, WEST.slice(0, 7)))).toBe(false);
    expect(isBracketComplete(makeConfig([], []))).toBe(false);
  });

  it("getMatchupById finds a matchup", () => {
    const config = makeConfig(EAST, WEST);
    expect(getMatchupById(config, "E-4v5")).toMatchObject({
      high: { seed: 4, team: "E4" },
      low: { seed: 5, team: "E5" },
    });
    expect(getMatchupById(config, "bogus")).toBeUndefined();
  });
});
