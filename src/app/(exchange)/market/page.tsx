"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { HoloCard } from "@/components/exchange/HoloCard";

interface CardRow {
  id: string;
  title: string;
  setName: string;
  year: number;
  grader: string;
  grade: number;
  imageUrl: string | null;
  referencePriceCents: number;
  sharesIssued: number;
  lastPriceCents: number;
  change24h: number;
  lastTradeAt: string | null;
}

type SortKey = "value" | "change_up" | "change_down" | "marketcap";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "value",       label: "Highest Price" },
  { key: "change_up",   label: "🔥 Rising"     },
  { key: "change_down", label: "📉 Falling"    },
  { key: "marketcap",   label: "Market Cap"    },
];

function fmtPrice(cents: number) {
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(2)}M`;
  if (cents >= 1_000_00)   return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MarketPage() {
  const [cards, setCards]       = useState<CardRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [sort, setSort]         = useState<SortKey>("value");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashIds, setFlashIds] = useState<Record<string, "up" | "down">>({});

  const fetchCards = () =>
    fetch("/api/cards")
      .then(r => r.json())
      .then((fresh: CardRow[]) => {
        const prev = prevPricesRef.current;
        const flashes: Record<string, "up" | "down"> = {};
        fresh.forEach(c => {
          if (prev[c.id] !== undefined && prev[c.id] !== c.lastPriceCents) {
            flashes[c.id] = c.lastPriceCents > prev[c.id] ? "up" : "down";
          }
          prev[c.id] = c.lastPriceCents;
        });
        if (Object.keys(flashes).length) {
          setFlashIds(flashes);
          setTimeout(() => setFlashIds({}), 900);
        }
        setCards(fresh);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchCards();
    const t = setInterval(fetchCards, 3000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...cards]
    .filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.setName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "value")       return b.lastPriceCents - a.lastPriceCents;
      if (sort === "change_up")   return b.change24h - a.change24h;
      if (sort === "change_down") return a.change24h - b.change24h;
      if (sort === "marketcap")   return (b.lastPriceCents * b.sharesIssued) - (a.lastPriceCents * a.sharesIssued);
      return 0;
    });

  const featured = cards.reduce<CardRow | null>(
    (top, c) => (!top || c.referencePriceCents > top.referencePriceCents ? c : top), null
  );

  const totalMarketCap = cards.reduce((s, c) => s + c.lastPriceCents * c.sharesIssued, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Featured hero card ── */}
      {featured && !loading && (
        <Link href={`/cards/${featured.id}`} style={{ textDecoration: "none", display: "block" }}>
          <div
            style={{
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              background: "linear-gradient(135deg, #080e1c 0%, #0e1828 40%, #101e30 100%)",
              border: "1px solid rgba(201,168,76,0.2)",
              padding: "32px 36px",
              display: "flex",
              alignItems: "center",
              gap: 40,
              minHeight: 220,
              cursor: "pointer",
              transition: "border-color 0.25s, box-shadow 0.25s",
              boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.5)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.1)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.2)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 48px rgba(0,0,0,0.6)";
            }}
          >
            {/* Background card art blur */}
            {featured.imageUrl && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: `url(${featured.imageUrl})`,
                backgroundSize: "cover", backgroundPosition: "center",
                filter: "blur(60px) saturate(0.4)",
                opacity: 0.08,
              }} />
            )}

            {/* Radial glow */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.07) 0%, transparent 60%)",
            }} />

            {/* Card image */}
            <div style={{ flexShrink: 0, zIndex: 1 }}>
              <HoloCard imageUrl={featured.imageUrl} title={featured.title} width={130} height={182} />
            </div>

            {/* Info */}
            <div style={{ zIndex: 1, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
                  color: "#c9a84c", padding: "3px 8px", borderRadius: 4,
                  background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)",
                }}>
                  ✦ FEATURED
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  color: "rgba(200,210,230,0.5)",
                }}>
                  {featured.grader} {featured.grade} · {featured.year} · {featured.setName}
                </span>
              </div>
              <h2 style={{
                fontSize: 26, fontWeight: 900, color: "#e8eaf0",
                letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 16,
              }}>
                {featured.title}
              </h2>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(150,170,200,0.5)", marginBottom: 4 }}>PRICE / SHARE</div>
                  <div style={{
                    fontSize: 32, fontWeight: 900, fontFamily: "monospace",
                    letterSpacing: "-0.03em", color: "#e8eaf0",
                  }}>
                    {fmtPrice(featured.lastPriceCents)}
                  </div>
                </div>
                <div style={{ paddingBottom: 6 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 700, padding: "5px 12px", borderRadius: 6,
                    background: featured.change24h >= 0 ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)",
                    color: featured.change24h >= 0 ? "#00d4a0" : "#ff4d6a",
                    border: `1px solid ${featured.change24h >= 0 ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`,
                  }}>
                    {featured.change24h >= 0 ? "▲" : "▼"} {Math.abs(featured.change24h).toFixed(2)}%
                  </span>
                </div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontSize: 11, color: "rgba(150,170,200,0.5)", marginBottom: 4 }}>REF VALUE</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#c9a84c", fontFamily: "monospace" }}>
                    {fmtPrice(featured.referencePriceCents)}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ flexShrink: 0, zIndex: 1 }}>
              <div style={{
                padding: "13px 28px",
                background: "linear-gradient(135deg, #c9a84c, #8a6020)",
                borderRadius: 10,
                fontSize: 14, fontWeight: 800, color: "#05080f",
                boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
                letterSpacing: "0.02em",
              }}>
                Trade Now →
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── Market stats bar ── */}
      {!loading && cards.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}>
          {[
            { label: "Total Market Cap", value: fmtPrice(totalMarketCap), accent: "#c9a84c" },
            { label: "Listed Cards",     value: `${cards.length}`,        accent: "#a78bfa" },
            { label: "Live Prices",      value: "3s refresh",             accent: "#00d4a0", dot: true },
          ].map(s => (
            <div key={s.label} style={{
              background: "#080d18",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `${s.accent}15`,
                border: `1px solid ${s.accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {s.dot
                  ? <span className="live-dot green" />
                  : <span style={{ fontSize: 14, color: s.accent }}>◆</span>}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(150,170,200,0.5)", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "monospace", color: "#e8eaf0" }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Controls row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#e8eaf0", margin: 0 }}>
            All Cards
          </h1>
        </div>

        {/* Sort pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                background: sort === o.key ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                color: sort === o.key ? "#c9a84c" : "rgba(150,170,200,0.55)",
                outline: sort === o.key ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "rgba(150,170,200,0.4)", pointerEvents: "none",
          }}>⌕</span>
          <input
            className="exchange-input"
            style={{ paddingLeft: 30, width: 200, height: 36 }}
            placeholder="Search cards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Card grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: 400, borderRadius: 16,
              background: "#080d18",
              border: "1px solid rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}>
              <div className="animate-shimmer" style={{ height: "100%", borderRadius: 16 }} />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(150,170,200,0.4)", fontSize: 14 }}>
          No cards found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {sorted.map(card => {
            const up = card.change24h >= 0;
            const flash = flashIds[card.id];
            const isHovered = hoveredId === card.id;

            return (
              <Link key={card.id} href={`/cards/${card.id}`} style={{ textDecoration: "none" }}>
                <div
                  onMouseEnter={() => setHoveredId(card.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: "relative",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#07091400",
                    border: isHovered
                      ? "1px solid rgba(201,168,76,0.5)"
                      : flash
                      ? `1px solid ${flash === "up" ? "rgba(0,212,160,0.5)" : "rgba(255,77,106,0.5)"}`
                      : "1px solid rgba(255,255,255,0.07)",
                    transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                    transform: isHovered ? "translateY(-6px)" : "translateY(0)",
                    boxShadow: isHovered
                      ? "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.08)"
                      : "0 4px 20px rgba(0,0,0,0.4)",
                    cursor: "pointer",
                  }}
                >
                  {/* Card image section */}
                  <div style={{
                    position: "relative",
                    height: 220,
                    background: "linear-gradient(160deg, #07101c 0%, #0c1826 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {/* Blurred bg glow from card art */}
                    {card.imageUrl && (
                      <div style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        backgroundImage: `url(${card.imageUrl})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        filter: "blur(30px) saturate(0.6)",
                        opacity: isHovered ? 0.18 : 0.08,
                        transition: "opacity 0.3s",
                      }} />
                    )}

                    {/* HoloCard */}
                    <div style={{
                      transform: isHovered ? "scale(1.06)" : "scale(1)",
                      transition: "transform 0.3s ease",
                    }}>
                      <HoloCard
                        imageUrl={card.imageUrl}
                        title={card.title}
                        width={110}
                        height={154}
                      />
                    </div>

                    {/* Hover overlay */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(0deg, rgba(7,9,20,0.9) 0%, transparent 50%)",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      paddingBottom: 14,
                      opacity: isHovered ? 1 : 0,
                      transition: "opacity 0.25s",
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: 800, color: "#c9a84c",
                        padding: "8px 24px", borderRadius: 8,
                        background: "rgba(201,168,76,0.15)",
                        border: "1px solid rgba(201,168,76,0.35)",
                        letterSpacing: "0.04em",
                      }}>
                        Trade Shares →
                      </span>
                    </div>

                    {/* Grade badge overlay */}
                    <div style={{
                      position: "absolute", top: 10, left: 10,
                      fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                      padding: "3px 8px", borderRadius: 5,
                      background: "rgba(201,168,76,0.15)",
                      color: "#c9a84c",
                      border: "1px solid rgba(201,168,76,0.3)",
                      backdropFilter: "blur(4px)",
                    }}>
                      {card.grader} {card.grade}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{
                    padding: "16px 18px 18px",
                    background: flash
                      ? `linear-gradient(160deg, ${flash === "up" ? "rgba(0,212,160,0.04)" : "rgba(255,77,106,0.04)"} 0%, #08101c 100%)`
                      : "linear-gradient(160deg, #080f1a 0%, #06090f 100%)",
                    transition: "background 0.6s",
                  }}>
                    {/* Year + set */}
                    <div style={{ fontSize: 11, color: "rgba(150,170,200,0.45)", marginBottom: 5 }}>
                      {card.year} · {card.setName}
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: "#dde5f0",
                      lineHeight: 1.35, marginBottom: 14,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}>
                      {card.title}
                    </div>

                    {/* Price row */}
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(150,170,200,0.4)", marginBottom: 3, letterSpacing: "0.05em" }}>
                          PRICE / SHARE
                        </div>
                        <div style={{
                          fontSize: 22, fontWeight: 900,
                          fontFamily: "monospace",
                          letterSpacing: "-0.02em",
                          color: flash === "up" ? "#00d4a0" : flash === "down" ? "#ff4d6a" : "#e8eaf0",
                          transition: "color 0.5s",
                        }}>
                          {fmtPrice(card.lastPriceCents)}
                        </div>
                      </div>
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 3,
                      }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          padding: "4px 10px", borderRadius: 6,
                          background: up ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)",
                          color: up ? "#00d4a0" : "#ff4d6a",
                          border: `1px solid ${up ? "rgba(0,212,160,0.18)" : "rgba(255,77,106,0.18)"}`,
                        }}>
                          {up ? "▲" : "▼"} {Math.abs(card.change24h).toFixed(2)}%
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(150,170,200,0.35)" }}>24h</span>
                      </div>
                    </div>

                    {/* Bottom bar */}
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <span style={{ fontSize: 11, color: "rgba(150,170,200,0.35)" }}>Market cap</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "rgba(200,215,240,0.6)" }}>
                        {fmtPrice(card.lastPriceCents * card.sharesIssued)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
