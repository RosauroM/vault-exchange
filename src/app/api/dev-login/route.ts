import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@vaultexchange.com" },
  });

  if (!admin) {
    return NextResponse.json(
      { error: "Admin user not found — run: npm run db:seed" },
      { status: 404 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { sessionToken: token, userId: admin.id, expires },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const response = NextResponse.redirect(new URL("/market", appUrl));

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    expires,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
