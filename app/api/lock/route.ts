import { NextResponse } from "next/server";
import { readLockState, toggleLockState } from "@/lib/lock";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readLockState();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  try {
    const next = await toggleLockState();
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
