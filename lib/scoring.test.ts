import { describe, it, expect } from "vitest";
import {
  buildLeaderboard,
  scoreAwards,
  scoreFinals,
  scoreRound1,
  scoreRound2,
  scoreRound3,
} from "./scoring";
import type { ResultsState } from "./results";
import { emptyResultsState } from "./results";
import type { Submission as Round1Submission } from "./picks";
import type { Round2Submission } from "./round2";
import type { Round3Submission } from "./round3";
import type { FinalsSubmission } from "./finals";
import type { AwardsSubmission } from "./awards";

const TS = "2026-04-20T12:00:00Z";

function r1(name: string, overrides: Partial<Round1Submission> = {}): Round1Submission {
  return {
    timestamp: TS,
    name,
    picks: [
      { seriesId: "E-1v8", winner: "Detroit", games: 5 },
      { seriesId: "E-4v5", winner: "Cleveland", games: 6 },
    ],
    conferenceWinners: { east: "Boston", west: "OKC" },
    ...overrides,
  };
}

function r2(name: string, overrides: Partial<Round2Submission> = {}): Round2Submission {
  return {
    timestamp: TS,
    name,
    picks: [{ matchupId: "E-semi-1", winner: "Boston", games: 7 }],
    ...overrides,
  };
}

function r3(name: string, overrides: Partial<Round3Submission> = {}): Round3Submission {
  return {
    timestamp: TS,
    name,
    picks: [{ matchupId: "E-cf-1", winner: "Boston", games: 6 }],
    ...overrides,
  };
}

function finals(
  name: string,
  overrides: Partial<FinalsSubmission> = {}
): FinalsSubmission {
  return {
    timestamp: TS,
    name,
    champion: "Boston",
    championGames: 5,
    games: { G1: "Boston", G2: "Boston", G3: "Denver", G4: "Boston", G5: "Boston" },
    mvp: "Tatum",
    pointsLeader: "Tatum",
    reboundsLeader: "Gobert",
    assistsLeader: "Murray",
    ...overrides,
  };
}

function aw(name: string, overrides: Partial<AwardsSubmission> = {}): AwardsSubmission {
  return {
    timestamp: TS,
    name,
    mvp: "Jokic",
    roy: "Flagg",
    mip: "Barnes",
    smoy: "Beasley",
    coy: "Atkinson",
    allNBA: {
      first: ["A", "B", "C", "D", "E"],
      second: ["F", "G", "H", "I", "J"],
      third: ["K", "L", "M", "N", "O"],
    },
    ...overrides,
  };
}

function fullResults(): ResultsState {
  const r = emptyResultsState();
  r.r1.conferenceWinners = { east: "Boston", west: "OKC" };
  r.r1.series["E-1v8"] = { winner: "Detroit", games: 5 };
  r.r1.series["E-4v5"] = { winner: "Cleveland", games: 5 }; // games mismatch
  r.r2.series["E-semi-1"] = { winner: "Boston", games: 7 };
  r.r3.series["E-cf-1"] = { winner: "Boston", games: 6 };
  r.finals = {
    champion: "Boston",
    championGames: 5,
    games: { G1: "Boston", G2: "Boston", G3: "Denver", G4: "Boston", G5: "Boston" },
    mvp: "Tatum",
    pointsLeader: "Tatum",
    reboundsLeader: "Gobert",
    assistsLeader: "Murray",
  };
  r.awards = {
    mvp: "Jokic",
    roy: "Flagg",
    mip: "Barnes",
    smoy: "Beasley",
    coy: "Atkinson",
    allNBA: {
      first: ["A", "B", "C", "D", "E"],
      second: ["F", "G", "X", "I", "J"], // 4 of 5
      third: ["K", "L", "M", "N", "O"],
    },
  };
  return r;
}

describe("scoreRound1", () => {
  it("awards 1 pt for series winner and 2 pts extra for correct games", () => {
    const result = scoreRound1(r1("Sunny"), fullResults());
    // E-1v8: winner+games = 3; E-4v5: winner only = 1
    expect(result.series).toBe(4);
    expect(result.conference).toBe(4); // both conf winners correct
  });

  it("scores 0 for incorrect winner", () => {
    const sub = r1("Sunny", {
      picks: [
        { seriesId: "E-1v8", winner: "Orlando", games: 5 },
        { seriesId: "E-4v5", winner: "Toronto", games: 6 },
      ],
    });
    expect(scoreRound1(sub, fullResults()).series).toBe(0);
  });

  it("skips undecided series", () => {
    const r = emptyResultsState();
    expect(scoreRound1(r1("Sunny"), r).series).toBe(0);
    expect(scoreRound1(r1("Sunny"), r).conference).toBe(0);
  });

  it("scores per-conference: only east correct", () => {
    const r = emptyResultsState();
    r.r1.conferenceWinners = { east: "Boston", west: "" };
    expect(scoreRound1(r1("Sunny"), r).conference).toBe(2);
  });
});

describe("scoreRound2", () => {
  it("awards 3 pts for winner+games match", () => {
    expect(scoreRound2(r2("Sunny"), fullResults())).toBe(3);
  });

  it("awards 1 pt for winner only", () => {
    const r = fullResults();
    r.r2.series["E-semi-1"] = { winner: "Boston", games: 5 };
    expect(scoreRound2(r2("Sunny"), r)).toBe(1);
  });

  it("returns 0 when result is undecided", () => {
    expect(scoreRound2(r2("Sunny"), emptyResultsState())).toBe(0);
  });
});

