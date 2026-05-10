---
name: blob-admin
description: Pull, edit, and push the Vercel Blob files for the NBA Playoff Picks project (picks.txt, picks-r2.txt, awards.txt, lock.json, results.json). Use when the user asks to inspect, repair, or hand-edit blob contents directly — e.g. "fix a typo in submissions", "rewrite awards.txt", "manually update results", "what's in the lock file". For renaming a submitter across all three submission blobs, use the rename-submitter skill instead.
---

# blob-admin

Direct read/write of the five Vercel Blob files used by the NBA Playoff Picks project. Use this skill any time you need to bypass the app UI and operate on the raw blob storage.

## Why a skill exists for this

The Vercel CLI's `vercel blob put` defaults to public access and **fails on this project's private store**. The repo's existing blob helpers (`lib/picks.ts`, `lib/awards.ts`, `lib/lock.ts`, `lib/results.ts`) are pre-configured with `access: "private"`, so use them via a one-off `tsx` script — not the CLI.

## Blob inventory

| Local filename     | Helper module    | Read function                                   | Write function                            |
|--------------------|------------------|-------------------------------------------------|-------------------------------------------|
| `picks.txt`        | `lib/picks.ts`   | `readPicksRaw()`                                | `writePicksRaw(content)`                  |
| `picks-r2.txt`     | `lib/picks.ts`   | `readPicksRaw(ROUND2_BLOB_PATHNAME)`            | `writePicksRaw(content, ROUND2_BLOB_PATHNAME)` |
| `awards.txt`       | `lib/awards.ts`  | `readAwardsRaw()`                               | `writeAwardsRaw(content)`                 |
| `lock.json`        | `lib/lock.ts`    | `readLockState()` (returns parsed object)       | `writeLockState(state)`                   |
| `results.json`     | `lib/results.ts` | `readResultsState()` (returns parsed object)    | `writeResultsState(state)`                |

Parsers, format helpers, and validators sit alongside in the same modules. Reach for `parsePicksFile` / `parseRound2File` / `parseAwardsFile` and their `formatLine` / `formatRound2Line` / `formatAwardsLine` counterparts when editing structured content — string replacement on the raw text can corrupt the line format.

## The auth pattern

`tsx` does not auto-load `.env.local`, so source it inline before any command that needs `BLOB_READ_WRITE_TOKEN`:

```bash
set -a && source .env.local && set +a && npx tsx -e '...'
```

If `.env.local` is missing, run `vercel env pull .env.local` first.

## Safety checklist

Before editing **any** blob:

1. **Lock the relevant section** via the toggles on `/results`. The append paths in `/api/submit*` do read-modify-write; an in-flight submission during your edit can clobber your changes (or vice-versa).
2. **Pull first** to get the latest state — never edit a stale local copy.
3. **Snapshot** locally with `cp <file>.txt <file>.bak` before writing.
4. **Verify after upload** by re-reading the blob and asserting byte-equality against the local file. The script template below does this automatically.
5. **Unlock** the section after you're done.
6. **Don't commit** local snapshots — `picks.txt`, `picks-r2.txt`, `awards.txt`, `lock.json`, `results.json`, `*.bak` are already in `.gitignore`.

## Helper scripts

Two ready-to-run scripts live in this skill's folder:

- `scripts/pull.ts <name>` — downloads a blob to local disk
- `scripts/push.ts <name>` — uploads a local file to the blob, with re-read byte verification

Where `<name>` is one of: `picks` (picks.txt), `r2` (picks-r2.txt), `awards` (awards.txt), `lock` (lock.json), `results` (results.json).

Invocation:

```bash
set -a && source .env.local && set +a && npx tsx ${CLAUDE_SKILL_DIR}/scripts/pull.ts awards
# ...edit awards.txt locally...
set -a && source .env.local && set +a && npx tsx ${CLAUDE_SKILL_DIR}/scripts/push.ts awards
```

## Example workflows

### Inspect what's in a blob

```bash
set -a && source .env.local && set +a && npx tsx ${CLAUDE_SKILL_DIR}/scripts/pull.ts awards
cat awards.txt
```

### Rewrite by hand (e.g. fix a typo in a single line)

1. Lock the section on `/results`.
2. `pull.ts awards`
3. Edit `awards.txt` in your editor — preserve the line format strictly: each line is `<ISO ts> | <name> | <JSON>`. The JSON must round-trip through `JSON.parse` cleanly. Pipes (`|`) and newlines inside fields will break parsing — strip them or stick to text the parser tolerates (commas, dots, hyphens, apostrophes, accents are all safe).
4. `push.ts awards`
5. Unlock.

### Programmatic edit (e.g. apply a regex across all submission lines)

Inline the script — read raw, parse with the appropriate `parse*File` helper, transform each `Submission` object, reformat with the matching `format*Line` helper, write back. The `rename-submitter` skill is the canonical example of this pattern.

### Reset / clear a blob

```bash
set -a && source .env.local && set +a && npx tsx -e '
import("./lib/awards").then(async ({ writeAwardsRaw }) => {
  await writeAwardsRaw("");
  console.log("awards.txt cleared");
})
'
```

⚠️ Destructive. Only run after the user explicitly confirms.

## Tips and gotchas

- The leaderboard joins names by `name.trim().toLowerCase()` — keep that in mind when editing names.
- Awards lines tolerate **legacy fields** (early lines have no `mip` / `smoy` / `coy` / `dpoy`) — `parseAwardsLine` defaults missing fields to `""`.
- R1 `picks.txt` lines tolerate missing trailing `EAST=...;WEST=...` segment — early lines without it parse with `conferenceWinners: undefined`.
- `lock.json` accepts both the new `{r1, r2, awards}` shape and the legacy `{locked: bool}` shape (legacy → maps to `{r1: locked, r2: false, awards: false}`).
- The `/results` page is `force-dynamic` — your edits show up on the next page load, no deploy needed.
