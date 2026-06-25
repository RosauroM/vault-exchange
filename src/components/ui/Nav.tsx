"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { NavigationProgress } from "./NavigationProgress";

interface TickerCard {
  id: string;
  title: string;
  lastPriceCents: number;
  change24h: number;
}

const NAV_LINKS = [
  { href: "/market",    label: "Market"    },
  { href: "/packs",     label: "Packs"     },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/wallet",    label: "Wallet"    },
];

export function Nav({ userEmail, isAdmin }: { userEmail?: string; isAdmin?: boolean }) {
  const path = usePathname();
  const [cards, setCards] = useState<TickerCard[]>([]);

  useEffect(() => {
    fetch("/api/cards").then(r => r.json()).then(setCards).catch(() => {});
    const t = setInterval(() => {
      fetch("/api/cards").then(r => r.json()).then(setCards).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const fmt = (cents: number) =>
    cents >= 100_000_00
      ? `$${(cents / 100_000_00).toFixed(1)}M`
      : cents >= 1_000_00
      ? `$${(cents / 1_000_00).toFixed(1)}K`
      : `$${(cents / 100).toFixed(2)}`;

  const tickerItems = cards.length > 0
    ? [...cards, ...cards]
    : [];

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100 }}>
      <NavigationProgress />
      {/* ── Main nav bar ── */}
      <nav
        style={{
          background: "rgba(4,6,12,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Logo */}
        <Link
          href="/market"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginRight: 36,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          {/* Pokéball-inspired icon */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(160deg, #c9a84c 0%, #7a5a10 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            boxShadow: "0 0 18px rgba(201,168,76,0.5), 0 2px 8px rgba(0,0,0,0.6)",
            border: "1.5px solid rgba(201,168,76,0.4)",
          }}>
            ✦
          </div>
          <span style={{
            fontSize: 19,
            fontWeight: 900,
            letterSpacing: "0.08em",
            background: "linear-gradient(90deg, #c9a84c 0%, #f0d070 50%, #c9a84c 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% auto",
            animation: "shimmerText 4s linear infinite",
          }}>
            VAULT
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          {NAV_LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  position: "relative",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#c9a84c" : "rgba(200,210,230,0.6)",
                  textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                  background: active ? "rgba(201,168,76,0.08)" : "transparent",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(200,210,230,0.9)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(200,210,230,0.6)";
                }}
              >
                {l.label}
                {/* Active underline */}
                {active && (
                  <span style={{
                    position: "absolute",
                    bottom: -1,
                    left: "20%",
                    right: "20%",
                    height: 2,
                    borderRadius: 2,
                    background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
                  }} />
                )}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: path.startsWith("/admin") ? 700 : 500,
                color: path.startsWith("/admin") ? "#c9a84c" : "rgba(200,210,230,0.45)",
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {userEmail && (
            <span style={{
              fontSize: 12,
              color: "rgba(150,170,200,0.5)",
              padding: "5px 12px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "none",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            className="md-show"
            >
              {userEmail}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "rgba(150,170,200,0.55)",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#ff4d6a";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,77,106,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "rgba(150,170,200,0.55)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Live price ticker strip ── */}
      <div style={{
        background: "linear-gradient(90deg, #05080f 0%, #080e1a 50%, #05080f 100%)",
        borderBottom: "1px solid rgba(201,168,76,0.12)",
        height: 34,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}>
        {tickerItems.length > 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            animation: "tickerMove 20s linear infinite",
            whiteSpace: "nowrap",
          }}>
            {tickerItems.map((c, i) => {
              const up = c.change24h >= 0;
              const shortTitle = c.title.replace("Pokémon", "").replace("Pokémon", "").trim().split(" ").slice(-3).join(" ");
              return (
                <span key={`${c.id}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
                  <Link
                    href={`/cards/${c.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0 24px",
                      fontSize: 12,
                      textDecoration: "none",
                      color: "rgba(180,195,220,0.7)",
                      transition: "color 0.15s",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "rgba(220,230,245,0.85)" }}>{shortTitle}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#e8eaf0" }}>{fmt(c.lastPriceCents)}</span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: 11,
                      color: up ? "#00d4a0" : "#ff4d6a",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                    }}>
                      {up ? "▲" : "▼"} {Math.abs(c.change24h).toFixed(2)}%
                    </span>
                  </Link>
                  <span style={{ color: "rgba(201,168,76,0.2)", fontSize: 10 }}>│</span>
                </span>
              );
            })}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: "rgba(150,170,200,0.3)", padding: "0 16px" }}>
            Loading market data…
          </span>
        )}

        {/* Live indicator */}
        <div style={{
          position: "absolute",
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#00d4a0",
          background: "rgba(5,8,15,0.95)",
          padding: "3px 10px 3px 8px",
          borderLeft: "1px solid rgba(201,168,76,0.12)",
        }}>
          <span className="live-dot green" style={{ width: 5, height: 5 }} />
          LIVE
        </div>
      </div>

      <style>{`
        @keyframes tickerMove {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmerText {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @media (min-width: 768px) {
          .md-show { display: block !important; }
        }
      `}</style>
    </header>
  );
}
