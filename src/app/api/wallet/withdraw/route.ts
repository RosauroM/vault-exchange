import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amountCents } = await req.json();
  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Minimum withdrawal is $1.00" }, { status: 400 });
  }

  const account = await prisma.cashAccount.findUniqueOrThrow({
    where: { userId: session.user.id },
  });
  const available = account.balanceCents - account.lockedCents;
  if (available < BigInt(amountCents)) {
    return NextResponse.json({ error: "Insufficient available balance" }, { status: 400 });
  }

  // Admin-gated: just create the request, no automated payout
  const request = await prisma.withdrawalRequest.create({
    data: { userId: session.user.id, amountCents: BigInt(amountCents) },
  });

  return NextResponse.json({ requestId: request.id, status: "pending" });
}
