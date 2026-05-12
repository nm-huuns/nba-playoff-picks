import { describe, it, expect } from "vitest";
import {
  formatRound3Line,
  parseRound3Line,
  parseRound3File,
  validateRound3Submission,
  type Round3Submission,
  type Round3Pick,
} from "./round3";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-05-11T11:00:00+10:00";

function fullConfig(): BracketConfig {
  return {
    season: "2025-26",
    east: [
      { seed: 1, team: "E1" },
      { seed: 2, team: "E2" },
      { seed: 3, team: "E3" },
      { seed: 4, team: "E4" },
      { seed: 5, team: "E5" },
      { seed: 6, team: "E6" },
      { seed: 7, team: "E7" },
      { seed: 8, team: "E8" },
    ],
    west: [
      { seed: 1, team: "W1" },
      { seed: 2, team: "W2" },
      { seed: 3, team: "W3" },
      { seed: 4, team: "W4" },
      { seed: 5, team: "W5" },
      { seed: 6, team: "W6" },
      { seed: 7, team: "W7" },
      { seed: 8, team: "W8" },
    ],
    round2: {
      east: [
        { id: "E-semi-1", teamA: "E1", teamB: "E5" },
        { id: "E-semi-2", teamA: "E3", teamB: "E2" },
      ],
      west: [
        { id: "W-semi-1", teamA: "W1", teamB: "W4" },
        { id: "W-semi-2", teamA: "W6", teamB: "W2" },
      ],
    },
    round3: {
      east: [{ id: "E-cf-1", teamA: "E1", teamB: "E2" }],
      west: [{ id: "W-cf-1", teamA: "W1", teamB: "W2" }],
    },
  };
}

function validPicks(): Round3Pick[] {
  return [
    { matchupId: "E-cf-1", winner: "E1", games: 6 },
    { matchupId: "W-cf-1", winner: "W2", games: 7 },
  ];
}

function validBody(overrides: Record<string, unknown> = {}) {
  return { name: "Sunny", picks: validPicks(), ...overrides };
}

describe("formatRound3Line & parseRound3Line", () => {
  it("round-trips a basic submission", () => {
    const submission: Round3Submission = {
      timestamp: TIMESTAMP,
      name: "Sunny",
      picks: validPicks(),
    };
    const line = formatRound3Line(submission);
    expect(line.startsWith(`${TIMESTAMP} | Sunny | `)).toBe(true);
    expect(line.split(" | ")).toHaveLength(3);
    const parsed = parseRound3Line(line);
    expect(parsed).toEqual(submission);
  });

  it("sanitizes pipes in the name", () => {
    const line = formatRound3Line({
      timestamp: TIMESTAMP,
      name: "Su|nny",
      picks: validPicks(),
    });
    expect(line).toContain("Su nny");
    expect(line.split(" | ")).toHaveLength(3);
  });

  it("preserves team names containing dashes", () => {
    const submission: Round3Submission = {
      timestamp: TIMESTAMP,
      name: "Zac",
      picks: [
        { matchupId: "E-cf-1", winner: "Oklahoma City-Thunder", games: 6 },
        { matchupId: "W-cf-1", winner: "W2", games: 7 },
      ],
    };
    const line = formatRound3Line(submission);
    const parsed = parseRound3Line(line);
    expect(parsed?.picks[0].winner).toBe("Oklahoma City-Thunder");
    expect(parsed?.picks[0].games).toBe(6);
  });

  it("returns null for malformed lines", () => {
    expect(parseRound3Line("bad")).toBeNull();
    expect(parseRound3Line(`${TIMESTAMP} | name | E-cf-1:E1-9`)).toBeNull();
  });
});

describe("parseRound3File", () => {
  it("parses multiple lines and skips blanks", () => {
    const a = formatRound3Line({ timestamp: TIMESTAMP, name: "A", picks: validPicks() });
    const b = formatRound3Line({ timestamp: TIMESTAMP, name: "B", picks: validPicks() });
    const parsed = parseRound3File(`${a}\n\n${b}\n`);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("A");
    expect(parsed[1].name).toBe("B");
  });
});

describe("validateRound3Submission", () => {
  it("accepts a valid submission", () => {
    const result = validateRound3Submission(validBody(), fullConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.picks).toHaveLength(2);
    }
  });

  it("rejects when round 3 is not yet configured", () => {
    const config = fullConfig();
    config.round3 = undefined;
    const result = validateRound3Submission(validBody(), config);
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/round 3/i) });
  });

  it("rejects when round 3 is incomplete (empty teamA)", () => {
    const config = fullConfig();
    config.round3!.east[0].teamA = "";
    const result = validateRound3Submission(validBody(), config);
    expect(result.ok).toBe(false);
  });

  it("rejects empty name", () => {
    const result = validateRound3Submission(validBody({ name: "   " }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/name/i) });
  });

  it("rejects overlong name", () => {
    const result = validateRound3Submission(
      validBody({ name: "x".repeat(51) }),
      fullConfig()
    );
    expect(result.ok).toBe(false);
  });

  it("rejects wrong number of picks", () => {
    const result = validateRound3Submission(
      validBody({ picks: validPicks().slice(0, 1) }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/2 picks/i) });
  });

  it("rejects duplicate matchupId", () => {
    const picks = validPicks();
    picks[1] = { ...picks[0] };
    const result = validateRound3Submission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/duplicate/i) });
  });

  it("rejects unknown matchupId", () => {
    const picks = validPicks();
    picks[0] = { matchupId: "X-nope", winner: "E1", games: 4 };
    const result = validateRound3Submission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/unknown/i) });
  });

  it("rejects a winner not in the matchup", () => {
    const picks = validPicks();
    picks[0] = { matchupId: "E-cf-1", winner: "W1", games: 4 };
    const result = validateRound3Submission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/winner/i) });
  });

  it("rejects invalid games count", () => {
    const picks = validPicks() as unknown as Array<Record<string, unknown>>;
    picks[0] = { matchupId: "E-cf-1", winner: "E1", games: 3 };
    const result = validateRound3Submission(
      validBody({ picks: picks as unknown as Round3Pick[] }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/games/i) });
  });

  it("rejects non-array picks", () => {
    const result = validateRound3Submission(validBody({ picks: "nope" }), fullConfig());
    expect(result.ok).toBe(false);
  });

  it("returns picks in canonical matchup order", () => {
    const picks = validPicks().slice().reverse();
    const result = validateRound3Submission(validBody({ picks }), fullConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.picks.map((p) => p.matchupId)).toEqual(["E-cf-1", "W-cf-1"]);
    }
  });
});
