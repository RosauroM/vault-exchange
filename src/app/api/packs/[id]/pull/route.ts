import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openPack } from "@/lib/pack-engine";

// Multi-pull: runs N independent pack draws in one request
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { count = 1 } = await req.json().catch(() => ({}));
  const pulls = Math.min(Math.max(1, count), 10);

  const results = [];
  for (let i = 0; i < pulls; i++) {
    try {
      const result = await openPack({ packId: id, userId: session.user.id });
      results.push({ index: i, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      results.push({ index: i, won: false, cardId: null, sharesAwarded: 0, evCents: 0, error: message });
    }
  }

  return NextResponse.json({ results });
}
