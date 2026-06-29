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
      card: {
        select: { id: true, title: true, imageUrl: true, grade: true, grader: true },
      },
      pack: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  return NextResponse.json(pulls);
}
