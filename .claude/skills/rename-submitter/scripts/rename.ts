#!/usr/bin/env -S npx tsx
// Rename a submitter across picks.txt, picks-r2.txt, picks-r3.txt, awards.txt.
//
// Usage (from project root):
//   set -a && source .env.local && set +a && \
//     npx tsx .claude/skills/rename-submitter/scripts/rename.ts "<OLD>" "<NEW>"

import { copyFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as picks from "@/lib/picks";
import * as r2lib from "@/lib/round2";
import * as r3lib from "@/lib/round3";
import * as awards from "@/lib/awards";

const cwd = process.cwd();
const [, , OLD_RAW, NEW_RAW] = process.argv;

if (!OLD_RAW || !NEW_RAW) {
  console.error('Usage: rename.ts "<OLD>" "<NEW>"');
  process.exit(1);
}
const OLD = OLD_RAW.trim();
const NEW = NEW_RAW.trim();
if (!OLD || !NEW) {
  console.error("Both OLD and NEW must be non-empty after trim.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function main(): Promise<void> {
const r1Raw = await picks.readPicksRaw();
const r2Raw = await picks.readPicksRaw(picks.ROUND2_BLOB_PATHNAME);
const r3Raw = await picks.readPicksRaw(picks.ROUND3_BLOB_PATHNAME);
const awRaw = await awards.readAwardsRaw();

const r1Subs = picks.parsePicksFile(r1Raw);
const r2Subs = r2lib.parseRound2File(r2Raw);
const r3Subs = r3lib.parseRound3File(r3Raw);
const awSubs = awards.parseAwardsFile(awRaw);

console.log(
  `Loaded: picks.txt (${r1Subs.length} subs) · picks-r2.txt (${r2Subs.length} subs) · picks-r3.txt (${r3Subs.length} subs) · awards.txt (${awSubs.length} subs)`
);

interface Named { name: string }
const matchCount = (subs: Named[]) =>
  subs.filter((s) => s.name.trim() === OLD).length;

const r1N = matchCount(r1Subs);
const r2N = matchCount(r2Subs);
const r3N = matchCount(r3Subs);
const awN = matchCount(awSubs);

console.log(
  `Matches for "${OLD}": picks.txt=${r1N} · picks-r2.txt=${r2N} · picks-r3.txt=${r3N} · awards.txt=${awN}`
);

if (r1N + r2N + r3N + awN === 0) {
  console.log("Nothing to rename.");
  process.exit(0);
}

interface FormattedSub { name: string }
const rename = <T extends FormattedSub>(s: T): T =>
  s.name.trim() === OLD ? { ...s, name: NEW } : s;

const writes: { label: string; localPath: string; pathname?: string; content: string; verify: () => Promise<string> }[] = [];

if (r1N > 0) {
  const out = r1Subs.map((s) => picks.formatLine(rename(s))).join("\n") + "\n";
  if (picks.parsePicksFile(out).length !== r1Subs.length) {
    throw new Error("picks.txt: parse-roundtrip count mismatch");
  }
  writes.push({
    label: "picks.txt",
    localPath: resolve(cwd, "picks.txt"),
    content: out,
    verify: async () => picks.readPicksRaw(),
  });
}

if (r2N > 0) {
  const out =
    r2Subs.map((s) => r2lib.formatRound2Line(rename(s))).join("\n") + "\n";
  if (r2lib.parseRound2File(out).length !== r2Subs.length) {
    throw new Error("picks-r2.txt: parse-roundtrip count mismatch");
  }
  writes.push({
    label: "picks-r2.txt",
    localPath: resolve(cwd, "picks-r2.txt"),
    content: out,
    verify: async () => picks.readPicksRaw(picks.ROUND2_BLOB_PATHNAME),
  });
}

if (r3N > 0) {
  const out =
    r3Subs.map((s) => r3lib.formatRound3Line(rename(s))).join("\n") + "\n";
  if (r3lib.parseRound3File(out).length !== r3Subs.length) {
    throw new Error("picks-r3.txt: parse-roundtrip count mismatch");
  }
  writes.push({
    label: "picks-r3.txt",
    localPath: resolve(cwd, "picks-r3.txt"),
    content: out,
    verify: async () => picks.readPicksRaw(picks.ROUND3_BLOB_PATHNAME),
  });
}

if (awN > 0) {
  const out =
    awSubs.map((s) => awards.formatAwardsLine(rename(s))).join("\n") + "\n";
  if (awards.parseAwardsFile(out).length !== awSubs.length) {
    throw new Error("awards.txt: parse-roundtrip count mismatch");
  }
  writes.push({
    label: "awards.txt",
    localPath: resolve(cwd, "awards.txt"),
    content: out,
    verify: async () => awards.readAwardsRaw(),
  });
}

// Back up + write locally
for (const w of writes) {
  try {
    copyFileSync(w.localPath, `${w.localPath}.bak`);
  } catch {
    // file may not exist locally yet; harmless
  }
  writeFileSync(w.localPath, w.content);
}
console.log("Backed up + wrote locally: " + writes.map((w) => w.label).join(", "));

// Push to blobs
for (const w of writes) {
  if (w.label === "picks.txt") await picks.writePicksRaw(w.content);
  else if (w.label === "picks-r2.txt") await picks.writePicksRaw(w.content, picks.ROUND2_BLOB_PATHNAME);
  else if (w.label === "picks-r3.txt") await picks.writePicksRaw(w.content, picks.ROUND3_BLOB_PATHNAME);
  else if (w.label === "awards.txt") await awards.writeAwardsRaw(w.content);
}
console.log("Uploaded: " + writes.map((w) => w.label).join(", "));

// Verify
const count = (s: string, sub: string) => s.split(sub).length - 1;
let allOk = true;
for (const w of writes) {
  const after = await w.verify();
  const oldCount = count(after, OLD);
  const newCount = count(after, NEW);
  const byteMatch = w.content === after;
  if (!byteMatch) allOk = false;
  console.log(
    `${w.label}: OLD now=${oldCount} · NEW now=${newCount} · byte match=${byteMatch}`
  );
}

if (!allOk) {
  console.error(
    "\n⚠️  At least one blob did not byte-match after upload. Investigate before doing anything else."
  );
  process.exit(1);
}
}
