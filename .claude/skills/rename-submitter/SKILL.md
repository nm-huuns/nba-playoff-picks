---
name: rename-submitter
description: Rename a submitter (e.g. "Tower of Amenity" → "Yip", "Monty Yiu" → "Monty") across all three NBA Playoff Picks submission blobs (picks.txt, picks-r2.txt, awards.txt) at once. Use whenever a user asks to rename, canonicalize, alias, merge, or fix the spelling of a person's name in submissions. The leaderboard joins names by lowercased trimmed string, so consistent canonical names matter.
---

# rename-submitter

Rename one submitter across all three submission blobs in a single round-trip, using the project's parsers and formatters (not string replacement, which can corrupt JSON payloads inside award lines).

## Why a dedicated skill

The submission blobs use three different line formats:

| Blob | Format |
|------|--------|
| `picks.txt` | `<ts> \| <name> \| <picks-csv> \| EAST=<team>;WEST=<team>` |
| `picks-r2.txt` | `<ts> \| <name> \| <picks-csv>` |
| `awards.txt` | `<ts> \| <name> \| <JSON payload>` |

A naïve `sed` / `replace-all` on the OLD name string can match inside the awards JSON payload — player names in All-NBA picks are free-text and could collide. The safe approach is **parse → mutate the `name` field → reformat** using the project's existing helpers, which guarantees the line format stays intact.

## Mechanics

A ready-to-run script lives at `${CLAUDE_SKILL_DIR}/scripts/rename.ts`. It:

1. Reads all three blobs fresh.
2. For each blob, parses with the appropriate `parse*File` helper.
3. Filters submissions where `s.name.trim() === OLD` and rewrites the name to `NEW`.
4. Reformats with the matching `format*Line` helper, joins lines, writes locally and to the blob.
5. Re-reads each blob and asserts byte-equality vs the local content.
6. Skips blobs with zero matches (no unnecessary writes).
7. Backs up modified files locally as `*.bak`.

## Invocation

From the project root, with `.env.local` containing `BLOB_READ_WRITE_TOKEN`:

```bash
set -a && source .env.local && set +a && \
  npx tsx .claude/skills/rename-submitter/scripts/rename.ts "<OLD>" "<NEW>"
```

Quote both names. Example:

```bash
... npx tsx .claude/skills/rename-submitter/scripts/rename.ts "Monty Yiu" "Monty"
```

## Safety checklist

1. **Lock the affected sections** via `/results` before running, so an in-flight submission can't clobber the rewrite. The script touches all three blobs — easiest to lock all three.
2. **Confirm with the user** before running if any of these are true:
   - The OLD name partially matches another person's name (e.g. renaming "Sun" when "Sunny" also exists). The script uses exact match after trim, so this is normally safe, but worth a sanity-eyeball.
   - The user asked to "merge" two distinct submitters (different people who happened to use the same name). Renaming will collapse them into one leaderboard entry.
3. **Don't run with empty NEW**. The validators won't accept `""` for a name on subsequent submissions, but historical lines would still parse with empty names — the script refuses empty strings.
4. **Unlock** the sections after.

## How matches are counted

The script reports matches per blob before writing. It uses `s.name.trim() === OLD` after parsing, which means:

- Whitespace differences in storage are normalized.
- Case sensitivity is **strict** — `"Yip"` and `"yip"` are different. If you need case-insensitive renaming, edit the script's predicate.

## Leaderboard implications

`lib/scoring.ts` joins submission streams by `name.trim().toLowerCase()`. So:

- A submitter who appears as `"Monty Yiu"` in awards but `"Monty"` in R1 is treated as **two leaderboard entries**. Canonicalize via this skill to merge them.
- After renaming, the home page's leaderboard will reflect the merge on next page load (`force-dynamic`, no cache).

## Output the script prints

```
Loaded: picks.txt (N subs) · picks-r2.txt (N subs) · awards.txt (N subs)
Matches for "<OLD>": picks.txt=X · picks-r2.txt=Y · awards.txt=Z
Backed up <files>
Uploaded <files>
After: <blob>: OLD now=0 · NEW now=K · byte match=true
```

If any post-write byte match is `false`, **stop** and investigate before doing anything else — something corrupted the format.
