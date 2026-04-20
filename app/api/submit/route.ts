import { NextRequest, NextResponse } from "next/server";
import bracket from "@/bracket.json";
import { appendSubmissionLine, formatLine, validateSubmission } from "@/lib/picks";
import type { BracketConfig } from "@/lib/bracket";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateSubmission(body as Record<string, unknown>, bracket as BracketConfig);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const name = ((body as { name?: unknown }).name as string).trim();
  const timestamp = new Date().toISOString();
  const line = formatLine({ timestamp, name, picks: result.picks });

  try {
    await appendSubmissionLine(line);
  } catch (err) {
    console.error("Failed to append picks line:", err);
    return NextResponse.json({ ok: false, error: "Failed to save picks" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: "/api/picks", line });
}
