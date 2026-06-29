import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pulls = await prisma.packPull.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      pack: { select: { id: true, name: true, type: true } },
    },
  });

  // cardId is a plain string on PackPull (no FK relation in schema), so join manually
  const cardIds = [...new Set(pulls.map(p => p.cardId).filter(Boolean))] as string[];
  const cards = cardIds.length
    ? await prisma.card.findMany({
        where: { id: { in: cardIds } },
        select: { id: true, title: true, imageUrl: true, grade: true, grader: true },
      })
    : [];
  const cardMap = Object.fromEntries(cards.map(c => [c.id, c]));

  const enriched = pulls.map(p => ({
    ...p,
    card: p.cardId ? (cardMap[p.cardId] ?? null) : null,
  }));

  return NextResponse.json(enriched);
}
