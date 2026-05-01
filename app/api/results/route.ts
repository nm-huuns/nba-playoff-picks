import { NextRequest, NextResponse } from "next/server";
import {
  readResultsState,
  validateResultsState,
  writeResultsState,
} from "@/lib/results";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readResultsState();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = validateResultsState(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await writeResultsState(result.state);
    return NextResponse.json(result.state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("Failed to write results:", err);
    return NextResponse.json(
      { error: `Failed to save results — ${detail}` },
      { status: 500 }
    );
  }
}
