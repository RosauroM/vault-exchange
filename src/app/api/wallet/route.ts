import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.cashAccount.findUniqueOrThrow({
    where: { userId: session.user.id },
    include: {
      cashLedgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  return NextResponse.json({
    balanceCents: account.balanceCents.toString(),
    lockedCents: account.lockedCents.toString(),
    availableCents: (account.balanceCents - account.lockedCents).toString(),
    history: account.cashLedgerEntries.map((e) => ({
      id: e.id,
      deltaCents: e.deltaCents.toString(),
      reason: e.reason,
      refId: e.refId,
      createdAt: e.createdAt,
    })),
  });
}
