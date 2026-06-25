import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { prisma } from "@/lib/prisma";

export default async function ExchangeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <div className="min-h-screen flex flex-col">
      <Nav userEmail={session.user.email ?? undefined} isAdmin={user?.role === "admin"} />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-screen-xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
