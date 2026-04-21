import { NextRequest, NextResponse } from "next/server";
import {
  appendAwardsLine,
  formatAwardsLine,
  validateAwardsSubmission,
} from "@/lib/awards";
import { readLockState } from "@/lib/lock";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const lockState = await readLockState();
  if (lockState.awards) {
    return NextResponse.json(
      { ok: false, error: "Award Winner picks are locked" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateAwardsSubmission(body as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const name = ((body as { name?: unknown }).name as string).trim();
  const timestamp = new Date().toISOString();
  const line = formatAwardsLine({
    timestamp,
    name,
    mvp: result.mvp,
    roy: result.roy,
    mip: result.mip,
    smoy: result.smoy,
    coy: result.coy,
    allNBA: result.allNBA,
  });

  try {
    await appendAwardsLine(line);
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("Failed to append awards line:", err);
    return NextResponse.json(
      { ok: false, error: `Failed to save picks — ${detail}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, line });
}
