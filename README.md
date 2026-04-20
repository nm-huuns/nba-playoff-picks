# NBA Playoff Picks

A small Next.js app where users submit their NBA playoff first-round series picks via a form. Every submission is appended (with a timestamp and submitter name) to a plain-text file published at `/api/picks`.

## Quick start

```bash
nvm use 20
npm install
cp .env.local.example .env.local  # then fill in BLOB_READ_WRITE_TOKEN
npm run dev
```

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4
- Vercel Blob for persistence
- Vitest for unit tests

## Configuring the bracket

Edit `bracket.json` — fill in the 8 East and 8 West teams (ordered by seed 1–8). Rows with an empty team string render as "TBD" in the UI and the `/api/submit` endpoint rejects submissions until all 16 are set.

First-round matchups are derived automatically: seed 1 vs 8, 4 vs 5, 3 vs 6, 2 vs 7 per conference.

## Endpoints

- `GET /` — picks form and recent submissions
- `POST /api/submit` — `{ name, picks }` JSON; appends a line to `picks.txt`
- `GET /api/picks` — returns the raw `picks.txt` contents as text/plain

## Running tests

```bash
npm test
```

## Plan

See `PLAN.md` for the full project plan.
