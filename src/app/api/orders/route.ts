import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { placeOrder } from "@/lib/matching-engine";
import { OrderSide } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cardId, side, priceCents, quantity } = body;

  if (!cardId || !side || !priceCents || !quantity) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!["bid", "ask"].includes(side)) {
    return NextResponse.json({ error: "Invalid side" }, { status: 400 });
  }

  if (priceCents <= 0 || quantity <= 0 || !Number.isInteger(priceCents) || !Number.isInteger(quantity)) {
    return NextResponse.json({ error: "Invalid price or quantity" }, { status: 400 });
  }

  try {
    const result = await placeOrder({
      cardId,
      userId: session.user.id,
      side: side as OrderSide,
      priceCents,
      quantity,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
