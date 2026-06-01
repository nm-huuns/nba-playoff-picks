import { describe, it, expect } from "vitest";
import {
  formatFinalsLine,
  parseFinalsLine,
  parseFinalsFile,
  validateFinalsSubmission,
  type FinalsSubmission,
  type FinalsPick,
} from "./finals";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-05-25T11:00:00+10:00";

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
    finals: { id: "F-1", teamA: "E1", teamB: "W1" },
  };
}

function validPicks(): FinalsPick[] {
  return [{ matchupId: "F-1", winner: "E1", games: 6 }];
}

function validBody(overrides: Record<string, unknown> = {}) {
  return { name: "Sunny", picks: validPicks(), ...overrides };
}

describe("formatFinalsLine & parseFinalsLine", () => {
  it("round-trips a basic submission", () => {
    const submission: FinalsSubmission = {
      timestamp: TIMESTAMP,
      name: "Sunny",
      picks: validPicks(),
    };
    const line = formatFinalsLine(submission);
    expect(line.startsWith(`${TIMESTAMP} | Sunny | `)).toBe(true);
    expect(line.split(" | ")).toHaveLength(3);
    expect(parseFinalsLine(line)).toEqual(submission);
  });

  it("sanitizes pipes in the name", () => {
    const line = formatFinalsLine({
      timestamp: TIMESTAMP,
      name: "Su|nny",
      picks: validPicks(),
    });
    expect(line).toContain("Su nny");
    expect(line.split(" | ")).toHaveLength(3);
  });

  it("preserves team names containing dashes", () => {
    const submission: FinalsSubmission = {
      timestamp: TIMESTAMP,
      name: "Zac",
      picks: [{ matchupId: "F-1", winner: "Oklahoma City-Thunder", games: 7 }],
    };
    const parsed = parseFinalsLine(formatFinalsLine(submission));
    expect(parsed?.picks[0].winner).toBe("Oklahoma City-Thunder");
    expect(parsed?.picks[0].games).toBe(7);
  });

  it("returns null for malformed lines", () => {
    expect(parseFinalsLine("bad")).toBeNull();
    expect(parseFinalsLine(`${TIMESTAMP} | name | F-1:E1-9`)).toBeNull();
  });
});

describe("parseFinalsFile", () => {
  it("parses multiple lines and skips blanks", () => {
    const a = formatFinalsLine({ timestamp: TIMESTAMP, name: "A", picks: validPicks() });
    const b = formatFinalsLine({ timestamp: TIMESTAMP, name: "B", picks: validPicks() });
    const parsed = parseFinalsFile(`${a}\n\n${b}\n`);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("A");
    expect(parsed[1].name).toBe("B");
  });
});

describe("validateFinalsSubmission", () => {
  it("accepts a valid submission", () => {
    const result = validateFinalsSubmission(validBody(), fullConfig());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.picks).toHaveLength(1);
  });

  it("rejects when finals is not yet configured", () => {
    const config = fullConfig();
    config.finals = undefined;
    const result = validateFinalsSubmission(validBody(), config);
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/finals/i) });
  });

  it("rejects when finals teams are not filled in", () => {
    const config = fullConfig();
    config.finals!.teamA = "";
    const result = validateFinalsSubmission(validBody(), config);
    expect(result.ok).toBe(false);
  });

  it("rejects empty name", () => {
    const result = validateFinalsSubmission(validBody({ name: "   " }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/name/i) });
  });

  it("rejects wrong number of picks", () => {
    const result = validateFinalsSubmission(
      validBody({ picks: [] }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/1 picks/i) });
  });

  it("rejects unknown matchupId", () => {
    const picks: FinalsPick[] = [{ matchupId: "X-nope", winner: "E1", games: 4 }];
    const result = validateFinalsSubmission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/unknown/i) });
  });

  it("rejects a winner not in the matchup", () => {
    const picks: FinalsPick[] = [{ matchupId: "F-1", winner: "E5", games: 4 }];
    const result = validateFinalsSubmission(validBody({ picks }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/winner/i) });
  });

  it("rejects invalid games count", () => {
    const picks = [{ matchupId: "F-1", winner: "E1", games: 3 }];
    const result = validateFinalsSubmission(
      validBody({ picks: picks as unknown as FinalsPick[] }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/games/i) });
  });

  it("rejects non-array picks", () => {
    const result = validateFinalsSubmission(validBody({ picks: "nope" }), fullConfig());
    expect(result.ok).toBe(false);
  });
});
