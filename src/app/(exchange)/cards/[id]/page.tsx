"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { HoloCard } from "@/components/exchange/HoloCard";
import { formatUSD } from "@/lib/format";

interface BookLevel { priceCents: number; quantity: number }
interface TradeRow   { id: string; priceCents: number; quantity: number; createdAt: string }
interface CardDetail {
  id: string; title: string; setName: string; year: number; grader: string;
  grade: number; imageUrl: string | null; referencePriceCents: number;
  sharesIssued: number; lastPriceCents: number; change24h: number;
}

const QUICK_QTY = [1, 5, 10, 25];

function fmtPrice(cents: number) {
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(2)}M`;
  if (cents >= 1_000_00)   return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [card, setCard]     = useState<CardDetail | null>(null);
  const [bids, setBids]     = useState<BookLevel[]>([]);
  const [asks, setAsks]     = useState<BookLevel[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [side, setSide]     = useState<"bid" | "ask">("bid");
  const [price, setPrice]   = useState("");
  const [qty, setQty]       = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null);

  const fetchAll = async () => {
    const [cardRes, bookRes, tradesRes] = await Promise.all([
      fetch(`/api/cards/${id}`).then(r => r.json()),
      fetch(`/api/cards/${id}/book`).then(r => r.json()),
      fetch(`/api/cards/${id}/trades`).then(r => r.json()),
    ]);
    setCard(cardRes);
    setBids(bookRes.bids ?? []);
    setAsks(bookRes.asks ?? []);
    setTrades(tradesRes);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 2500);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const placeOrder = async () => {
    if (!price || !qty) return;
    setPlacing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: id,
          side,
          priceCents: Math.round(parseFloat(price) * 100),
          quantity: parseInt(qty),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ text: `✓ Filled ${data.filled} of ${data.filled + data.remaining} shares`, ok: true });
      setPrice(""); setQty("");
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setPlacing(false);
    }
  };

  if (!card) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🃏</div>
        <div style={{ color: "rgba(150,170,200,0.5)", fontSize: 14 }}>Loading card…</div>
      </div>
    </div>
  );

  const bestBid   = bids[0]?.priceCents;
  const bestAsk   = asks[0]?.priceCents;
  const spread    = bestBid && bestAsk ? bestAsk - bestBid : null;
  const maxBidQty = bids.length ? Math.max(...bids.map(b => b.quantity)) : 1;
  const maxAskQty = asks.length ? Math.max(...asks.map(a => a.quantity)) : 1;
  const up        = card.change24h >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 -24px" }}>

      {/* ══════════════════════════════════════════
          HERO — blurred card art background
      ══════════════════════════════════════════ */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        padding: "40px 36px 48px",
        background: "#05080f",
      }}>
        {/* Full-bleed blurred card art */}
        {card.imageUrl && (
          <>
            <div style={{
              position: "absolute", inset: 0, zIndex: 0,
              backgroundImage: `url(${card.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(80px) saturate(1.8) brightness(0.35)",
              transform: "scale(1.1)",
            }} />
            {/* Gradient overlay */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 1,
              background: "linear-gradient(180deg, rgba(5,8,15,0.4) 0%, rgba(5,8,15,0.65) 70%, rgba(5,8,15,0.95) 100%)",
            }} />
          </>
        )}

        {/* Back link */}
        <div style={{ position: "relative", zIndex: 2, marginBottom: 28 }}>
          <Link href="/market" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "rgba(200,215,240,0.5)",
            textDecoration: "none", transition: "color 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(200,215,240,0.9)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,215,240,0.5)")}
          >
            ← Back to Market
          </Link>
        </div>

        {/* Main hero content */}
        <div style={{
          position: "relative", zIndex: 2,
          display: "flex",
          alignItems: "flex-start",
          gap: 48,
          flexWrap: "wrap",
        }}>
          {/* ── Large holographic card ── */}
          <div style={{ flexShrink: 0 }}>
            <HoloCard
              imageUrl={card.imageUrl}
              title={card.title}
              width={220}
              height={308}
            />
            {/* Grade tag below card */}
            <div style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "center",
              gap: 6,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                padding: "4px 12px", borderRadius: 20,
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "#c9a84c",
              }}>
                {card.grader} {Number(card.grade)}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: "4px 12px", borderRadius: 20,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(180,200,230,0.6)",
              }}>
                {card.year} · {card.setName}
              </span>
            </div>
          </div>

          {/* ── Card info + trade panel ── */}
          <div style={{ flex: 1, minWidth: 280 }}>
            {/* Title */}
            <h1 style={{
              fontSize: 30, fontWeight: 900,
              letterSpacing: "-0.025em",
              color: "#fff",
              lineHeight: 1.15,
              marginBottom: 6,
              textShadow: "0 2px 20px rgba(0,0,0,0.8)",
            }}>
              {card.title}
            </h1>
            <div style={{ fontSize: 13, color: "rgba(180,200,230,0.45)", marginBottom: 24 }}>
              Cert #{card.grader === "PSA" ? "12345678" : "11223344"} · Fractional shares
            </div>

            {/* Price row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap",
            }}>
              <div style={{
                fontSize: 44, fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: "-0.04em",
                color: "#fff",
                textShadow: "0 0 40px rgba(255,255,255,0.15)",
              }}>
                {fmtPrice(card.lastPriceCents)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  padding: "5px 14px", borderRadius: 8,
                  background: up ? "rgba(0,212,160,0.15)" : "rgba(255,77,106,0.15)",
                  border: `1px solid ${up ? "rgba(0,212,160,0.3)" : "rgba(255,77,106,0.3)"}`,
                  color: up ? "#00d4a0" : "#ff4d6a",
                }}>
                  {up ? "▲" : "▼"} {Math.abs(card.change24h).toFixed(2)}%
                </span>
                <span style={{ fontSize: 11, color: "rgba(150,170,200,0.45)", textAlign: "center" }}>
                  24h change
                </span>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{
              display: "flex",
              gap: 1,
              marginBottom: 28,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              {[
                { label: "Ref Price",     value: fmtPrice(card.referencePriceCents) },
                { label: "Market Cap",    value: fmtPrice(card.lastPriceCents * card.sharesIssued) },
                { label: "Shares Issued", value: card.sharesIssued.toLocaleString() },
              ].map((s, i) => (
                <div key={s.label} style={{
                  flex: 1,
                  padding: "14px 16px",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(150,170,200,0.4)", marginBottom: 5, letterSpacing: "0.06em" }}>
                    {s.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: "#e0eaff" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Inline trade panel ── */}
            <div style={{
              background: "rgba(10,16,30,0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "20px 22px",
              backdropFilter: "blur(20px)",
              maxWidth: 480,
            }}>
              {/* Buy / Sell toggle */}
              <div style={{
                display: "flex",
                background: "rgba(0,0,0,0.4)",
                borderRadius: 10,
                padding: 4,
                gap: 4,
                marginBottom: 18,
              }}>
                {(["bid", "ask"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 14,
                      letterSpacing: "0.04em",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      background: side === s
                        ? s === "bid"
                          ? "linear-gradient(135deg, #00c897, #009e78)"
                          : "linear-gradient(135deg, #ff4d6a, #cc2a44)"
                        : "transparent",
                      color: side === s ? (s === "bid" ? "#05080f" : "#fff") : "rgba(150,170,200,0.45)",
                      boxShadow: side === s
                        ? s === "bid" ? "0 4px 16px rgba(0,200,151,0.3)" : "0 4px 16px rgba(255,77,106,0.3)"
                        : "none",
                    }}
                  >
                    {s === "bid" ? "Buy Shares" : "Sell Shares"}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {/* Price input */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(150,170,200,0.5)", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>
                    PRICE / SHARE ($)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="exchange-input"
                      type="number" min="0.01" step="0.01"
                      placeholder={bestAsk ? (bestAsk / 100).toFixed(2) : "0.00"}
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      style={{ fontFamily: "monospace", fontSize: 15, background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)" }}
                    />
                    {bestAsk && side === "bid" && (
                      <button
                        onClick={() => setPrice((bestAsk / 100).toFixed(2))}
                        style={{
                          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                          fontSize: 9, color: "#c9a84c", background: "rgba(201,168,76,0.1)",
                          border: "none", cursor: "pointer", borderRadius: 4, padding: "2px 5px",
                        }}
                      >
                        ASK
                      </button>
                    )}
                  </div>
                </div>

                {/* Qty input */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(150,170,200,0.5)", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>
                    QUANTITY
                  </label>
                  <input
                    className="exchange-input"
                    type="number" min="1" step="1" placeholder="1"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: 15, background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)" }}
                  />
                </div>
              </div>

              {/* Quick qty */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {QUICK_QTY.map(q => (
                  <button
                    key={q}
                    onClick={() => setQty(String(q))}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 700,
                      border: `1px solid ${qty === String(q) ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)"}`,
                      background: qty === String(q) ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)",
                      color: qty === String(q) ? "#c9a84c" : "rgba(150,170,200,0.45)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    ×{q}
                  </button>
                ))}
              </div>

              {/* Total preview */}
              {price && qty && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", marginBottom: 14,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontSize: 12, color: "rgba(150,170,200,0.5)" }}>Order total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: "#fff" }}>
                    {formatUSD(Math.round(parseFloat(price || "0") * 100 * parseInt(qty || "0")))}
                  </span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={placeOrder}
                disabled={placing || !price || !qty}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 10,
                  border: "none",
                  cursor: placing || !price || !qty ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: "0.04em",
                  transition: "all 0.2s",
                  opacity: placing || !price || !qty ? 0.45 : 1,
                  background: side === "bid"
                    ? "linear-gradient(135deg, #00c897, #009e78)"
                    : "linear-gradient(135deg, #ff4d6a, #cc2a44)",
                  color: side === "bid" ? "#05080f" : "#fff",
                  boxShadow: placing || !price || !qty
                    ? "none"
                    : side === "bid"
                    ? "0 6px 24px rgba(0,200,151,0.35)"
                    : "0 6px 24px rgba(255,77,106,0.35)",
                }}
              >
                {placing ? "Placing order…" : side === "bid" ? "Buy Shares" : "Sell Shares"}
              </button>

              {msg && (
                <div style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  textAlign: "center",
                  background: msg.ok ? "rgba(0,212,160,0.08)" : "rgba(255,77,106,0.08)",
                  border: `1px solid ${msg.ok ? "rgba(0,212,160,0.25)" : "rgba(255,77,106,0.25)"}`,
                  color: msg.ok ? "#00d4a0" : "#ff4d6a",
                }}>
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          LOWER SECTION — Order book + Trades
      ══════════════════════════════════════════ */}
      <div style={{
        padding: "32px 36px 40px",
        background: "#06090f",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* ── Order Book ── */}
          <div style={{
            background: "#080e1c",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(180,200,230,0.7)", letterSpacing: "0.06em" }}>
                ORDER BOOK
              </span>
              {spread !== null && (
                <span style={{ fontSize: 11, color: "rgba(150,170,200,0.4)" }}>
                  Spread: <span style={{ color: "rgba(200,215,240,0.7)", fontFamily: "monospace" }}>
                    {formatUSD(spread)}
                  </span>
                </span>
              )}
            </div>

            <div style={{ padding: "12px 18px" }}>
              {/* Column headers */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 10, color: "rgba(120,140,170,0.45)",
                letterSpacing: "0.06em", marginBottom: 8,
              }}>
                <span>PRICE</span>
                <span>QTY</span>
                <span>DEPTH</span>
              </div>

              {/* Asks (sell orders) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 4 }}>
                {[...asks].reverse().slice(0, 6).map(a => {
                  const pct = (a.quantity / maxAskQty) * 100;
                  return (
                    <div key={a.priceCents} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 8px", borderRadius: 6,
                      background: `linear-gradient(90deg, rgba(255,77,106,0.07) 0%, rgba(255,77,106,0.02) 100%)`,
                      position: "relative", overflow: "hidden",
                      fontSize: 12,
                    }}>
                      <div style={{
                        position: "absolute", top: 0, bottom: 0, right: 0,
                        width: `${pct}%`,
                        background: "rgba(255,77,106,0.08)",
                      }} />
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#ff6b82", zIndex: 1 }}>
                        {fmtPrice(a.priceCents)}
                      </span>
                      <span style={{ fontFamily: "monospace", color: "rgba(150,170,200,0.6)", zIndex: 1 }}>
                        {a.quantity.toLocaleString()}
                      </span>
                      <div style={{ width: 48, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", zIndex: 1 }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: "#ff4d6a", opacity: 0.6 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mid price */}
              {bestBid && bestAsk && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 8px",
                  margin: "4px 0",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{
                    fontSize: 14, fontWeight: 800, fontFamily: "monospace",
                    color: "#e0eaff",
                  }}>
                    {fmtPrice(Math.round((bestBid + bestAsk) / 2))}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(150,170,200,0.35)" }}>MID</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>
              )}

              {/* Bids (buy orders) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                {bids.slice(0, 6).map(b => {
                  const pct = (b.quantity / maxBidQty) * 100;
                  return (
                    <div key={b.priceCents} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 8px", borderRadius: 6,
                      background: "linear-gradient(90deg, rgba(0,212,160,0.07) 0%, rgba(0,212,160,0.02) 100%)",
                      position: "relative", overflow: "hidden",
                      fontSize: 12,
                    }}>
                      <div style={{
                        position: "absolute", top: 0, bottom: 0, right: 0,
                        width: `${pct}%`,
                        background: "rgba(0,212,160,0.08)",
                      }} />
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#00d4a0", zIndex: 1 }}>
                        {fmtPrice(b.priceCents)}
                      </span>
                      <span style={{ fontFamily: "monospace", color: "rgba(150,170,200,0.6)", zIndex: 1 }}>
                        {b.quantity.toLocaleString()}
                      </span>
                      <div style={{ width: 48, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", zIndex: 1 }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: "#00d4a0", opacity: 0.5 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {bids.length === 0 && asks.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(120,140,170,0.35)", fontSize: 13 }}>
                  No open orders
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Trades ── */}
          <div style={{
            background: "#080e1c",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(180,200,230,0.7)", letterSpacing: "0.06em" }}>
                RECENT TRADES
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#00d4a0" }}>
                <span className="live-dot green" style={{ width: 5, height: 5 }} />
                Live
              </span>
            </div>

            <div style={{ padding: "12px 18px" }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 10, color: "rgba(120,140,170,0.45)",
                letterSpacing: "0.06em", marginBottom: 8,
              }}>
                <span>PRICE</span>
                <span>SHARES</span>
                <span>TIME</span>
              </div>

              {trades.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(120,140,170,0.35)", fontSize: 13 }}>
                  No trades yet
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {trades.slice(0, 16).map((t, i) => (
                    <div key={t.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "5px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      opacity: Math.max(0.3, 1 - i * 0.05),
                    }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#e0eaff" }}>
                        {fmtPrice(t.priceCents)}
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(150,170,200,0.55)" }}>
                        {t.quantity.toLocaleString()} sh
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(120,140,170,0.4)" }}>
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
