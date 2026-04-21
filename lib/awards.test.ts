import { describe, it, expect } from "vitest";
import {
  formatAwardsLine,
  parseAwardsLine,
  parseAwardsFile,
  validateAwardsSubmission,
  type AwardsSubmission,
} from "./awards";

const TIMESTAMP = "2026-04-20T11:54:32+10:00";

function validSubmission(): AwardsSubmission {
  return {
    timestamp: TIMESTAMP,
    name: "Sunny",
    mvp: "Nikola Jokic",
    roy: "Cooper Flagg",
    mip: "Scottie Barnes",
    smoy: "Malik Beasley",
    coy: "Kenny Atkinson",
    allNBA: {
      first: ["Nikola Jokic", "Shai Gilgeous-Alexander", "Luka Doncic", "Giannis Antetokounmpo", "Jayson Tatum"],
      second: ["Anthony Edwards", "Tyrese Haliburton", "LeBron James", "Kevin Durant", "Victor Wembanyama"],
      third: ["Stephen Curry", "Devin Booker", "Jalen Brunson", "Anthony Davis", "Donovan Mitchell"],
    },
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  const s = validSubmission();
  return {
    name: s.name,
    mvp: s.mvp,
    roy: s.roy,
    mip: s.mip,
    smoy: s.smoy,
    coy: s.coy,
    allNBA: s.allNBA,
    ...overrides,
  };
}

describe("formatAwardsLine & parseAwardsLine", () => {
  it("round-trips a submission", () => {
    const submission = validSubmission();
    const line = formatAwardsLine(submission);
    expect(line.startsWith(`${TIMESTAMP} | Sunny | `)).toBe(true);
    const parsed = parseAwardsLine(line);
    expect(parsed).toEqual(submission);
  });

  it("preserves player names with commas, hyphens, dots, and apostrophes", () => {
    const submission: AwardsSubmission = {
      ...validSubmission(),
      allNBA: {
        first: [
          "Shai Gilgeous-Alexander, Jr.",
          "O'Neal III",
          "D.J. Smith",
          "R. Jones",
          "Jayson Tatum",
        ],
        second: validSubmission().allNBA.second,
        third: validSubmission().allNBA.third,
      },
    };
    const line = formatAwardsLine(submission);
    const parsed = parseAwardsLine(line);
    expect(parsed?.allNBA.first[0]).toBe("Shai Gilgeous-Alexander, Jr.");
    expect(parsed?.allNBA.first[1]).toBe("O'Neal III");
    expect(parsed?.allNBA.first[2]).toBe("D.J. Smith");
  });

  it("sanitizes pipe characters in name and player fields", () => {
    const s = validSubmission();
    s.name = "Su|nny";
    s.mvp = "Jok|ic";
    const line = formatAwardsLine(s);
    expect(line).not.toContain("Su|nny");
    expect(line).not.toContain("Jok|ic");
    const parsed = parseAwardsLine(line);
    expect(parsed?.name).toBe("Su nny");
    expect(parsed?.mvp).toBe("Jok ic");
  });

  it("returns null for malformed lines", () => {
    expect(parseAwardsLine("bad")).toBeNull();
    expect(parseAwardsLine(`${TIMESTAMP} | name | {not-json}`)).toBeNull();
    expect(parseAwardsLine(`${TIMESTAMP} | name | {"mvp":"x"}`)).toBeNull(); // missing allNBA
  });

  it("tolerates legacy lines missing mip/smoy/coy", () => {
    const legacyPayload = {
      mvp: "Nikola Jokic",
      roy: "Cooper Flagg",
      allNBA: {
        first: ["A1", "A2", "A3", "A4", "A5"],
        second: ["B1", "B2", "B3", "B4", "B5"],
        third: ["C1", "C2", "C3", "C4", "C5"],
      },
    };
    const legacyLine = `${TIMESTAMP} | Sunny | ${JSON.stringify(legacyPayload)}`;
    const parsed = parseAwardsLine(legacyLine);
    expect(parsed).not.toBeNull();
    expect(parsed?.mvp).toBe("Nikola Jokic");
    expect(parsed?.roy).toBe("Cooper Flagg");
    expect(parsed?.mip).toBe("");
    expect(parsed?.smoy).toBe("");
    expect(parsed?.coy).toBe("");
  });
});

describe("parseAwardsFile", () => {
  it("parses multiple lines and skips blanks", () => {
    const a = formatAwardsLine({ ...validSubmission(), name: "A" });
    const b = formatAwardsLine({ ...validSubmission(), name: "B" });
    const parsed = parseAwardsFile(`${a}\n\n${b}\n`);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("A");
    expect(parsed[1].name).toBe("B");
  });
});

describe("validateAwardsSubmission", () => {
  it("accepts a valid submission", () => {
    const result = validateAwardsSubmission(validBody());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mvp).toBe("Nikola Jokic");
      expect(result.mip).toBe("Scottie Barnes");
      expect(result.smoy).toBe("Malik Beasley");
      expect(result.coy).toBe("Kenny Atkinson");
      expect(result.allNBA.first).toHaveLength(5);
    }
  });

  it("rejects empty name", () => {
    const result = validateAwardsSubmission(validBody({ name: "   " }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/name/i) });
  });

  it("rejects overlong name", () => {
    const result = validateAwardsSubmission(validBody({ name: "x".repeat(51) }));
    expect(result.ok).toBe(false);
  });

  it("rejects missing MVP", () => {
    const result = validateAwardsSubmission(validBody({ mvp: "  " }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/mvp/i) });
  });

  it("rejects missing ROY", () => {
    const result = validateAwardsSubmission(validBody({ roy: "" }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/rookie/i) });
  });

  it("rejects missing MIP", () => {
    const result = validateAwardsSubmission(validBody({ mip: "  " }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/improved/i) });
  });

  it("rejects missing 6MOY", () => {
    const result = validateAwardsSubmission(validBody({ smoy: "" }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/sixth/i) });
  });

  it("rejects missing COY", () => {
    const result = validateAwardsSubmission(validBody({ coy: "  " }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/coach/i) });
  });

  it("rejects overlong MVP name", () => {
    const result = validateAwardsSubmission(validBody({ mvp: "x".repeat(61) }));
    expect(result.ok).toBe(false);
  });

  it("rejects overlong MIP name", () => {
    const result = validateAwardsSubmission(validBody({ mip: "x".repeat(61) }));
    expect(result.ok).toBe(false);
  });

  it("rejects overlong 6MOY name", () => {
    const result = validateAwardsSubmission(validBody({ smoy: "x".repeat(61) }));
    expect(result.ok).toBe(false);
  });

  it("rejects overlong COY name", () => {
    const result = validateAwardsSubmission(validBody({ coy: "x".repeat(61) }));
    expect(result.ok).toBe(false);
  });

  it("rejects wrong team size", () => {
    const result = validateAwardsSubmission(
      validBody({
        allNBA: {
          first: validSubmission().allNBA.first.slice(0, 4),
          second: validSubmission().allNBA.second,
          third: validSubmission().allNBA.third,
        },
      })
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/5 players/i) });
  });

  it("rejects empty player slot", () => {
    const first = [...validSubmission().allNBA.first];
    first[2] = "";
    const result = validateAwardsSubmission(
      validBody({
        allNBA: {
          first,
          second: validSubmission().allNBA.second,
          third: validSubmission().allNBA.third,
        },
      })
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/#3/) });
  });

  it("rejects a non-string player", () => {
    const first = [...validSubmission().allNBA.first] as unknown[];
    first[0] = 42;
    const result = validateAwardsSubmission(
      validBody({
        allNBA: {
          first,
          second: validSubmission().allNBA.second,
          third: validSubmission().allNBA.third,
        },
      })
    );
    expect(result.ok).toBe(false);
  });

  it("rejects missing allNBA object", () => {
    const result = validateAwardsSubmission(validBody({ allNBA: undefined }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/allNBA/i) });
  });

  it("trims player names in the returned result", () => {
    const first = validSubmission().allNBA.first.slice();
    first[0] = `   ${first[0]}   `;
    const result = validateAwardsSubmission(
      validBody({
        allNBA: {
          first,
          second: validSubmission().allNBA.second,
          third: validSubmission().allNBA.third,
        },
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.allNBA.first[0]).toBe("Nikola Jokic");
    }
  });
});
