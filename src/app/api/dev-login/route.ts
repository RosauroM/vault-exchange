import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@vaultexchange.com" },
  });

  if (!admin) {
    return NextResponse.json(
      { error: "Admin user not found" },
      { status: 404 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { sessionToken: token, userId: admin.id, expires },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const isSecure = appUrl.startsWith("https");
  const response = NextResponse.redirect(new URL("/market", appUrl));

  // Auth.js uses __Secure- prefix on HTTPS
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    expires,
    path: "/",
    sameSite: "lax",
    secure: isSecure,
  });

  return response;
}
