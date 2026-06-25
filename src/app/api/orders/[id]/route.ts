import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelOrder } from "@/lib/matching-engine";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await cancelOrder({ orderId: id, userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to cancel order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
