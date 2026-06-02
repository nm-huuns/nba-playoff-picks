---
name: add-section
description: Scaffold a new series-pick section (e.g. a new playoff round, a play-in series) across the entire NBA Playoff Picks codebase. Generates the lib module + tests + API route + form + locked view + locks + results state + scoring + leaderboard column + admin form + submissions page + blob-admin script entries — ~17 files at once. Use when adding a new "round of picks" alongside the existing R1/R2/R3/Finals. Do NOT use for award-style sections (MVP-like single-entity picks) — they're structurally different.
---

# add-section

Scaffold a new series-pick section across all the files that need to know about it. Codifies the mechanical "mirror R3" boilerplate so you don't have to remember every file.

## Why this exists

Adding a single new round historically touches ~17 files: the lib module, its tests, the API route, the React form, the locked-list view, lock state, results state, scoring, scoring tests, page loader, tabs wiring, leaderboard column, admin form, results page submissions section, plus the blob-admin pull/push scripts. Every one of those is a small mechanical edit, but missing one breaks scoring or hides the tab. This skill automates the ritual.

## What it generates

Two layouts are supported:

| Variant | Example | Bracket shape | Form layout |
|---------|---------|---------------|-------------|
| `--conferenceSplit true` | Round 2, Round 3 | `{east: [...], west: [...]}` | Two-column East/West |
| `--conferenceSplit false` | Finals, Play-In tournament | `{id, teamA, teamB}` single object | Single centered card |

## Invocation

From the project root:

```bash
# Conference-split section (e.g. a new Round 4 with both conferences)
set -a && source .env.local && set +a && \
  npx tsx .claude/skills/add-section/scripts/scaffold.ts \
    --key r4 \
    --label "Round 4" \
    --conferenceSplit true \
    --east "E-r4-1" \
    --west "W-r4-1"

# Single-matchup section (e.g. NBA Cup final)
npx tsx .claude/skills/add-section/scripts/scaffold.ts \
  --key cup \
  --label "NBA Cup" \
  --conferenceSplit false \
  --matchupId "C-1"
```

Multiple east/west matchups: comma-separate the values (e.g. `--east "E-r4-1,E-r4-2"`).

## Behavior

1. **Dry-run preview**: prints the list of files that will be created and modified, with a one-line summary of each edit.
2. **Confirmation prompt**: `Proceed? [y/N]`. Default is no.
3. **Apply**: writes/edits all files in one pass.
4. **Post-scaffold checklist** (printed at the end):
   - `npx tsc --noEmit`
   - `npm test`
   - `npm run lint`
   - Fill in the actual `teamA`/`teamB` values in `bracket.json` (the scaffold leaves them as empty strings).
   - Optionally reorder the new tab in `app/PicksTabs.tsx`'s `TABS` array (scaffold inserts immediately after the `awards` entry).

## What it does NOT do

- **No award-style sections.** Awards has a totally different shape (single-entity picks + All-NBA team lists). The scaffold only knows series-pick sections.
- **No deploys.** Standard `git push` cycle to ship to production.
- **No team filling.** The scaffold leaves `teamA`/`teamB` blank. Edit `bracket.json` after.
- **No `PLAN.md` update.** PLAN.md is gitignored and personal — update it by hand.

## How it works internally

Templates for the four new files (`lib/<key>.ts`, `lib/<key>.test.ts`, `app/api/submit/<key>/route.ts`, `app/<Key>Form.tsx`) are inline string literals with `{{KEY}}`/`{{Key}}`/`{{LABEL}}` placeholders. The conference-split variant mirrors `lib/round3.ts` / `app/Round3Form.tsx`; the single-matchup variant mirrors `lib/finals.ts` / `app/FinalsForm.tsx`.

For the ~13 files that get edited (not created), the script defines a list of `Edit` operations — each one is an `insertAfter` / `insertBefore` / `replace` against a stable anchor string in the target file. Anchors are chosen to remain unique even after multiple sections have been added (typically using the `awards` entry as a boundary marker, since awards is the permanent last section).

If a file's expected anchor isn't found, the script aborts before writing anything and prints which anchor failed. That makes the scaffolder safe to re-run after a refactor — it'll fail loud rather than corrupt files silently.

## Limitations to be aware of

- **Anchors are coupled to current file shape.** If you refactor any of the target files (e.g. extract `buildLeaderboard` into a different signature), the corresponding anchor in `scaffold.ts` will need updating. Each anchor is annotated in the script with the file it targets, so finding what to update is straightforward.
- **Tab placement.** The new section is always inserted before `awards` in the TABS array. If you want a different position, edit `app/PicksTabs.tsx` after.
- **Single matchup, multiple matchups.** The single-matchup variant currently expects exactly one matchupId. If you ever need a non-conference-split section with multiple matchups (unlikely for NBA), edit the generated `bracket.json` and `app/<Key>Form.tsx` by hand.

## See also

- `blob-admin` skill — for pull/edit/push of the blob files this scaffold creates.
- `rename-submitter` skill — for collapsing duplicate submitter names across all sections (including any new one this skill adds).
