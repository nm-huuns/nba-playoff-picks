import { describe, it, expect } from "vitest";
import {
  formatLine,
  parseLine,
  parsePicksFile,
  validateSubmission,
  type Submission,
  type Pick,
} from "./picks";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-04-20T11:54:32+10:00";

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
  };
}

// Valid picks matching fullConfig()'s matchups.
function validPicks(): Pick[] {
  return [
    { seriesId: "E-1v8", winner: "E1", games: 4 },
    { seriesId: "E-4v5", winner: "E5", games: 7 },
    { seriesId: "E-3v6", winner: "E3", games: 6 },
    { seriesId: "E-2v7", winner: "E2", games: 5 },
    { seriesId: "W-1v8", winner: "W1", games: 4 },
    { seriesId: "W-4v5", winner: "W4", games: 7 },
    { seriesId: "W-3v6", winner: "W6", games: 6 },
    { seriesId: "W-2v7", winner: "W2", games: 5 },
  ];
}

describe("formatLine & parseLine", () => {
  it("round-trips a submission", () => {
    const submission: Submission = {
      timestamp: TIMESTAMP,
      name: "Sunny",
      picks: validPicks(),
    };
    const line = formatLine(submission);
    expect(line.startsWith(`${TIMESTAMP} | Sunny | `)).toBe(true);
    const parsed = parseLine(line);
    expect(parsed).toEqual(submission);
  });

  it("sanitizes pipe characters in the name", () => {
    const line = formatLine({
      timestamp: TIMESTAMP,
      name: "Su|nny",
      picks: validPicks(),
    });
    expect(line).toContain("Su nny");
    expect(line.split(" | ")).toHaveLength(3);
  });

  it("parseLine returns null for malformed lines", () => {
    expect(parseLine("bad")).toBeNull();
    expect(parseLine(`${TIMESTAMP} | name | E-1v8:E1-9`)).toBeNull(); // invalid games
  });

  it("handles team names that contain dashes", () => {
    const submission: Submission = {
      timestamp: TIMESTAMP,
      name: "Zac",
      picks: [
        { seriesId: "E-1v8", winner: "Oklahoma City-Thunder", games: 6 },
        ...validPicks().slice(1),
      ],
    };
    const line = formatLine(submission);
    const parsed = parseLine(line);
    expect(parsed?.picks[0].winner).toBe("Oklahoma City-Thunder");
    expect(parsed?.picks[0].games).toBe(6);
  });
});

describe("parsePicksFile", () => {
  it("parses multiple lines and skips blanks", () => {
    const submission: Submission = {
      timestamp: TIMESTAMP,
      name: "Sunny",
      picks: validPicks(),
    };
    const line1 = formatLine(submission);
    const line2 = formatLine({ ...submission, name: "Chris" });
    const file = `${line1}\n\n${line2}\n`;
    const parsed = parsePicksFile(file);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("Sunny");
    expect(parsed[1].name).toBe("Chris");
  });
});

describe("validateSubmission", () => {
  it("accepts a valid submission", () => {
    const result = validateSubmission(
      { name: "Sunny", picks: validPicks() },
      fullConfig()
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.picks).toHaveLength(8);
  });

  it("rejects when bracket is incomplete", () => {
    const config = fullConfig();
    config.east[0].team = "";
    const result = validateSubmission({ name: "Sunny", picks: validPicks() }, config);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not fully configured/i);
  });

  it("rejects empty name", () => {
    const result = validateSubmission({ name: "   ", picks: validPicks() }, fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/name/i) });
  });

  it("rejects an overlong name", () => {
    const result = validateSubmission(
      { name: "x".repeat(51), picks: validPicks() },
      fullConfig()
    );
    expect(result.ok).toBe(false);
  });

  it("rejects wrong number of picks", () => {
    const result = validateSubmission(
      { name: "Sunny", picks: validPicks().slice(0, 7) },
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/8 picks/i) });
  });

  it("rejects a duplicate seriesId", () => {
    const picks = validPicks();
    picks[1] = { ...picks[0] };
    const result = validateSubmission({ name: "Sunny", picks }, fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/duplicate/i) });
  });

  it("rejects an unknown seriesId", () => {
    const picks = validPicks();
    picks[0] = { seriesId: "E-99v99", winner: "E1", games: 4 };
    const result = validateSubmission({ name: "Sunny", picks }, fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/unknown/i) });
  });

  it("rejects a winner not in the matchup", () => {
    const picks = validPicks();
    picks[0] = { seriesId: "E-1v8", winner: "W1", games: 4 };
    const result = validateSubmission({ name: "Sunny", picks }, fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/winner/i) });
  });

  it("rejects invalid games count", () => {
    const picks = validPicks() as unknown as Array<Record<string, unknown>>;
    picks[0] = { seriesId: "E-1v8", winner: "E1", games: 3 };
    const result = validateSubmission(
      { name: "Sunny", picks: picks as unknown as Pick[] },
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/games/i) });
  });

  it("rejects non-array picks", () => {
    const result = validateSubmission({ name: "Sunny", picks: "nope" }, fullConfig());
    expect(result.ok).toBe(false);
  });

  it("returns picks in canonical SERIES_IDS order", () => {
    const picks = validPicks().slice().reverse();
    const result = validateSubmission({ name: "Sunny", picks }, fullConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.picks.map((p) => p.seriesId)).toEqual([
        "E-1v8",
        "E-4v5",
        "E-3v6",
        "E-2v7",
        "W-1v8",
        "W-4v5",
        "W-3v6",
        "W-2v7",
      ]);
    }
  });
});
