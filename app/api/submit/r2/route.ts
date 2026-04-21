import { NextRequest, NextResponse } from "next/server";
import bracket from "@/bracket.json";
import { appendSubmissionLine, ROUND2_BLOB_PATHNAME } from "@/lib/picks";
import { formatRound2Line, validateRound2Submission } from "@/lib/round2";
import { readLockState } from "@/lib/lock";
import type { BracketConfig } from "@/lib/bracket";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const lockState = await readLockState();
  if (lockState.r2) {
    return NextResponse.json(
      { ok: false, error: "Round 2 picks are locked" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateRound2Submission(
    body as Record<string, unknown>,
    bracket as BracketConfig
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const name = ((body as { name?: unknown }).name as string).trim();
  const timestamp = new Date().toISOString();
  const line = formatRound2Line({ timestamp, name, picks: result.picks });

  try {
    await appendSubmissionLine(line, ROUND2_BLOB_PATHNAME);
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("Failed to append Round 2 picks line:", err);
    return NextResponse.json(
      { ok: false, error: `Failed to save picks — ${detail}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, line });
}