describe("scoreRound3", () => {
  it("awards 3 pts for winner+games match", () => {
    expect(scoreRound3(r3("Sunny"), fullResults())).toBe(3);
  });

  it("awards 1 pt for winner only", () => {
    const r = fullResults();
    r.r3.series["E-cf-1"] = { winner: "Boston", games: 5 };
    expect(scoreRound3(r3("Sunny"), r)).toBe(1);
  });

  it("returns 0 when result is undecided", () => {
    expect(scoreRound3(r3("Sunny"), emptyResultsState())).toBe(0);
  });
});

describe("scoreFinals", () => {
  it("awards champion+games pts + 1 pt per correct game + 1 pt per correct award", () => {
    // champion correct (1pt) + games correct (2pts) + 5 recorded games (5pts) + 4 awards (4pts) = 12
    expect(scoreFinals(finals("Sunny"), fullResults())).toBe(12);
  });

  it("awards 1pt for correct champion without correct games", () => {
    const r = fullResults();
    r.finals.championGames = 6; // mismatch
    expect(scoreFinals(finals("Sunny"), r)).toBe(1 + 5 + 4); // 10
  });

  it("only scores games with a recorded result", () => {
    const r = emptyResultsState();
    r.finals.games = { G1: "Boston", G2: "Denver" }; // G1 matches fixture, G2 doesn't
    expect(scoreFinals(finals("Sunny"), r)).toBe(1);
  });

  it("scores each Finals award independently", () => {
    const r = emptyResultsState();
    r.finals.mvp = "Tatum"; // matches
    r.finals.assistsLeader = "Murray"; // matches
    r.finals.pointsLeader = "Jokic"; // no match
    expect(scoreFinals(finals("Sunny"), r)).toBe(2);
  });

  it("returns 0 when nothing is recorded", () => {
    expect(scoreFinals(finals("Sunny"), emptyResultsState())).toBe(0);
  });
});

describe("scoreAwards", () => {
  it("awards 1 pt per correct single-entity award", () => {
    const result = scoreAwards(aw("Sunny"), fullResults());
    expect(result.single).toBe(5);
  });

  it("awards 1 pt per correct All-NBA player on the right team", () => {
    // First team 5/5; second team 4/5 (G,H pair includes one mismatch); third 5/5
    // fullResults second is [F,G,X,I,J], submission second is [F,G,H,I,J] → 4 match
    const result = scoreAwards(aw("Sunny"), fullResults());
    expect(result.allNba).toBe(5 + 4 + 5);
  });

  it("scores All-NBA regardless of position within a team", () => {
    // Picked 1st team in reversed order vs actual; should still be 5/5.
    const sub = aw("Sunny", {
      allNBA: {
        first: ["E", "D", "C", "B", "A"],
        second: ["F", "G", "H", "I", "J"],
        third: ["K", "L", "M", "N", "O"],
      },
    });
    const r = scoreAwards(sub, fullResults());
    // 1st: 5/5 set match. 2nd: F,G,I,J in actual = 4. 3rd: 5.
    expect(r.allNba).toBe(5 + 4 + 5);
  });

  it("does not credit a right player on the wrong team", () => {
    const sub = aw("Sunny", {
      allNBA: {
        first: ["F", "B", "C", "D", "E"], // F is on the actual 2nd team
        second: ["A", "G", "X", "I", "J"], // A is on the actual 1st team
        third: ["K", "L", "M", "N", "O"],
      },
    });
    const r = scoreAwards(sub, fullResults());
    // first: B,C,D,E correct = 4; second: G,X,I,J = X matches actual X = 4; third: 5
    expect(r.allNba).toBe(4 + 4 + 5);
  });

  it("skips blank single-entity results", () => {
    const r = fullResults();
    r.awards.mvp = "";
    const result = scoreAwards(aw("Sunny"), r);
    expect(result.single).toBe(4);
  });
});

describe("buildLeaderboard", () => {
  it("sorts by total descending and breaks ties by name ascending", () => {
    const subs = {
      r1: [r1("Alice"), r1("Bob")],
      r2: [r2("Alice"), r2("Bob")],
      r3: [r3("Alice"), r3("Bob")],
      finals: [finals("Alice"), finals("Bob")],
      awards: [aw("Alice"), aw("Bob")],
      results: fullResults(),
    };
    const board = buildLeaderboard(subs);
    expect(board).toHaveLength(2);
    // Both have identical picks, so equal totals; tie-break alphabetical.
    expect(board[0].name).toBe("Alice");
    expect(board[1].name).toBe("Bob");
    expect(board[0].total).toBe(board[1].total);
  });

  it("uses the most recent submission per section per name", () => {
    const old = r1("Alice", {
      timestamp: "2026-04-19T00:00:00Z",
      picks: [
        { seriesId: "E-1v8", winner: "Orlando", games: 4 }, // wrong
        { seriesId: "E-4v5", winner: "Toronto", games: 4 }, // wrong
      ],
    });
    const recent = r1("Alice"); // correct picks
    const board = buildLeaderboard({
      r1: [old, recent],
      r2: [],
      r3: [],
      finals: [],
      awards: [],
      results: fullResults(),
    });
    expect(board[0].breakdown.r1Series).toBe(4);
  });

  it("returns 0 totals when nothing matches the (empty) results", () => {
    const board = buildLeaderboard({
      r1: [r1("Alice")],
      r2: [],
      r3: [],
      finals: [],
      awards: [],
      results: emptyResultsState(),
    });
    expect(board[0].total).toBe(0);
  });

  it("includes a name that only submitted to one section", () => {
    const board = buildLeaderboard({
      r1: [r1("Alice")],
      r2: [],
      r3: [],
      finals: [],
      awards: [],
      results: fullResults(),
    });
    expect(board.map((e) => e.name)).toContain("Alice");
  });
});
