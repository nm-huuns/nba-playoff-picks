import { describe, it, expect } from "vitest";
import {
  formatRound2Line,
  parseRound2Line,
  parseRound2File,
  validateRound2Submission,
  type Round2Submission,
  type Round2Pick,
} from "./round2";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-05-07T11:00:00+10:00";

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
  };
}

function validPicks(): Round2Pick[] {
  return [
    { matchupId: "E-semi-1", winner: "E1", games: 5 },
    { matchupId: "E-semi-2", winner: "E2", games: 7 },
    { matchupId: "W-semi-1", winner: "W1", games: 6 },
    { matchupId: "W-semi-2", winner: "W2", games: 4 },
  ];
}

function validBody(overrides: Record<string, unknown> = {}) {
  return { name: "Sunny", picks: validPicks(), ...overrides };
}

describe("formatRound2Line & parseRound2Line", () => {
  it("round-trips a basic submission", () => {
    const submission: Round2Submission = {
      timestamp: TIMESTAMP,
      name: "Sunny",
      picks: validPicks(),
    };
    const line = formatRound2Line(submission);
    expect(line.startsWith(`${TIMESTAMP} | Sunny | `)).toBe(true);
    expect(line.split(" | ")).toHaveLength(3);
    const parsed = parseRound2Line(line);
    expect(parsed).toEqual(submission);
  });

  it("sanitizes pipes in the name", () => {
    const line = formatRound2Line({
      timestamp: TIMESTAMP,
      name: "Su|nny",
      picks: validPicks(),
    });
    expect(line).toContain("Su nny");
    expect(line.split(" | ")).toHaveLength(3);
  });

  it("preserves team names containing dashes", () => {
    const submission: Round2Submission = {
      timestamp: TIMESTAMP,
      name: "Zac",
      picks: [
        { matchupId: "E-semi-1", winner: "Oklahoma City-Thunder", games: 6 },
        ...validPicks().slice(1),
      ],
    };
    const line = formatRound2Line(submission);
    const parsed = parseRound2Line(line);
    expect(parsed?.picks[0].winner).toBe("Oklahoma City-Thunder");
    expect(parsed?.picks[0].games).toBe(6);
  });

  it("returns null for malformed lines", () => {
    expect(parseRound2Line("bad")).toBeNull();
    expect(parseRound2Line(`${TIMESTAMP} | name | E-semi-1:E1-9`)).toBeNull();
  });
});

describe("parseRound2File", () => {
  it("parses multiple lines and skips blanks", () => {
    const a = formatRound2Line({ timestamp: TIMESTAMP, name: "A", picks: validPicks() });
    const b = formatRound2Line({ timestamp: TIMESTAMP, name: "B", picks: validPicks() });
    const parsed = parseRound2File(`${a}\n\n${b}\n`);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("A");
    expect(parsed[1].name).toBe("B");
  });
});

describe("validateRound2Submission", () => {
  it("accepts a valid submission", () => {
    const result = validateRound2Submission(validBody(), fullConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.picks).toHaveLength(4);
    }
  });

  it("rejects when round 2 is not yet configured", () => {
    const config = fullConfig();
    config.round2 = undefined;
    const result = validateRound2Submission(validBody(), config);
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/round 2/i) });
  });

  it("rejects when round 2 is incomplete (empty teamA)", () => {
    const config = fullConfig();
    config.round2!.east[0].teamA = "";
    const result = validateRound2Submission(validBody(), config);
    expect(result.ok).toBe(false);
  });

  it("rejects empty name", () => {
    const result = validateRound2Submission(validBody({ name: "   " }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/name/i) });
  });

  it("rejects overlong name", () => {
    const result = validateRound2Submission(
      validBody({ name: "x".repeat(51) }),
      fullConfig()
    );
    expect(result.ok).toBe(false);
  });

  it("rejects wrong number of picks", () => {
    const result = validateRound2Submission(
      validBody({ picks: validPicks().slice(0, 3) }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/4 picks/i) });
  });

  it("rejects duplicate matchupId", () => {
    const picks = validPicks();
    picks[1] = { ...picks[0] };
    const result = validateRound2Submission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/duplicate/i) });
  });

  it("rejects unknown matchupId", () => {
    const picks = validPicks();
    picks[0] = { matchupId: "X-nope", winner: "E1", games: 4 };
    const result = validateRound2Submission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/unknown/i) });
  });

  it("rejects a winner not in the matchup", () => {
    const picks = validPicks();
    picks[0] = { matchupId: "E-semi-1", winner: "W1", games: 4 };
    const result = validateRound2Submission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/winner/i) });
  });

  it("rejects invalid games count", () => {
    const picks = validPicks() as unknown as Array<Record<string, unknown>>;
    picks[0] = { matchupId: "E-semi-1", winner: "E1", games: 3 };
    const result = validateRound2Submission(
      validBody({ picks: picks as unknown as Round2Pick[] }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/games/i) });
  });

  it("rejects non-array picks", () => {
    const result = validateRound2Submission(validBody({ picks: "nope" }), fullConfig());
    expect(result.ok).toBe(false);
  });

  it("returns picks in canonical matchup order", () => {
    const picks = validPicks().slice().reverse();
    const result = validateRound2Submission(validBody({ picks }), fullConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.picks.map((p) => p.matchupId)).toEqual([
        "E-semi-1",
        "E-semi-2",
        "W-semi-1",
        "W-semi-2",
      ]);
    }
  });
});
