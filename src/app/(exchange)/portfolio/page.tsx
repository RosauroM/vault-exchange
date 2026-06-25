"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatUSD } from "@/lib/format";

interface Position {
  cardId: string; title: string; grade: number; grader: string; imageUrl: string | null;
  sharesIssued: number; quantity: number; available: number; locked: number;
  avgCostCents: number; currentPriceCents: number; currentValueCents: number; unrealizedPnlCents: number;
}
interface OpenOrder {
  id: string; side: string; priceCents: number; quantity: number; filledQuantity: number;
  status: string; card: { id: string; title: string };
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchPortfolio = () =>
    fetch("/api/portfolio")
      .then(r => r.json())
      .then(d => { setPositions(d.positions); setOpenOrders(d.openOrders); })
      .finally(() => setLoading(false));

  useEffect(() => { fetchPortfolio(); }, []);

  const cancelOrder = async (id: string) => {
    setCancelling(id);
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    await fetchPortfolio();
    setCancelling(null);
  };

  const totalValue = positions.reduce((s, p) => s + p.currentValueCents, 0);
  const totalPnl   = positions.reduce((s, p) => s + p.unrealizedPnlCents, 0);
  const pnlPct     = totalValue - totalPnl > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;
  const pnlUp      = totalPnl >= 0;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: "rgba(150,170,200,0.4)", fontSize: 14 }}>
      Loading portfolio…
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 -24px" }}>

      {/* ── HERO ── */}
      <div style={{
        position: "relative",
        padding: "44px 36px 48px",
        background: "linear-gradient(160deg, #04070d 0%, #080f1e 60%, #05080f 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}>
        {/* Glow orbs */}
        <div style={{ position: "absolute", top: -60, right: "15%", width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${pnlUp ? "rgba(0,212,160,0.06)" : "rgba(255,77,106,0.05)"} 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", padding: "4px 12px", borderRadius: 20, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
              ✦ PORTFOLIO
            </span>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", marginBottom: 28, lineHeight: 1 }}>
            My Holdings
          </h1>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 640 }}>
            {[
              { label: "PORTFOLIO VALUE", value: formatUSD(totalValue), color: "#e8eaf0", sub: null },
              { label: "UNREALIZED P&L",  value: `${pnlUp ? "+" : ""}${formatUSD(totalPnl)}`, color: pnlUp ? "#00d4a0" : "#ff4d6a", sub: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` },
              { label: "POSITIONS",       value: positions.length.toString(), color: "#e8eaf0", sub: `${openOrders.length} open orders` },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: "16px 18px",
              }}>
                <div style={{ fontSize: 10, color: "rgba(120,140,170,0.5)", letterSpacing: "0.1em", marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", letterSpacing: "-0.02em", color: stat.color }}>{stat.value}</div>
                {stat.sub && <div style={{ fontSize: 11, color: pnlUp ? "#00d4a0" : "#ff4d6a", marginTop: 3 }}>{stat.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOLDINGS TABLE ── */}
      <div style={{ padding: "32px 36px", background: "#06090f", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)" }}>HOLDINGS</div>
          <Link href="/market" style={{ fontSize: 12, color: "#c9a84c", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            Browse market →
          </Link>
        </div>

        {positions.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "56px 24px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, color: "rgba(150,170,200,0.5)", marginBottom: 8 }}>No positions yet</div>
            <div style={{ fontSize: 13, color: "rgba(100,120,150,0.4)" }}>
              <Link href="/market" style={{ color: "#c9a84c", textDecoration: "none" }}>Browse the market</Link>
              {" "}or{" "}
              <Link href="/packs" style={{ color: "#00d4a0", textDecoration: "none" }}>open a pack</Link>
              {" "}to get started
            </div>
          </div>
        ) : (
          <div style={{
            background: "#080d18",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 80px 100px 100px 100px 90px 72px",
              padding: "11px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              color: "rgba(120,140,170,0.45)",
            }}>
              <span>CARD</span>
              <span style={{ textAlign: "right" }}>SHARES</span>
              <span style={{ textAlign: "right" }}>AVG COST</span>
              <span style={{ textAlign: "right" }}>CURRENT</span>
              <span style={{ textAlign: "right" }}>VALUE</span>
              <span style={{ textAlign: "right" }}>P&amp;L</span>
              <span />
            </div>

            {positions.map((p, i) => {
              const up = p.unrealizedPnlCents >= 0;
              return (
                <div
                  key={p.cardId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 80px 100px 100px 100px 90px 72px",
                    padding: "14px 20px",
                    alignItems: "center",
                    borderBottom: i < positions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent")}
                >
                  {/* Card cell */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    {p.imageUrl ? (
                      <div style={{ width: 36, height: 50, borderRadius: 5, overflow: "hidden", flexShrink: 0, background: "#060b14", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Image src={p.imageUrl} alt={p.title} width={36} height={50} style={{ objectFit: "contain" }} unoptimized />
                      </div>
                    ) : (
                      <div style={{ width: 36, height: 50, borderRadius: 5, flexShrink: 0, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(120,140,170,0.45)", marginTop: 2 }}>{p.grader} {Number(p.grade)}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "#e8eaf0" }}>
                    {p.quantity.toLocaleString()}
                    {p.locked > 0 && <div style={{ fontSize: 10, color: "rgba(120,140,170,0.4)" }}>{p.locked} locked</div>}
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "rgba(150,170,200,0.45)" }}>{formatUSD(p.avgCostCents)}</div>
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "#e8eaf0" }}>{formatUSD(p.currentPriceCents)}</div>
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{formatUSD(p.currentValueCents)}</div>
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: up ? "#00d4a0" : "#ff4d6a" }}>
                    {up ? "+" : ""}{formatUSD(p.unrealizedPnlCents)}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Link
                      href={`/cards/${p.cardId}`}
                      style={{
                        fontSize: 11, fontWeight: 700,
                        color: "#c9a84c",
                        textDecoration: "none",
                        padding: "5px 11px",
                        border: "1px solid rgba(201,168,76,0.25)",
                        borderRadius: 7,
                        transition: "all 0.15s",
                        display: "inline-block",
                      }}
                    >
                      Trade
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── OPEN ORDERS ── */}
      {openOrders.length > 0 && (
        <div style={{ padding: "32px 36px 48px", background: "#05080f" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)", marginBottom: 16 }}>
            OPEN ORDERS
          </div>

          <div style={{
            background: "#080d18",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 80px 100px 70px 70px 80px",
              padding: "11px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              color: "rgba(120,140,170,0.45)",
            }}>
              <span>CARD</span>
              <span>SIDE</span>
              <span style={{ textAlign: "right" }}>PRICE</span>
              <span style={{ textAlign: "right" }}>QTY</span>
              <span style={{ textAlign: "right" }}>FILLED</span>
              <span />
            </div>

            {openOrders.map((o, i) => (
              <div
                key={o.id}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 80px 100px 70px 70px 80px",
                  padding: "14px 20px",
                  alignItems: "center",
                  borderBottom: i < openOrders.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <div style={{ fontSize: 13, color: "#dde5f0", fontWeight: 500 }}>{o.card.title}</div>
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                    padding: "3px 8px", borderRadius: 4,
                    background: o.side === "bid" ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)",
                    border: `1px solid ${o.side === "bid" ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`,
                    color: o.side === "bid" ? "#00d4a0" : "#ff4d6a",
                  }}>
                    {o.side === "bid" ? "BUY" : "SELL"}
                  </span>
                </div>
                <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "#e8eaf0" }}>{formatUSD(o.priceCents)}</div>
                <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "#e8eaf0" }}>{o.quantity}</div>
                <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "rgba(120,140,170,0.45)" }}>{o.filledQuantity}</div>
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => cancelOrder(o.id)}
                    disabled={cancelling === o.id}
                    style={{
                      fontSize: 11, fontWeight: 700,
                      color: "#ff4d6a",
                      background: "none",
                      border: "1px solid rgba(255,77,106,0.22)",
                      cursor: "pointer",
                      padding: "5px 11px",
                      borderRadius: 7,
                      transition: "all 0.15s",
                      opacity: cancelling === o.id ? 0.5 : 1,
                    }}
                  >
                    {cancelling === o.id ? "…" : "Cancel"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
