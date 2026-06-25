import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CashReason } from "@prisma/client";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id } });
    if (request.status !== "pending") throw new Error("Already processed");

    const account = await tx.cashAccount.findUniqueOrThrow({ where: { userId: request.userId } });
    if (account.balanceCents < request.amountCents) throw new Error("Insufficient balance");

    await tx.cashAccount.update({
      where: { userId: request.userId },
      data: { balanceCents: { decrement: request.amountCents } },
    });

    await tx.cashLedgerEntry.create({
      data: {
        accountId: account.id,
        deltaCents: -request.amountCents,
        reason: CashReason.withdrawal,
        refId: id,
      },
    });

    await tx.withdrawalRequest.update({
      where: { id },
      data: { status: "approved", resolvedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true });
}
