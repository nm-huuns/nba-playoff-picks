import { readPicksRaw } from "@/lib/picks";

export const dynamic = "force-dynamic";

export async function GET() {
  const contents = await readPicksRaw();
  return new Response(contents, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
