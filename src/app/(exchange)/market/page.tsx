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
type ViewMode = "grid" | "list";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "value",       label: "Price"      },
  { key: "change_up",   label: "▲ Rising"   },
  { key: "change_down", label: "▼ Falling"  },
  { key: "marketcap",   label: "Mkt Cap"    },
];

function fmt(cents: number) {
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(2)}M`;
  if (cents >= 1_000_00)   return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MarketPage() {
  const [cards, setCards]         = useState<CardRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [sort, setSort]           = useState<SortKey>("value");
  const [view, setView]           = useState<ViewMode>("grid");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [flashIds, setFlashIds]   = useState<Record<string, "up" | "down">>({});
  const prevPricesRef             = useRef<Record<string, number>>({});

  const fetchCards = () =>
    fetch("/api/cards")
      .then(r => r.json())
      .then((fresh: CardRow[]) => {
        const prev = prevPricesRef.current;
        const flashes: Record<string, "up" | "down"> = {};
        fresh.forEach(c => {
          if (prev[c.id] !== undefined && prev[c.id] !== c.lastPriceCents)
            flashes[c.id] = c.lastPriceCents > prev[c.id] ? "up" : "down";
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

  const featured = cards.reduce<CardRow | null>(
    (top, c) => (!top || c.referencePriceCents > top.referencePriceCents ? c : top), null
  );

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

  const totalMarketCap = cards.reduce((s, c) => s + c.lastPriceCents * c.sharesIssued, 0);
  const gainers = cards.filter(c => c.change24h > 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "0 -24px" }}>

      {/* ══ HERO ══ */}
      {!loading && featured && (
        <Link href={`/cards/${featured.id}`} style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            position: "relative", overflow: "hidden",
            padding: "48px 48px 52px",
            background: "linear-gradient(150deg, #03060c 0%, #070e1d 50%, #04070d 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            cursor: "pointer",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "linear-gradient(150deg, #040710 0%, #08101f 50%, #050810 100%)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "linear-gradient(150deg, #03060c 0%, #070e1d 50%, #04070d 100%)"}
          >
            {/* Blurred card art backdrop */}
            {featured.imageUrl && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: `url(${featured.imageUrl})`,
                backgroundSize: "cover", backgroundPosition: "center",
                filter: "blur(80px) saturate(0.5)",
                opacity: 0.1,
              }} />
            )}
            {/* Radial glows */}
            <div style={{ position: "absolute", top: -100, left: "30%", width: 500, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, right: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 52 }}>
              {/* Large card image */}
              <div style={{
                flexShrink: 0,
                filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.8)) drop-shadow(0 0 32px rgba(201,168,76,0.12))",
              }}>
                <HoloCard imageUrl={featured.imageUrl} title={featured.title} width={190} height={266} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", padding: "4px 12px", borderRadius: 20, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", color: "#c9a84c" }}>
                    ✦ FEATURED
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(160,180,210,0.45)", letterSpacing: "0.04em" }}>
                    {featured.grader} {featured.grade} · {featured.year} · {featured.setName}
                  </span>
                </div>

                <h2 style={{ fontSize: 32, fontWeight: 900, color: "#e8eaf0", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 24 }}>
                  {featured.title}
                </h2>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(150,170,200,0.4)", letterSpacing: "0.08em", marginBottom: 6 }}>SHARE PRICE</div>
                    <div style={{ fontSize: 40, fontWeight: 900, fontFamily: "monospace", letterSpacing: "-0.04em", color: "#e8eaf0", lineHeight: 1 }}>
                      {fmt(featured.lastPriceCents)}
                    </div>
                  </div>
                  <div style={{ paddingBottom: 6 }}>
                    <span style={{
                      fontSize: 16, fontWeight: 800, padding: "6px 14px", borderRadius: 8,
                      background: featured.change24h >= 0 ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)",
                      color: featured.change24h >= 0 ? "#00d4a0" : "#ff4d6a",
                      border: `1px solid ${featured.change24h >= 0 ? "rgba(0,212,160,0.22)" : "rgba(255,77,106,0.22)"}`,
                    }}>
                      {featured.change24h >= 0 ? "▲" : "▼"} {Math.abs(featured.change24h).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(150,170,200,0.4)", letterSpacing: "0.08em", marginBottom: 6 }}>REF VALUE</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "#c9a84c", lineHeight: 1 }}>
                      {fmt(featured.referencePriceCents)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(150,170,200,0.4)", letterSpacing: "0.08em", marginBottom: 6 }}>MKT CAP</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "rgba(200,215,240,0.6)", lineHeight: 1 }}>
                      {fmt(featured.lastPriceCents * featured.sharesIssued)}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 28px", borderRadius: 12, fontSize: 14, fontWeight: 800,
                  background: "linear-gradient(135deg, #c9a84c, #8a6020)",
                  color: "#05080f", letterSpacing: "0.03em",
                  boxShadow: "0 6px 24px rgba(201,168,76,0.25)",
                }}>
                  Trade Shares →
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ══ STATS STRIP ══ */}
      {!loading && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          background: "#040710",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          {[
            { label: "Total Market Cap", value: fmt(totalMarketCap),      accent: "#c9a84c"  },
            { label: "Listed Cards",     value: `${cards.length}`,        accent: "#a78bfa"  },
            { label: "Gainers Today",    value: `${gainers}/${cards.length}`, accent: "#00d4a0" },
            { label: "Price Refresh",    value: "Live · 3s",              accent: "#00d4a0", live: true },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: "18px 28px",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <div style={{ fontSize: 11, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {s.live && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4a0", boxShadow: "0 0 6px #00d4a0", flexShrink: 0, display: "inline-block" }} />}
                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: s.accent }}>{s.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ CONTROLS ══ */}
      <div style={{
        padding: "20px 48px",
        background: "#06090f",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const,
      }}>
        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 800, color: "#e8eaf0", letterSpacing: "-0.01em", marginRight: 4 }}>
          All Cards
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

        {/* Sort pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {SORTS.map(o => (
            <button key={o.key} onClick={() => setSort(o.key)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.12s",
              background: sort === o.key ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
              color: sort === o.key ? "#c9a84c" : "rgba(150,170,200,0.5)",
              outline: sort === o.key ? "1px solid rgba(201,168,76,0.28)" : "1px solid rgba(255,255,255,0.06)",
            }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(150,170,200,0.35)", pointerEvents: "none" }}>⌕</span>
          <input
            className="exchange-input"
            style={{ paddingLeft: 32, width: 220, height: 36 }}
            placeholder="Search cards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 3, gap: 2 }}>
          {(["grid", "list"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              width: 32, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
              background: view === v ? "rgba(201,168,76,0.15)" : "transparent",
              color: view === v ? "#c9a84c" : "rgba(150,170,200,0.4)",
              fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.12s",
            }}>
              {v === "grid" ? "⊞" : "☰"}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CARD GRID / LIST ══ */}
      <div style={{ padding: "32px 48px 56px", background: "#05080f" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ borderRadius: 18, background: "#080d18", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
                {/* Image area skeleton */}
                <div style={{ height: 300, background: "linear-gradient(145deg, #0a0f1e, #080c18)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)", animation: `shimmerSweep 1.6s ease-in-out ${i * 0.15}s infinite` }} />
                  <div style={{ position: "relative", width: 48, height: 48 }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.08)" }} />
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "rgba(201,168,76,0.35)", borderRightColor: "rgba(201,168,76,0.12)", animation: `spinnerRing 0.9s linear ${i * 0.1}s infinite` }} />
                    <div style={{ position: "absolute", inset: "11px", borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(201,168,76,0.2)", animation: `spinnerRing 1.3s linear ${i * 0.1}s infinite reverse` }} />
                  </div>
                </div>
                {/* Info area skeleton */}
                <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,0.05)", width: "75%", animation: `shimmerSweep 1.6s ease-in-out ${i * 0.15}s infinite`, overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)", animation: `shimmerSweep 1.6s ease-in-out ${i * 0.15}s infinite` }} />
                  </div>
                  <div style={{ height: 9, borderRadius: 5, background: "rgba(255,255,255,0.03)", width: "50%" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <div style={{ height: 18, borderRadius: 6, background: "rgba(201,168,76,0.06)", width: "38%" }} />
                    <div style={{ height: 18, borderRadius: 6, background: "rgba(255,255,255,0.03)", width: "28%" }} />
                  </div>
                </div>
              </div>
            ))}
            <style>{`
              @keyframes spinnerRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes shimmerSweep { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
            `}</style>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(150,170,200,0.35)", fontSize: 14 }}>
            No cards match your search.
          </div>
        ) : view === "grid" ? (

          /* ── GRID VIEW ── */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {sorted.map(card => {
              const up      = card.change24h >= 0;
              const flash   = flashIds[card.id];
              const hovered = hoveredId === card.id;

              return (
                <Link key={card.id} href={`/cards/${card.id}`} style={{ textDecoration: "none" }}>
                  <div
                    onMouseEnter={() => setHoveredId(card.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      position: "relative", borderRadius: 18, overflow: "hidden",
                      border: hovered
                        ? "1px solid rgba(201,168,76,0.45)"
                        : flash
                        ? `1px solid ${flash === "up" ? "rgba(0,212,160,0.4)" : "rgba(255,77,106,0.4)"}`
                        : "1px solid rgba(255,255,255,0.07)",
                      transition: "border-color 0.15s, transform 0.18s, box-shadow 0.18s",
                      transform: hovered ? "translateY(-6px)" : "translateY(0)",
                      boxShadow: hovered ? "0 28px 64px rgba(0,0,0,0.75)" : "0 4px 20px rgba(0,0,0,0.4)",
                      cursor: "pointer",
                      background: "#07091400",
                    }}
                  >
                    {/* Image area — taller, larger card */}
                    <div style={{
                      position: "relative", height: 300,
                      background: "linear-gradient(160deg, #07101c 0%, #0b1624 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {/* Ambient blur from card art */}
                      {card.imageUrl && (
                        <div style={{
                          position: "absolute", inset: 0, pointerEvents: "none",
                          backgroundImage: `url(${card.imageUrl})`,
                          backgroundSize: "cover", backgroundPosition: "center",
                          filter: "blur(32px) saturate(0.7)",
                          opacity: hovered ? 0.22 : 0.1,
                          transition: "opacity 0.3s",
                        }} />
                      )}

                      {/* Card — significantly larger */}
                      <div style={{
                        transform: hovered ? "scale(1.05) translateY(-4px)" : "scale(1)",
                        transition: "transform 0.28s ease",
                        filter: hovered
                          ? "drop-shadow(0 20px 36px rgba(0,0,0,0.8)) drop-shadow(0 0 20px rgba(201,168,76,0.12))"
                          : "drop-shadow(0 8px 20px rgba(0,0,0,0.7))",
                      }}>
                        <HoloCard imageUrl={card.imageUrl} title={card.title} width={160} height={224} />
                      </div>

                      {/* Hover CTA */}
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(0deg, rgba(5,8,15,0.92) 0%, transparent 45%)",
                        display: "flex", alignItems: "flex-end", justifyContent: "center",
                        paddingBottom: 16,
                        opacity: hovered ? 1 : 0,
                        transition: "opacity 0.2s",
                      }}>
                        <span style={{
                          fontSize: 13, fontWeight: 800, color: "#c9a84c",
                          padding: "8px 22px", borderRadius: 8,
                          background: "rgba(201,168,76,0.14)",
                          border: "1px solid rgba(201,168,76,0.35)",
                          letterSpacing: "0.04em",
                        }}>
                          Trade Shares →
                        </span>
                      </div>

                      {/* Grade badge */}
                      <div style={{
                        position: "absolute", top: 12, left: 12,
                        fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                        padding: "4px 9px", borderRadius: 6,
                        background: "rgba(4,6,12,0.75)", border: "1px solid rgba(201,168,76,0.3)",
                        color: "#c9a84c", backdropFilter: "blur(6px)",
                      }}>
                        {card.grader} {card.grade}
                      </div>

                      {/* Change badge */}
                      <div style={{
                        position: "absolute", top: 12, right: 12,
                        fontSize: 11, fontWeight: 800,
                        padding: "4px 9px", borderRadius: 6,
                        background: up ? "rgba(0,212,160,0.12)" : "rgba(255,77,106,0.12)",
                        border: `1px solid ${up ? "rgba(0,212,160,0.25)" : "rgba(255,77,106,0.25)"}`,
                        color: up ? "#00d4a0" : "#ff4d6a",
                        backdropFilter: "blur(6px)",
                      }}>
                        {up ? "▲" : "▼"} {Math.abs(card.change24h).toFixed(2)}%
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{
                      padding: "18px 20px 20px",
                      background: flash
                        ? `linear-gradient(160deg, ${flash === "up" ? "rgba(0,212,160,0.04)" : "rgba(255,77,106,0.04)"} 0%, #07101a 100%)`
                        : "linear-gradient(160deg, #080f1a 0%, #060810 100%)",
                      transition: "background 0.6s",
                    }}>
                      <div style={{ fontSize: 11, color: "rgba(150,170,200,0.4)", marginBottom: 4 }}>
                        {card.year} · {card.setName}
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: "#dde5f0",
                        lineHeight: 1.35, marginBottom: 16,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                      }}>
                        {card.title}
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 10, color: "rgba(150,170,200,0.38)", letterSpacing: "0.06em", marginBottom: 3 }}>PRICE / SHARE</div>
                          <div style={{
                            fontSize: 24, fontWeight: 900, fontFamily: "monospace",
                            letterSpacing: "-0.02em",
                            color: flash === "up" ? "#00d4a0" : flash === "down" ? "#ff4d6a" : "#e8eaf0",
                            transition: "color 0.5s",
                          }}>
                            {fmt(card.lastPriceCents)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "rgba(150,170,200,0.38)", letterSpacing: "0.06em", marginBottom: 3 }}>MKT CAP</div>
                          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "rgba(200,215,240,0.5)" }}>
                            {fmt(card.lastPriceCents * card.sharesIssued)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

        ) : (

          /* ── LIST VIEW ── */
          <div style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "56px 1fr 130px 110px 120px 110px",
              padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(120,140,170,0.45)",
            }}>
              <span />
              <span>CARD</span>
              <span style={{ textAlign: "right" }}>SHARE PRICE</span>
              <span style={{ textAlign: "center" }}>24H</span>
              <span style={{ textAlign: "right" }}>MKT CAP</span>
              <span style={{ textAlign: "right" }}>REF VALUE</span>
            </div>

            {sorted.map((card, i) => {
              const up    = card.change24h >= 0;
              const flash = flashIds[card.id];
              const last  = i === sorted.length - 1;

              return (
                <Link key={card.id} href={`/cards/${card.id}`} style={{ textDecoration: "none" }}>
                  <div
                    onMouseEnter={() => setHoveredId(card.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: "grid", gridTemplateColumns: "56px 1fr 130px 110px 120px 110px",
                      padding: "14px 20px", alignItems: "center",
                      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
                      background: hoveredId === card.id
                        ? "rgba(201,168,76,0.03)"
                        : flash
                        ? `rgba(${flash === "up" ? "0,212,160" : "255,77,106"},0.03)`
                        : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                      transition: "background 0.12s",
                      cursor: "pointer",
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 36, height: 50, borderRadius: 4, overflow: "hidden",
                      background: "#06090f", border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
                    }}>
                      {card.imageUrl && (
                        <img src={card.imageUrl} alt={card.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>

                    {/* Name */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#dde5f0", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 16 }}>
                        {card.title}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(150,170,200,0.4)" }}>
                        {card.grader} {card.grade} · {card.year} · {card.setName}
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 15, fontWeight: 800, color: flash === "up" ? "#00d4a0" : flash === "down" ? "#ff4d6a" : "#e8eaf0", transition: "color 0.5s" }}>
                      {fmt(card.lastPriceCents)}
                    </div>

                    {/* 24h */}
                    <div style={{ textAlign: "center" }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                        background: up ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)",
                        color: up ? "#00d4a0" : "#ff4d6a",
                        border: `1px solid ${up ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`,
                      }}>
                        {up ? "▲" : "▼"} {Math.abs(card.change24h).toFixed(2)}%
                      </span>
                    </div>

                    {/* Market cap */}
                    <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "rgba(200,215,240,0.5)" }}>
                      {fmt(card.lastPriceCents * card.sharesIssued)}
                    </div>

                    {/* Ref value */}
                    <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#c9a84c" }}>
                      {fmt(card.referencePriceCents)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmerText {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
