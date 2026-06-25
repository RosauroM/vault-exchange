import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// DEV ONLY — remove before deploying to production
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

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

  const response = NextResponse.redirect(new URL("/market", "http://localhost:3000"));

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    expires,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
