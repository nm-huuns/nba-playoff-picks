import { describe, it, expect } from "vitest";
import {
  formatFinalsLine,
  parseFinalsLine,
  parseFinalsFile,
  validateFinalsSubmission,
  type FinalsSubmission,
} from "./finals";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-06-01T00:00:00Z";

function fullConfig(): BracketConfig {
  return {
    season: "2025-26",
    east: Array.from({ length: 8 }, (_, i) => ({ seed: i + 1, team: `E${i + 1}` })),
    west: Array.from({ length: 8 }, (_, i) => ({ seed: i + 1, team: `W${i + 1}` })),
    finals: { id: "F-1", teamA: "Knicks", teamB: "Spurs" },
  };
}

function validSubmission(): FinalsSubmission {
  return {
    timestamp: TIMESTAMP,
    name: "Sunny",
    games: { G1: "Spurs", G2: "Spurs", G3: "Knicks", G4: "Spurs", G5: "Knicks", G6: "Spurs" },
    mvp: "Victor Wembanyama",
    pointsLeader: "Victor Wembanyama",
    reboundsLeader: "Jalen Brunson",
    assistsLeader: "Chris Paul",
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  const s = validSubmission();
  return {
    name: s.name,
    games: s.games,
    mvp: s.mvp,
    pointsLeader: s.pointsLeader,
    reboundsLeader: s.reboundsLeader,
    assistsLeader: s.assistsLeader,
    ...overrides,
  };
}

describe("formatFinalsLine & parseFinalsLine", () => {
  it("round-trips a submission", () => {
    const submission = validSubmission();
    const line = formatFinalsLine(submission);
    expect(line.startsWith(`${TIMESTAMP} | Sunny | `)).toBe(true);
    expect(parseFinalsLine(line)).toEqual(submission);
  });

  it("preserves player names with punctuation", () => {
    const submission: FinalsSubmission = {
      ...validSubmission(),
      mvp: "Shai Gilgeous-Alexander, Jr.",
    };
    const parsed = parseFinalsLine(formatFinalsLine(submission));
    expect(parsed?.mvp).toBe("Shai Gilgeous-Alexander, Jr.");
  });

  it("sanitizes pipes in the name", () => {
    const line = formatFinalsLine({ ...validSubmission(), name: "Su|nny" });
    expect(line.split(" | ")[1]).toBe("Su nny");
  });

  it("drops blank/missing game keys on round-trip", () => {
    const submission: FinalsSubmission = {
      ...validSubmission(),
      games: { G1: "Spurs", G2: "Knicks", G3: "Spurs", G4: "Knicks" },
    };
    const parsed = parseFinalsLine(formatFinalsLine(submission));
    expect(parsed?.games).toEqual({ G1: "Spurs", G2: "Knicks", G3: "Spurs", G4: "Knicks" });
    expect(parsed?.games.G5).toBeUndefined();
  });

  it("returns null for malformed / legacy lines", () => {
    expect(parseFinalsLine("bad")).toBeNull();
    // Old winner+games format must not crash the parser:
    expect(parseFinalsLine(`${TIMESTAMP} | Sunny | F-1:San Antonio Spurs-6`)).toBeNull();
  });
});

describe("parseFinalsFile", () => {
  it("parses multiple lines and skips blanks + legacy lines", () => {
    const a = formatFinalsLine({ ...validSubmission(), name: "A" });
    const b = formatFinalsLine({ ...validSubmission(), name: "B" });
    const legacy = `${TIMESTAMP} | Old | F-1:Spurs-6`;
    const parsed = parseFinalsFile(`${a}\n${legacy}\n\n${b}\n`);
    expect(parsed.map((s) => s.name)).toEqual(["A", "B"]);
  });
});

describe("validateFinalsSubmission", () => {
  it("accepts a valid submission", () => {
    const result = validateFinalsSubmission(validBody(), fullConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.games.G1).toBe("Spurs");
      expect(result.mvp).toBe("Victor Wembanyama");
    }
  });

  it("accepts a 'dumb' 2-2 split across the required games", () => {
    const result = validateFinalsSubmission(
      validBody({ games: { G1: "Spurs", G2: "Spurs", G3: "Knicks", G4: "Knicks" } }),
      fullConfig()
    );
    expect(result.ok).toBe(true);
  });

  it("rejects when finals not configured", () => {
    const config = fullConfig();
    config.finals = undefined;
    expect(validateFinalsSubmission(validBody(), config).ok).toBe(false);
  });

  it("rejects a missing required game (G1–G4)", () => {
    const result = validateFinalsSubmission(
      validBody({ games: { G1: "Spurs", G2: "Spurs", G3: "Knicks" } }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/G4/) });
  });

  it("allows missing optional games (G5–G7)", () => {
    const result = validateFinalsSubmission(
      validBody({ games: { G1: "Spurs", G2: "Spurs", G3: "Spurs", G4: "Spurs" } }),
      fullConfig()
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a game winner not in the matchup", () => {
    const result = validateFinalsSubmission(
      validBody({ games: { G1: "Lakers", G2: "Spurs", G3: "Knicks", G4: "Spurs" } }),
      fullConfig()
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/G1/) });
  });

  it("rejects empty name", () => {
    expect(validateFinalsSubmission(validBody({ name: "  " }), fullConfig()).ok).toBe(false);
  });

  it("rejects a missing MVP", () => {
    const result = validateFinalsSubmission(validBody({ mvp: "" }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/MVP/i) });
  });

  it("rejects a missing series leader", () => {
    const result = validateFinalsSubmission(validBody({ assistsLeader: "" }), fullConfig());
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/assists/i) });
  });
});
