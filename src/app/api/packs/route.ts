import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const packs = await prisma.pack.findMany({ where: { isActive: true } });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const enriched = await Promise.all(
    packs.map(async (pack) => {
      const claim = await prisma.dailyClaim.findUnique({
        where: {
          userId_packId_claimedDate: {
            userId: session.user!.id!,
            packId: pack.id,
            claimedDate: today,
          },
        },
      });
      return { ...pack, claimedToday: !!claim };
    })
  );

  return NextResponse.json(enriched);
}
