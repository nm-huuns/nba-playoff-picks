import { describe, it, expect } from "vitest";
import {
  formatFinalsLine,
  parseFinalsLine,
  parseFinalsFile,
  validateFinalsSubmission,
  type FinalsSubmission,
<<<<<<< HEAD
} from "./finals";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-06-01T00:00:00Z";
=======
  type FinalsPick,
} from "./finals";
import type { BracketConfig } from "./bracket";

const TIMESTAMP = "2026-05-25T11:00:00+10:00";
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9

function fullConfig(): BracketConfig {
  return {
    season: "2025-26",
<<<<<<< HEAD
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
=======
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
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
  });
});

describe("parseFinalsFile", () => {
<<<<<<< HEAD
  it("parses multiple lines and skips blanks + legacy lines", () => {
    const a = formatFinalsLine({ ...validSubmission(), name: "A" });
    const b = formatFinalsLine({ ...validSubmission(), name: "B" });
    const legacy = `${TIMESTAMP} | Old | F-1:Spurs-6`;
    const parsed = parseFinalsFile(`${a}\n${legacy}\n\n${b}\n`);
    expect(parsed.map((s) => s.name)).toEqual(["A", "B"]);
=======
  it("parses multiple lines and skips blanks", () => {
    const a = formatFinalsLine({ timestamp: TIMESTAMP, name: "A", picks: validPicks() });
    const b = formatFinalsLine({ timestamp: TIMESTAMP, name: "B", picks: validPicks() });
    const parsed = parseFinalsFile(`${a}\n\n${b}\n`);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("A");
    expect(parsed[1].name).toBe("B");
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
  });
});

describe("validateFinalsSubmission", () => {
  it("accepts a valid submission", () => {
    const result = validateFinalsSubmission(validBody(), fullConfig());
    expect(result.ok).toBe(true);
<<<<<<< HEAD
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
=======
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
>>>>>>> 62960904dbe28cdac004589c6455fbd6eb815be9
  });
});
