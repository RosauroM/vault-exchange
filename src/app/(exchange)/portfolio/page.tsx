"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Position {
  cardId: string; title: string; grade: number; grader: string; imageUrl: string | null;
  sharesIssued: number; quantity: number; available: number; locked: number;
  avgCostCents: number; currentPriceCents: number; currentValueCents: number; unrealizedPnlCents: number;
}
interface OpenOrder {
  id: string; side: string; priceCents: number; quantity: number; filledQuantity: number;
  status: string; card: { id: string; title: string };
}

type SortKey = "value" | "pnl" | "pnlpct" | "shares";

function fmt(cents: number) {
  if (Math.abs(cents) >= 100_000_00) return `$${(cents / 100_000_00).toFixed(2)}M`;
  if (Math.abs(cents) >= 1_000_00)   return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PortfolioPage() {
  const [positions, setPositions]   = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [sort, setSort]             = useState<SortKey>("value");
  const [sortDir, setSortDir]       = useState<1 | -1>(-1);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const fetchPortfolio = () =>
    fetch("/api/portfolio")
      .then(r => r.json())
      .then(d => { setPositions(d.positions ?? []); setOpenOrders(d.openOrders ?? []); })
      .finally(() => setLoading(false));

  useEffect(() => { fetchPortfolio(); }, []);

  const cancelOrder = async (id: string) => {
    setCancelling(id);
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    await fetchPortfolio();
    setCancelling(null);
  };

  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortDir(d => (d === -1 ? 1 : -1));
    else { setSort(key); setSortDir(-1); }
  };

  const totalValue    = positions.reduce((s, p) => s + p.currentValueCents, 0);
  const totalPnl      = positions.reduce((s, p) => s + p.unrealizedPnlCents, 0);
  const totalCost     = positions.reduce((s, p) => s + p.avgCostCents * p.quantity, 0);
  const pnlPct        = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const pnlUp         = totalPnl >= 0;
  const bestPosition  = positions.reduce<Position | null>((best, p) => {
    if (!best) return p;
    const bPct = best.avgCostCents > 0 ? best.unrealizedPnlCents / (best.avgCostCents * best.quantity) : 0;
    const pPct = p.avgCostCents > 0 ? p.unrealizedPnlCents / (p.avgCostCents * p.quantity) : 0;
    return pPct > bPct ? p : best;
  }, null);

  const sorted = [...positions].sort((a, b) => {
    let va = 0, vb = 0;
    if (sort === "value")  { va = a.currentValueCents; vb = b.currentValueCents; }
    if (sort === "pnl")    { va = a.unrealizedPnlCents; vb = b.unrealizedPnlCents; }
    if (sort === "pnlpct") {
      va = a.avgCostCents > 0 ? a.unrealizedPnlCents / (a.avgCostCents * a.quantity) : 0;
      vb = b.avgCostCents > 0 ? b.unrealizedPnlCents / (b.avgCostCents * b.quantity) : 0;
    }
    if (sort === "shares") { va = a.quantity; vb = b.quantity; }
    return (va - vb) * sortDir;
  });

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 0,
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        color: sort === col ? "#c9a84c" : "rgba(120,140,170,0.45)",
        display: "inline-flex", alignItems: "center", gap: 3,
      }}
    >
      {label}
      {sort === col && <span style={{ fontSize: 8 }}>{sortDir === -1 ? "▼" : "▲"}</span>}
    </button>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.08)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#c9a84c", borderRightColor: "rgba(201,168,76,0.3)", animation: "spinnerRing 0.8s linear infinite" }} />
          <div style={{ position: "absolute", inset: "11px", borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(201,168,76,0.4)", animation: "spinnerRing 1.2s linear infinite reverse" }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.35)" }}>LOADING PORTFOLIO…</div>
      </div>
      <style>{`@keyframes spinnerRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "0 -24px" }}>

      {/* ══ HERO ══ */}
      <div style={{
        position: "relative", overflow: "hidden",
        padding: "48px 48px 52px",
        background: "linear-gradient(160deg, #03060c 0%, #070e1c 55%, #04070d 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {/* P&L-reactive glow */}
        <div style={{ position: "absolute", top: -80, right: "20%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${pnlUp ? "rgba(0,212,160,0.07)" : "rgba(255,77,106,0.06)"} 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "8%",  width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", padding: "4px 14px", borderRadius: 20, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
              ✦ PORTFOLIO
            </span>
          </div>

          {/* Total value + P&L in one line */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" as const, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(150,170,200,0.38)", letterSpacing: "0.1em", marginBottom: 8 }}>TOTAL VALUE</div>
              <div style={{ fontSize: 52, fontWeight: 900, fontFamily: "monospace", letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                {fmt(totalValue)}
              </div>
            </div>
            {positions.length > 0 && (
              <div style={{ paddingBottom: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(150,170,200,0.38)", letterSpacing: "0.1em", marginBottom: 8 }}>UNREALIZED P&amp;L</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, fontFamily: "monospace", color: pnlUp ? "#00d4a0" : "#ff4d6a" }}>
                    {pnlUp ? "+" : ""}{fmt(totalPnl)}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 800, padding: "5px 13px", borderRadius: 8,
                    background: pnlUp ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)",
                    border: `1px solid ${pnlUp ? "rgba(0,212,160,0.22)" : "rgba(255,77,106,0.22)"}`,
                    color: pnlUp ? "#00d4a0" : "#ff4d6a",
                  }}>
                    {pnlUp ? "▲" : "▼"} {Math.abs(pnlPct).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
            {[
              { label: "Cost Basis",    value: fmt(totalCost),                         color: "rgba(200,215,240,0.55)" },
              { label: "Holdings",      value: `${positions.length} card${positions.length !== 1 ? "s" : ""}`, color: "#e8eaf0" },
              { label: "Open Orders",   value: `${openOrders.length}`,                 color: openOrders.length > 0 ? "#c9a84c" : "rgba(200,215,240,0.55)" },
              ...(bestPosition ? [{
                label: "Top Gainer",
                value: bestPosition.avgCostCents > 0
                  ? `+${((bestPosition.unrealizedPnlCents / (bestPosition.avgCostCents * bestPosition.quantity)) * 100).toFixed(1)}%`
                  : "—",
                color: "#00d4a0",
              }] : []),
            ].map(s => (
              <div key={s.label} style={{
                padding: "13px 20px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em", marginBottom: 5 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ HOLDINGS ══ */}
      <div style={{ padding: "36px 48px", background: "#06090f", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)" }}>HOLDINGS</div>
          <Link href="/market" style={{ fontSize: 12.5, color: "#c9a84c", textDecoration: "none", padding: "6px 14px", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8 }}>
            + Browse Market
          </Link>
        </div>

        {positions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 18 }}>
            <div style={{ fontSize: 40, opacity: 0.15, marginBottom: 14 }}>◆</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(180,200,230,0.5)", marginBottom: 8 }}>No holdings yet</div>
            <div style={{ fontSize: 13, color: "rgba(120,140,170,0.35)", lineHeight: 1.6 }}>
              <Link href="/market" style={{ color: "#c9a84c", textDecoration: "none" }}>Buy shares on the market</Link>
              {" or "}
              <Link href="/packs" style={{ color: "#00d4a0", textDecoration: "none" }}>win shares via packs</Link>
            </div>
          </div>
        ) : (
          <div style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>

            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(200px,2fr) 90px 100px 100px 110px 110px 100px 80px",
              padding: "11px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              fontSize: 10, letterSpacing: "0.08em",
            }}>
              <span style={{ color: "rgba(120,140,170,0.45)", fontWeight: 700 }}>CARD</span>
              <span style={{ textAlign: "right" }}><SortBtn col="shares" label="SHARES" /></span>
              <span style={{ textAlign: "right", color: "rgba(120,140,170,0.45)", fontWeight: 700 }}>AVG COST</span>
              <span style={{ textAlign: "right", color: "rgba(120,140,170,0.45)", fontWeight: 700 }}>PRICE</span>
              <span style={{ textAlign: "right" }}><SortBtn col="value" label="VALUE" /></span>
              <span style={{ textAlign: "right" }}><SortBtn col="pnl" label="P&L ($)" /></span>
              <span style={{ textAlign: "right" }}><SortBtn col="pnlpct" label="P&L (%)" /></span>
              <span />
            </div>

            {sorted.map((p, i) => {
              const up       = p.unrealizedPnlCents >= 0;
              const pnlPct   = p.avgCostCents > 0 && p.quantity > 0
                ? (p.unrealizedPnlCents / (p.avgCostCents * p.quantity)) * 100
                : 0;
              const weight   = totalValue > 0 ? (p.currentValueCents / totalValue) * 100 : 0;
              const hovered  = hoveredRow === p.cardId;

              return (
                <div
                  key={p.cardId}
                  onMouseEnter={() => setHoveredRow(p.cardId)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(200px,2fr) 90px 100px 100px 110px 110px 100px 80px",
                    padding: "14px 20px",
                    alignItems: "center",
                    borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    background: hovered ? "rgba(201,168,76,0.025)" : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    transition: "background 0.12s",
                  }}
                >
                  {/* Card cell */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 42, height: 58, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                      background: "#06090f", border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.5)" : "none",
                      transition: "box-shadow 0.15s",
                    }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "rgba(201,168,76,0.3)" }}>✦</div>
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: hovered ? "#fff" : "#e0eaff",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        transition: "color 0.12s",
                      }}>
                        {p.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "#c9a84c", fontWeight: 700, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)", padding: "1px 7px", borderRadius: 4 }}>
                          {p.grader} {Number(p.grade)}
                        </span>
                        {/* Portfolio weight bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 40, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, weight)}%`, height: "100%", background: "rgba(201,168,76,0.5)", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "rgba(150,170,200,0.35)" }}>{weight.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shares */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>{p.quantity.toLocaleString()}</div>
                    {p.locked > 0 && (
                      <div style={{ fontSize: 10, color: "rgba(201,168,76,0.55)", marginTop: 2 }}>
                        {p.locked} locked
                      </div>
                    )}
                    {p.available < p.quantity && p.locked === 0 && (
                      <div style={{ fontSize: 10, color: "rgba(120,140,170,0.35)", marginTop: 2 }}>{p.available} avail</div>
                    )}
                  </div>

                  {/* Avg cost */}
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "rgba(150,170,200,0.45)" }}>
                    {p.avgCostCents > 0 ? fmt(p.avgCostCents) : "—"}
                  </div>

                  {/* Current price */}
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, color: "#e0eaff", fontWeight: 600 }}>
                    {fmt(p.currentPriceCents)}
                  </div>

                  {/* Total value */}
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: "#e8eaf0" }}>
                    {fmt(p.currentValueCents)}
                  </div>

                  {/* P&L $ */}
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: up ? "#00d4a0" : "#ff4d6a" }}>
                    {up ? "+" : ""}{fmt(p.unrealizedPnlCents)}
                  </div>

                  {/* P&L % */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: "3px 9px", borderRadius: 6,
                      background: up ? "rgba(0,212,160,0.09)" : "rgba(255,77,106,0.09)",
                      border: `1px solid ${up ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`,
                      color: up ? "#00d4a0" : "#ff4d6a",
                      fontFamily: "monospace",
                    }}>
                      {up ? "+" : ""}{pnlPct.toFixed(2)}%
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ textAlign: "right" }}>
                    <Link
                      href={`/cards/${p.cardId}`}
                      style={{
                        fontSize: 11, fontWeight: 800, color: hovered ? "#05080f" : "#c9a84c",
                        textDecoration: "none", padding: "6px 13px", borderRadius: 7, display: "inline-block",
                        background: hovered ? "linear-gradient(135deg, #c9a84c, #8a6020)" : "rgba(201,168,76,0.08)",
                        border: "1px solid rgba(201,168,76,0.25)",
                        transition: "all 0.13s",
                        boxShadow: hovered ? "0 4px 14px rgba(201,168,76,0.2)" : "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Trade
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Portfolio total row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(200px,2fr) 90px 100px 100px 110px 110px 100px 80px",
              padding: "13px 20px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.02em",
            }}>
              <span style={{ color: "rgba(150,170,200,0.5)" }}>Total · {positions.length} position{positions.length !== 1 ? "s" : ""}</span>
              <span />
              <span />
              <span />
              <span style={{ textAlign: "right", fontFamily: "monospace", color: "#e8eaf0", fontSize: 14 }}>{fmt(totalValue)}</span>
              <span style={{ textAlign: "right", fontFamily: "monospace", color: pnlUp ? "#00d4a0" : "#ff4d6a" }}>
                {pnlUp ? "+" : ""}{fmt(totalPnl)}
              </span>
              <span style={{ textAlign: "right" }}>
                <span style={{
                  fontSize: 12, fontWeight: 800, padding: "3px 9px", borderRadius: 6,
                  background: pnlUp ? "rgba(0,212,160,0.09)" : "rgba(255,77,106,0.09)",
                  border: `1px solid ${pnlUp ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`,
                  color: pnlUp ? "#00d4a0" : "#ff4d6a",
                  fontFamily: "monospace",
                }}>
                  {pnlUp ? "+" : ""}{Math.abs(pnlPct).toFixed(2)}%
                </span>
              </span>
              <span />
            </div>
          </div>
        )}
      </div>

      {/* ══ OPEN ORDERS ══ */}
      <div style={{ padding: "32px 48px 56px", background: "#05080f" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)" }}>
            OPEN ORDERS
            {openOrders.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c", padding: "1px 7px", borderRadius: 10 }}>
                {openOrders.length}
              </span>
            )}
          </div>
        </div>

        {openOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, color: "rgba(120,140,170,0.3)", fontSize: 13 }}>
            No open orders
          </div>
        ) : (
          <div style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "minmax(180px,2fr) 80px 110px 80px 1fr 100px",
              padding: "11px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(120,140,170,0.45)",
            }}>
              <span>CARD</span>
              <span>SIDE</span>
              <span style={{ textAlign: "right" }}>LIMIT PRICE</span>
              <span style={{ textAlign: "center" }}>QTY</span>
              <span style={{ padding: "0 16px" }}>FILL PROGRESS</span>
              <span />
            </div>

            {openOrders.map((o, i) => {
              const fillPct = o.quantity > 0 ? (o.filledQuantity / o.quantity) * 100 : 0;
              const isBuy   = o.side === "bid";
              const isLast  = i === openOrders.length - 1;
              return (
                <div
                  key={o.id}
                  style={{
                    display: "grid", gridTemplateColumns: "minmax(180px,2fr) 80px 110px 80px 1fr 100px",
                    padding: "15px 20px", alignItems: "center",
                    borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent")}
                >
                  {/* Card name */}
                  <div>
                    <Link href={`/cards/${o.card.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#dde5f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#c9a84c")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#dde5f0")}
                      >
                        {o.card.title}
                      </div>
                    </Link>
                    <div style={{ fontSize: 10, color: "rgba(120,140,170,0.35)", marginTop: 2 }}>
                      {o.status === "partial" ? `${o.filledQuantity} filled` : "pending"}
                    </div>
                  </div>

                  {/* Side badge */}
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                      padding: "4px 10px", borderRadius: 6,
                      background: isBuy ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)",
                      border: `1px solid ${isBuy ? "rgba(0,212,160,0.22)" : "rgba(255,77,106,0.22)"}`,
                      color: isBuy ? "#00d4a0" : "#ff4d6a",
                    }}>
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>
                    {fmt(o.priceCents)}
                  </div>

                  {/* Qty */}
                  <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 13, color: "#e8eaf0" }}>
                    {o.quantity}
                  </div>

                  {/* Fill progress bar */}
                  <div style={{ padding: "0 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          width: `${fillPct}%`, height: "100%", borderRadius: 3,
                          background: isBuy
                            ? "linear-gradient(90deg, #009e78, #00d4a0)"
                            : "linear-gradient(90deg, #c0203a, #ff4d6a)",
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(150,170,200,0.45)", fontFamily: "monospace", flexShrink: 0, minWidth: 36 }}>
                        {fillPct.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(120,140,170,0.3)", marginTop: 4 }}>
                      {o.filledQuantity} / {o.quantity} shares filled
                    </div>
                  </div>

                  {/* Cancel */}
                  <div style={{ textAlign: "right" }}>
                    <button
                      onClick={() => cancelOrder(o.id)}
                      disabled={cancelling === o.id}
                      style={{
                        fontSize: 11, fontWeight: 700, color: "#ff4d6a",
                        background: "rgba(255,77,106,0.05)",
                        border: "1px solid rgba(255,77,106,0.2)",
                        cursor: cancelling === o.id ? "not-allowed" : "pointer",
                        padding: "6px 14px", borderRadius: 8,
                        transition: "all 0.13s",
                        opacity: cancelling === o.id ? 0.45 : 1,
                      }}
                      onMouseEnter={e => { if (cancelling !== o.id) { (e.currentTarget as HTMLElement).style.background = "rgba(255,77,106,0.12)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,77,106,0.4)"; }}}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,77,106,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,77,106,0.2)"; }}
                    >
                      {cancelling === o.id ? "…" : "Cancel"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
