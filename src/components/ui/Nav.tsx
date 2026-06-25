"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/market", label: "Market" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/packs", label: "Packs" },
  { href: "/wallet", label: "Wallet" },
];

export function Nav({ userEmail, isAdmin }: { userEmail?: string; isAdmin?: boolean }) {
  const path = usePathname();

  return (
    <nav
      style={{ background: "#070b14", borderBottom: "1px solid #1e2a3a" }}
      className="sticky top-0 z-50 px-6 py-3 flex items-center gap-6"
    >
      <Link href="/market" className="text-gold font-bold text-lg tracking-tight mr-4">
        ⬡ VAULT
      </Link>

      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-sm font-medium transition-colors ${
            path.startsWith(l.href)
              ? "text-gold"
              : "text-muted hover:text-white"
          }`}
        >
          {l.label}
        </Link>
      ))}

      {isAdmin && (
        <Link
          href="/admin"
          className={`text-sm font-medium transition-colors ${
            path.startsWith("/admin") ? "text-gold" : "text-muted hover:text-white"
          }`}
        >
          Admin
        </Link>
      )}

      <div className="ml-auto flex items-center gap-4">
        {userEmail && (
          <span className="text-xs text-muted hidden sm:block">{userEmail}</span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-xs text-muted hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
