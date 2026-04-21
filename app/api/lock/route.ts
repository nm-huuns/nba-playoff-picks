import { NextRequest, NextResponse } from "next/server";
import { isLockKind, readLockState, toggleLockKind } from "@/lib/lock";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readLockState();
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
      { error: "Invalid JSON body — expected {kind: 'r1'|'r2'|'awards'}" },
      { status: 400 }
    );
  }
  const kind = (body as { kind?: unknown })?.kind;
  if (!isLockKind(kind)) {
    return NextResponse.json(
      { error: "kind must be one of: r1, r2, awards" },
      { status: 400 }
    );
  }
  try {
    const next = await toggleLockKind(kind);
    return NextResponse.json(next, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("Failed to toggle lock:", err);
    return NextResponse.json(
      { error: `Failed to toggle lock — ${detail}` },
      { status: 500 }
    );
  }
}
