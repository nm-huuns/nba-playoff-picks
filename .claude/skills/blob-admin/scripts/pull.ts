#!/usr/bin/env -S npx tsx
// Pull a Vercel Blob to a local file. Run from the project root.
//
// Usage:
//   set -a && source .env.local && set +a && \
//     npx tsx .claude/skills/blob-admin/scripts/pull.ts <name>
//
// <name> ∈ picks | r2 | r3 | finals | awards | lock | results

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  readPicksRaw,
  ROUND2_BLOB_PATHNAME,
  ROUND3_BLOB_PATHNAME,
  FINALS_BLOB_PATHNAME,
} from "@/lib/picks";
import { readAwardsRaw } from "@/lib/awards";
import { readLockState } from "@/lib/lock";
import { readResultsState } from "@/lib/results";

const NAMES = ["picks", "r2", "r3", "finals", "awards", "lock", "results"] as const;
type Name = (typeof NAMES)[number];

const cwd = process.cwd();
const arg = process.argv[2];
if (!arg || !(NAMES as readonly string[]).includes(arg)) {
  console.error(`Usage: pull.ts <${NAMES.join(" | ")}>`);
  process.exit(1);
}
const name = arg as Name;

async function load(name: Name): Promise<{ pathname: string; content: string }> {
  if (name === "picks") {
    return { pathname: "picks.txt", content: await readPicksRaw() };
  }
  if (name === "r2") {
    return {
      pathname: "picks-r2.txt",
      content: await readPicksRaw(ROUND2_BLOB_PATHNAME),
    };
  }
  if (name === "r3") {
    return {
      pathname: "picks-r3.txt",
      content: await readPicksRaw(ROUND3_BLOB_PATHNAME),
    };
  }
  if (name === "finals") {
    return {
      pathname: "picks-finals.txt",
      content: await readPicksRaw(FINALS_BLOB_PATHNAME),
    };
  }
  if (name === "awards") {
    return { pathname: "awards.txt", content: await readAwardsRaw() };
  }
  if (name === "lock") {
    return {
      pathname: "lock.json",
      content: JSON.stringify(await readLockState(), null, 2) + "\n",
    };
  }
  if (name === "results") {
    return {
      pathname: "results.json",
      content: JSON.stringify(await readResultsState(), null, 2) + "\n",
    };
  }
  throw new Error(`unreachable: ${name as string}`);
}

load(name)
  .then(({ pathname, content }) => {
    writeFileSync(resolve(cwd, pathname), content);
    console.log(`pulled ${pathname} (${content.length} bytes)`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
