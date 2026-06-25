import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requests = await prisma.withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r) => ({ ...r, amountCents: r.amountCents.toString() }))
  );
}
