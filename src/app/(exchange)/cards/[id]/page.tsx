"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { HoloCard } from "@/components/exchange/HoloCard";
import { formatUSD } from "@/lib/format";

interface BookLevel  { priceCents: number; quantity: number }
interface TradeRow   { id: string; priceCents: number; quantity: number; createdAt: string }
interface CardDetail {
  id: string; title: string; setName: string; year: number;
  grader: string; grade: number; certNumber?: string;
  imageUrl: string | null; referencePriceCents: number;
  sharesIssued: number; lastPriceCents: number; change24h: number;
  error?: string;
}

const QUICK_QTY = [1, 5, 10, 25, 50];

function fmt(cents: number) {
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(2)}M`;
  if (cents >= 1_000_00)   return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [card, setCard]       = useState<CardDetail | null>(null);
  const [bids, setBids]       = useState<BookLevel[]>([]);
  const [asks, setAsks]       = useState<BookLevel[]>([]);
  const [trades, setTrades]   = useState<TradeRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [side, setSide]       = useState<"bid" | "ask">("bid");
  const [price, setPrice]     = useState("");
  const [qty, setQty]         = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  const fetchAll = async () => {
    try {
      const [cardRes, bookRes, tradesRes] = await Promise.all([
        fetch(`/api/cards/${id}`).then(async r => {
          const text = await r.text();
          try { return JSON.parse(text); } catch { return { error: "Invalid response" }; }
        }),
        fetch(`/api/cards/${id}/book`).then(r => r.json()).catch(() => ({ bids: [], asks: [] })),
        fetch(`/api/cards/${id}/trades`).then(r => r.json()).catch(() => []),
      ]);
      if (cardRes?.error) { setNotFound(true); return; }
      setCard(cardRes);
      setBids(bookRes.bids ?? []);
      setAsks(bookRes.asks ?? []);
      setTrades(Array.isArray(tradesRes) ? tradesRes : []);
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 2500);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const placeOrder = async () => {
    if (!price || !qty) return;
    setPlacing(true); setMsg(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: id, side,
          priceCents: Math.round(parseFloat(price) * 100),
          quantity: parseInt(qty),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ text: `✓ ${data.filled} of ${data.filled + data.remaining} shares ${side === "bid" ? "bought" : "sold"}`, ok: true });
      setPrice(""); setQty(""); fetchAll();
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : "Order failed", ok: false });
    } finally {
      setPlacing(false);
    }
  };

  /* ── Not found ── */
  if (notFound) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
      <div style={{ fontSize: 48, opacity: 0.2 }}>🃏</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#e8eaf0" }}>Card not found</div>
      <div style={{ fontSize: 14, color: "rgba(150,170,200,0.45)" }}>This card may have been removed or the link is invalid.</div>
      <Link href="/market" style={{ marginTop: 8, fontSize: 13, color: "#c9a84c", textDecoration: "none", padding: "10px 22px", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8 }}>
        ← Back to Market
      </Link>
    </div>
  );

  /* ── Loading ── */
  if (!card) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.08)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#c9a84c", borderRightColor: "rgba(201,168,76,0.3)", animation: "spinnerRing 0.8s linear infinite" }} />
          <div style={{ position: "absolute", inset: "11px", borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(201,168,76,0.4)", animation: "spinnerRing 1.2s linear infinite reverse" }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.35)" }}>LOADING CARD…</div>
      </div>
      <style>{`@keyframes spinnerRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const bestBid   = bids[0]?.priceCents;
  const bestAsk   = asks[0]?.priceCents;
  const spread    = bestBid && bestAsk ? bestAsk - bestBid : null;
  const midPrice  = bestBid && bestAsk ? Math.round((bestBid + bestAsk) / 2) : null;
  const maxBidQty = bids.length ? Math.max(...bids.map(b => b.quantity)) : 1;
  const maxAskQty = asks.length ? Math.max(...asks.map(a => a.quantity)) : 1;
  const up        = card.change24h >= 0;
  const orderTotal = price && qty ? Math.round(parseFloat(price) * 100) * parseInt(qty) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "0 -24px" }}>

      {/* ══ HERO ══ */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {/* Full-bleed blurred card art */}
        {card.imageUrl && (
          <>
            <div style={{
              position: "absolute", inset: 0, zIndex: 0,
              backgroundImage: `url(${card.imageUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(90px) saturate(2) brightness(0.3)",
              transform: "scale(1.15)",
            }} />
            <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(3,5,10,0.55) 0%, rgba(3,5,10,0.75) 60%, rgba(3,5,10,0.97) 100%)" }} />
          </>
        )}
        {!card.imageUrl && <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "linear-gradient(150deg, #03060c, #070e1d)" }} />}

        <div style={{ position: "relative", zIndex: 2, padding: "36px 48px 48px" }}>
          {/* Back link */}
          <Link href="/market" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12.5, color: "rgba(180,200,230,0.45)", textDecoration: "none",
            marginBottom: 32, transition: "color 0.15s",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            padding: "7px 14px", borderRadius: 8,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(200,220,245,0.85)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(180,200,230,0.45)")}
          >
            ← Market
          </Link>

          <div style={{ display: "flex", gap: 52, alignItems: "flex-start", flexWrap: "wrap" as const }}>

            {/* ── Card visual ── */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                filter: "drop-shadow(0 32px 64px rgba(0,0,0,0.9)) drop-shadow(0 0 40px rgba(201,168,76,0.15))",
              }}>
                <HoloCard imageUrl={card.imageUrl} title={card.title} width={240} height={336} />
              </div>
              <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  padding: "5px 14px", borderRadius: 20,
                  background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.28)",
                  color: "#c9a84c",
                }}>
                  {card.grader} {Number(card.grade)}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 20,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(180,200,230,0.55)",
                }}>
                  {card.year} · {card.setName}
                </span>
              </div>
            </div>

            {/* ── Info + Trade panel ── */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <h1 style={{
                fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em",
                color: "#fff", lineHeight: 1.15, marginBottom: 6,
                textShadow: "0 2px 24px rgba(0,0,0,0.7)",
              }}>
                {card.title}
              </h1>
              <div style={{ fontSize: 12.5, color: "rgba(160,180,210,0.4)", marginBottom: 22 }}>
                Fractional ownership · {card.sharesIssued.toLocaleString()} shares issued
              </div>

              {/* Price + 24h */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginBottom: 24, flexWrap: "wrap" as const }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(150,170,200,0.38)", letterSpacing: "0.08em", marginBottom: 6 }}>SHARE PRICE</div>
                  <div style={{ fontSize: 46, fontWeight: 900, fontFamily: "monospace", letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                    {fmt(card.lastPriceCents)}
                  </div>
                </div>
                <div style={{ paddingBottom: 6 }}>
                  <span style={{
                    fontSize: 16, fontWeight: 800, padding: "7px 16px", borderRadius: 9,
                    background: up ? "rgba(0,212,160,0.12)" : "rgba(255,77,106,0.12)",
                    border: `1px solid ${up ? "rgba(0,212,160,0.28)" : "rgba(255,77,106,0.28)"}`,
                    color: up ? "#00d4a0" : "#ff4d6a",
                  }}>
                    {up ? "▲" : "▼"} {Math.abs(card.change24h).toFixed(2)}% <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.6 }}>24h</span>
                  </span>
                </div>
              </div>

              {/* Key stats row */}
              <div style={{
                display: "flex", gap: 0, marginBottom: 28,
                background: "rgba(255,255,255,0.04)", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden",
              }}>
                {[
                  { label: "Ref Value",   value: fmt(card.referencePriceCents), color: "#c9a84c" },
                  { label: "Market Cap",  value: fmt(card.lastPriceCents * card.sharesIssued), color: "#e0eaff" },
                  { label: "Best Bid",    value: bestBid ? fmt(bestBid) : "—", color: "#00d4a0" },
                  { label: "Best Ask",    value: bestAsk ? fmt(bestAsk) : "—", color: "#ff6b82" },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1, padding: "14px 16px",
                    borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                  }}>
                    <div style={{ fontSize: 10, color: "rgba(150,170,200,0.38)", letterSpacing: "0.07em", marginBottom: 5 }}>{s.label.toUpperCase()}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace", color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* ── Trade panel ── */}
              <div style={{
                background: "rgba(6,9,15,0.75)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 16, padding: "22px 24px",
                backdropFilter: "blur(24px)",
                maxWidth: 500,
              }}>
                {/* Buy / Sell toggle */}
                <div style={{
                  display: "flex", background: "rgba(0,0,0,0.5)",
                  borderRadius: 10, padding: 4, gap: 4, marginBottom: 20,
                }}>
                  {(["bid", "ask"] as const).map(s => (
                    <button key={s} onClick={() => { setSide(s); setMsg(null); }} style={{
                      flex: 1, padding: "11px 12px", borderRadius: 8,
                      fontWeight: 800, fontSize: 14, letterSpacing: "0.04em",
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      background: side === s
                        ? s === "bid" ? "linear-gradient(135deg, #00c897, #009e78)" : "linear-gradient(135deg, #ff4d6a, #c0203a)"
                        : "transparent",
                      color: side === s ? (s === "bid" ? "#04100c" : "#fff") : "rgba(150,170,200,0.4)",
                      boxShadow: side === s ? (s === "bid" ? "0 4px 16px rgba(0,200,151,0.3)" : "0 4px 16px rgba(255,77,106,0.3)") : "none",
                    }}>
                      {s === "bid" ? "Buy Shares" : "Sell Shares"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {/* Price */}
                  <div>
                    <label style={{ fontSize: 10, color: "rgba(150,170,200,0.45)", display: "block", marginBottom: 6, letterSpacing: "0.07em" }}>
                      PRICE / SHARE ($)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="exchange-input"
                        type="number" min="0.01" step="0.01"
                        placeholder={bestAsk ? (bestAsk / 100).toFixed(2) : "0.00"}
                        value={price} onChange={e => setPrice(e.target.value)}
                        style={{ fontFamily: "monospace", fontSize: 15, background: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.08)", paddingRight: 48 }}
                      />
                      {bestAsk && side === "bid" && (
                        <button onClick={() => setPrice((bestAsk / 100).toFixed(2))} style={{
                          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                          fontSize: 9, fontWeight: 700, color: "#ff6b82",
                          background: "rgba(255,77,106,0.1)", border: "none",
                          cursor: "pointer", borderRadius: 4, padding: "2px 6px",
                        }}>ASK</button>
                      )}
                      {bestBid && side === "ask" && (
                        <button onClick={() => setPrice((bestBid / 100).toFixed(2))} style={{
                          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                          fontSize: 9, fontWeight: 700, color: "#00d4a0",
                          background: "rgba(0,212,160,0.1)", border: "none",
                          cursor: "pointer", borderRadius: 4, padding: "2px 6px",
                        }}>BID</button>
                      )}
                    </div>
                  </div>

                  {/* Qty */}
                  <div>
                    <label style={{ fontSize: 10, color: "rgba(150,170,200,0.45)", display: "block", marginBottom: 6, letterSpacing: "0.07em" }}>
                      QUANTITY (SHARES)
                    </label>
                    <input
                      className="exchange-input"
                      type="number" min="1" step="1" placeholder="1"
                      value={qty} onChange={e => setQty(e.target.value)}
                      style={{ fontFamily: "monospace", fontSize: 15, background: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.08)" }}
                    />
                  </div>
                </div>

                {/* Quick qty */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {QUICK_QTY.map(q => (
                    <button key={q} onClick={() => setQty(String(q))} style={{
                      flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 12, fontWeight: 700,
                      border: `1px solid ${qty === String(q) ? "rgba(201,168,76,0.45)" : "rgba(255,255,255,0.07)"}`,
                      background: qty === String(q) ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.025)",
                      color: qty === String(q) ? "#c9a84c" : "rgba(150,170,200,0.4)",
                      cursor: "pointer", transition: "all 0.12s",
                    }}>×{q}</button>
                  ))}
                </div>

                {/* Order total */}
                {price && qty && orderTotal > 0 && (
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "11px 14px", marginBottom: 14,
                    background: "rgba(0,0,0,0.35)", borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <span style={{ fontSize: 12, color: "rgba(150,170,200,0.45)" }}>Order total</span>
                    <span style={{ fontSize: 17, fontWeight: 900, fontFamily: "monospace", color: side === "bid" ? "#00d4a0" : "#ff6b82" }}>
                      {formatUSD(orderTotal)}
                    </span>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={placeOrder}
                  disabled={placing || !price || !qty}
                  style={{
                    width: "100%", padding: "14px 20px", borderRadius: 10,
                    border: "none", fontWeight: 800, fontSize: 15, letterSpacing: "0.04em",
                    cursor: placing || !price || !qty ? "not-allowed" : "pointer",
                    opacity: placing || !price || !qty ? 0.4 : 1,
                    transition: "all 0.15s",
                    background: side === "bid"
                      ? "linear-gradient(135deg, #00c897, #009e78)"
                      : "linear-gradient(135deg, #ff4d6a, #c0203a)",
                    color: side === "bid" ? "#04100c" : "#fff",
                    boxShadow: placing || !price || !qty ? "none"
                      : side === "bid" ? "0 6px 24px rgba(0,200,151,0.3)" : "0 6px 24px rgba(255,77,106,0.3)",
                  }}
                >
                  {placing ? "Placing…" : side === "bid" ? "Place Buy Order" : "Place Sell Order"}
                </button>

                {msg && (
                  <div style={{
                    marginTop: 12, padding: "10px 14px", borderRadius: 8,
                    fontSize: 13, textAlign: "center",
                    background: msg.ok ? "rgba(0,212,160,0.07)" : "rgba(255,77,106,0.07)",
                    border: `1px solid ${msg.ok ? "rgba(0,212,160,0.22)" : "rgba(255,77,106,0.22)"}`,
                    color: msg.ok ? "#00d4a0" : "#ff4d6a",
                  }}>
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ ORDER BOOK + TRADES ══ */}
      <div style={{ padding: "32px 48px 52px", background: "#05080f" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

          {/* ── Order Book ── */}
          <div style={{
            background: "#080c18", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{
              padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(180,200,230,0.65)", letterSpacing: "0.08em" }}>ORDER BOOK</span>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                {spread !== null && (
                  <span style={{ color: "rgba(150,170,200,0.4)" }}>
                    Spread <span style={{ color: "#e0eaff", fontFamily: "monospace", fontWeight: 700 }}>{fmt(spread)}</span>
                  </span>
                )}
                {midPrice && (
                  <span style={{ color: "rgba(150,170,200,0.4)" }}>
                    Mid <span style={{ color: "#c9a84c", fontFamily: "monospace", fontWeight: 700 }}>{fmt(midPrice)}</span>
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: "16px 22px" }}>
              {/* Column headers */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 80px 1fr",
                fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em",
                marginBottom: 10, paddingBottom: 8,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span>DEPTH</span>
                <span style={{ textAlign: "center" }}>QTY</span>
                <span style={{ textAlign: "right" }}>PRICE (ASK)</span>
              </div>

              {/* Asks — reversed (highest at top, best ask nearest mid) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 6 }}>
                {asks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: "rgba(120,140,170,0.3)" }}>No asks</div>
                ) : [...asks].reverse().slice(0, 8).map(a => {
                  const pct = (a.quantity / maxAskQty) * 100;
                  return (
                    <div key={a.priceCents} style={{
                      display: "grid", gridTemplateColumns: "1fr 80px 1fr",
                      alignItems: "center", padding: "5px 8px", borderRadius: 6,
                      position: "relative", overflow: "hidden", fontSize: 12.5,
                      cursor: "pointer",
                    }}
                    onClick={() => { setPrice((a.priceCents / 100).toFixed(2)); setSide("bid"); }}
                    >
                      {/* Depth bar from right */}
                      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: `${pct}%`, background: "rgba(255,77,106,0.07)", borderRadius: "6px 0 0 6px" }} />
                      <div style={{ width: `${pct}%`, height: 3, background: "rgba(255,77,106,0.35)", borderRadius: 2 }} />
                      <span style={{ fontFamily: "monospace", color: "rgba(150,170,200,0.55)", textAlign: "center", zIndex: 1 }}>{a.quantity.toLocaleString()}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#ff6b82", textAlign: "right", zIndex: 1 }}>{fmt(a.priceCents)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Mid */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 8px", margin: "4px 0",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                <span style={{ fontSize: 15, fontWeight: 900, fontFamily: "monospace", color: card.change24h >= 0 ? "#00d4a0" : "#ff6b82" }}>
                  {midPrice ? fmt(midPrice) : fmt(card.lastPriceCents)}
                </span>
                <span style={{ fontSize: 10, color: "rgba(150,170,200,0.3)", letterSpacing: "0.06em" }}>LAST</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
              </div>

              {/* Column headers for bids */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 80px 1fr",
                fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em",
                marginBottom: 6, paddingTop: 4,
              }}>
                <span>PRICE (BID)</span>
                <span style={{ textAlign: "center" }}>QTY</span>
                <span style={{ textAlign: "right" }}>DEPTH</span>
              </div>

              {/* Bids */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {bids.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: "rgba(120,140,170,0.3)" }}>No bids</div>
                ) : bids.slice(0, 8).map(b => {
                  const pct = (b.quantity / maxBidQty) * 100;
                  return (
                    <div key={b.priceCents} style={{
                      display: "grid", gridTemplateColumns: "1fr 80px 1fr",
                      alignItems: "center", padding: "5px 8px", borderRadius: 6,
                      position: "relative", overflow: "hidden", fontSize: 12.5,
                      cursor: "pointer",
                    }}
                    onClick={() => { setPrice((b.priceCents / 100).toFixed(2)); setSide("ask"); }}
                    >
                      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${pct}%`, background: "rgba(0,212,160,0.07)", borderRadius: "0 6px 6px 0" }} />
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#00d4a0", zIndex: 1 }}>{fmt(b.priceCents)}</span>
                      <span style={{ fontFamily: "monospace", color: "rgba(150,170,200,0.55)", textAlign: "center", zIndex: 1 }}>{b.quantity.toLocaleString()}</span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: `${pct}%`, height: 3, background: "rgba(0,212,160,0.35)", borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {bids.length === 0 && asks.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(120,140,170,0.3)", fontSize: 13 }}>
                  No open orders — be the first to post a quote
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Trades ── */}
          <div style={{
            background: "#080c18", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(180,200,230,0.65)", letterSpacing: "0.08em" }}>RECENT TRADES</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#00d4a0" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4a0", boxShadow: "0 0 5px #00d4a0", display: "inline-block" }} />
                Live
              </span>
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 70px 80px",
              padding: "10px 22px 8px",
              fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              flexShrink: 0,
            }}>
              <span>PRICE</span>
              <span style={{ textAlign: "center" }}>SHARES</span>
              <span style={{ textAlign: "right" }}>TIME</span>
            </div>

            <div style={{ flex: 1, overflow: "hidden", padding: "8px 22px 16px" }}>
              {trades.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(120,140,170,0.3)", fontSize: 13 }}>
                  No trades yet
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {trades.slice(0, 20).map((t, i) => {
                    const prev = trades[i + 1];
                    const dir  = prev ? (t.priceCents >= prev.priceCents ? "up" : "down") : null;
                    return (
                      <div key={t.id} style={{
                        display: "grid", gridTemplateColumns: "1fr 70px 80px",
                        alignItems: "center", padding: "6px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.025)",
                        opacity: Math.max(0.25, 1 - i * 0.045),
                      }}>
                        <span style={{
                          fontFamily: "monospace", fontWeight: 700, fontSize: 13,
                          color: dir === "up" ? "#00d4a0" : dir === "down" ? "#ff6b82" : "#e0eaff",
                        }}>
                          {dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}{fmt(t.priceCents)}
                        </span>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(150,170,200,0.5)", textAlign: "center" }}>
                          {t.quantity.toLocaleString()}
                        </span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(120,140,170,0.38)", textAlign: "right" }}>
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
