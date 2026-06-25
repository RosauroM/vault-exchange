import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openPack } from "@/lib/pack-engine";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await openPack({ packId: id, userId: session.user.id });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to open pack";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
