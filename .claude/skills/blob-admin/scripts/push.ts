#!/usr/bin/env -S npx tsx
// Push a local file up to its Vercel Blob, with re-read byte verification.
// Run from the project root.
//
// Usage:
//   set -a && source .env.local && set +a && \
//     npx tsx .claude/skills/blob-admin/scripts/push.ts <name>
//
// <name> ∈ picks | r2 | awards | lock | results
//
// Plain-text blobs (picks, r2, awards) are uploaded byte-for-byte.
// JSON blobs (lock, results) are JSON.parse'd locally first; the helper
// re-stringifies them on write, so byte-equality won't hold for those —
// the script falls back to a structural-equality check instead.

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  readPicksRaw,
  writePicksRaw,
  ROUND2_BLOB_PATHNAME,
} from "@/lib/picks";
import { readAwardsRaw, writeAwardsRaw } from "@/lib/awards";
import { readLockState, writeLockState, type LockState } from "@/lib/lock";
import {
  readResultsState,
  writeResultsState,
  type ResultsState,
} from "@/lib/results";

const NAMES = ["picks", "r2", "awards", "lock", "results"] as const;
type Name = (typeof NAMES)[number];

const cwd = process.cwd();
const arg = process.argv[2];
if (!arg || !(NAMES as readonly string[]).includes(arg)) {
  console.error(`Usage: push.ts <${NAMES.join(" | ")}>`);
  process.exit(1);
}
const name = arg as Name;

const FILES: Record<Name, string> = {
  picks: "picks.txt",
  r2: "picks-r2.txt",
  awards: "awards.txt",
  lock: "lock.json",
  results: "results.json",
};

const localPath = resolve(cwd, FILES[name]);
if (!existsSync(localPath)) {
  console.error(`Local file ${FILES[name]} not found. Pull first?`);
  process.exit(1);
}

const localContent = readFileSync(localPath, "utf8");

// Backup
copyFileSync(localPath, `${localPath}.bak`);

async function pushAndVerify(): Promise<void> {
  if (name === "awards") {
    await writeAwardsRaw(localContent);
    const after = await readAwardsRaw();
    console.log(
      `awards.txt uploaded — byte match=${localContent === after}, size=${after.length}`
    );
    return;
  }
  if (name === "r2") {
    await writePicksRaw(localContent, ROUND2_BLOB_PATHNAME);
    const after = await readPicksRaw(ROUND2_BLOB_PATHNAME);
    console.log(
      `picks-r2.txt uploaded — byte match=${localContent === after}, size=${after.length}`
    );
    return;
  }
  if (name === "picks") {
    await writePicksRaw(localContent);
    const after = await readPicksRaw();
    console.log(
      `picks.txt uploaded — byte match=${localContent === after}, size=${after.length}`
    );
    return;
  }
  if (name === "lock") {
    const parsed = JSON.parse(localContent) as LockState;
    await writeLockState(parsed);
    const after = await readLockState();
    const match = JSON.stringify(parsed) === JSON.stringify(after);
    console.log(`lock.json uploaded — structural match=${match}`);
    return;
  }
  if (name === "results") {
    const parsed = JSON.parse(localContent) as ResultsState;
    await writeResultsState(parsed);
    const after = await readResultsState();
    const match = JSON.stringify(parsed) === JSON.stringify(after);
    console.log(`results.json uploaded — structural match=${match}`);
    return;
  }
}

pushAndVerify().catch((e) => {
  console.error(e);
  process.exit(1);
});
