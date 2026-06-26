"use client";
import { useEffect, useState, useMemo } from "react";
import { formatUSD } from "@/lib/format";

interface TxEntry {
  id: string; deltaCents: string; reason: string; refId: string | null; createdAt: string;
}
interface WalletData {
  balanceCents: string; lockedCents: string; availableCents: string; history: TxEntry[];
}

type TabAction = "deposit" | "withdraw";
type TxFilter  = "all" | "in" | "out" | "trades";

const QUICK = [10, 25, 50, 100, 250, 500];

function classifyTx(reason: string, delta: number) {
  if (reason === "deposit")       return { label: "Deposit",       icon: "↓", color: "#00d4a0", bg: "rgba(0,212,160,0.1)",  border: "rgba(0,212,160,0.2)"  };
  if (reason === "withdrawal")    return { label: "Withdrawal",    icon: "↑", color: "#ff4d6a", bg: "rgba(255,77,106,0.1)", border: "rgba(255,77,106,0.2)" };
  if (reason === "pack_purchase") return { label: "Pack Purchase", icon: "✦", color: "#a78bfa", bg: "rgba(167,139,250,0.1)",border: "rgba(167,139,250,0.2)"};
  if (reason === "pack_award")    return { label: "Pack Win",      icon: "★", color: "#c9a84c", bg: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.2)" };
  if (reason === "trade")         return { label: delta >= 0 ? "Trade · Sell" : "Trade · Buy", icon: "⇄", color: delta >= 0 ? "#00d4a0" : "#ff4d6a", bg: delta >= 0 ? "rgba(0,212,160,0.08)" : "rgba(255,77,106,0.08)", border: delta >= 0 ? "rgba(0,212,160,0.18)" : "rgba(255,77,106,0.18)" };
  if (reason === "fee")           return { label: "Fee",           icon: "−", color: "#ff4d6a", bg: "rgba(255,77,106,0.08)",border: "rgba(255,77,106,0.18)"};
  return { label: reason.replace(/_/g, " "), icon: "·", color: "rgba(150,170,200,0.5)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" };
}

function groupByDate(items: TxEntry[]) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest  = today - 86_400_000;

  const groups = new Map<string, TxEntry[]>();
  for (const item of items) {
    const d   = new Date(item.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const key = day === today ? "Today"
              : day === yest  ? "Yesterday"
              : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

export default function WalletPage() {
  const [wallet, setWallet]     = useState<WalletData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<TabAction>("deposit");
  const [filter, setFilter]     = useState<TxFilter>("all");
  const [depositAmt, setDepositAmt]   = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [depositing, setDepositing]   = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetch("/api/wallet").then(r => r.json()).then(setWallet).finally(() => setLoading(false));
  }, []);

  const deposit = async () => {
    const cents = Math.round(parseFloat(depositAmt) * 100);
    if (isNaN(cents) || cents < 100) { setMsg({ text: "Minimum deposit is $1.00", ok: false }); return; }
    setDepositing(true); setMsg(null);
    const res  = await fetch("/api/wallet/deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: cents }) });
    const data = await res.json();
    setDepositing(false);
    if (data.url) window.location.href = data.url;
    else setMsg({ text: data.error ?? "Error initiating deposit", ok: false });
  };

  const requestWithdraw = async () => {
    const cents = Math.round(parseFloat(withdrawAmt) * 100);
    if (isNaN(cents) || cents < 100) { setMsg({ text: "Minimum withdrawal is $1.00", ok: false }); return; }
    if (wallet && cents > Number(wallet.availableCents)) { setMsg({ text: "Amount exceeds available balance", ok: false }); return; }
    setWithdrawing(true); setMsg(null);
    const res  = await fetch("/api/wallet/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: cents }) });
    const data = await res.json();
    setWithdrawing(false);
    if (res.ok) { setMsg({ text: "Withdrawal requested. Admin will process within 1–2 business days.", ok: true }); setWithdrawAmt(""); }
    else setMsg({ text: data.error ?? "Error", ok: false });
  };

  const filteredHistory = useMemo(() => {
    if (!wallet) return [];
    return wallet.history.filter(h => {
      const delta = Number(h.deltaCents);
      if (filter === "in")     return delta > 0 && !h.reason.includes("trade");
      if (filter === "out")    return delta < 0 && !h.reason.includes("trade");
      if (filter === "trades") return h.reason.includes("trade");
      return true;
    });
  }, [wallet, filter]);

  const grouped = useMemo(() => groupByDate(filteredHistory), [filteredHistory]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.08)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#c9a84c", borderRightColor: "rgba(201,168,76,0.3)", animation: "spinnerRing 0.8s linear infinite" }} />
          <div style={{ position: "absolute", inset: "11px", borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(201,168,76,0.4)", animation: "spinnerRing 1.2s linear infinite reverse" }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.35)" }}>LOADING WALLET…</div>
      </div>
      <style>{`@keyframes spinnerRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!wallet) return null;

  const balance   = Number(wallet.balanceCents);
  const available = Number(wallet.availableCents);
  const locked    = Number(wallet.lockedCents);
  const lockedPct = balance > 0 ? (locked / balance) * 100 : 0;

  const FILTERS: { key: TxFilter; label: string }[] = [
    { key: "all",    label: "All" },
    { key: "in",     label: "Money In" },
    { key: "out",    label: "Money Out" },
    { key: "trades", label: "Trades" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "0 -24px" }}>

      {/* ══ HERO ══ */}
      <div style={{
        position: "relative", overflow: "hidden",
        padding: "48px 48px 52px",
        background: "linear-gradient(160deg, #03060c 0%, #07101e 55%, #04070d 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ position: "absolute", top: -80, right: "22%", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "8%",  width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", padding: "4px 14px", borderRadius: 20, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
              ✦ WALLET
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 28 }}>
            {/* Balance */}
            <div>
              <div style={{ fontSize: 11, color: "rgba(150,170,200,0.38)", letterSpacing: "0.1em", marginBottom: 8 }}>TOTAL BALANCE</div>
              <div style={{ fontSize: 54, fontWeight: 900, fontFamily: "monospace", letterSpacing: "-0.04em", color: "#fff", lineHeight: 1, textShadow: "0 0 60px rgba(201,168,76,0.1)" }}>
                {formatUSD(balance)}
              </div>

              {/* Balance utilization bar */}
              {balance > 0 && (
                <div style={{ marginTop: 16, width: 320 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(150,170,200,0.35)", letterSpacing: "0.06em", marginBottom: 6 }}>
                    <span>AVAILABLE {formatUSD(available)}</span>
                    {locked > 0 && <span>IN ORDERS {formatUSD(locked)}</span>}
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{ display: "flex", height: "100%" }}>
                      <div style={{ width: `${100 - lockedPct}%`, background: "linear-gradient(90deg, #009e78, #00d4a0)", transition: "width 0.4s ease" }} />
                      {locked > 0 && <div style={{ flex: 1, background: "rgba(201,168,76,0.45)" }} />}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stat chips */}
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <div style={{ background: "rgba(0,212,160,0.05)", border: "1px solid rgba(0,212,160,0.14)", borderRadius: 16, padding: "18px 26px", minWidth: 148 }}>
                <div style={{ fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em", marginBottom: 7 }}>AVAILABLE</div>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "#00d4a0", letterSpacing: "-0.02em" }}>{formatUSD(available)}</div>
                <div style={{ fontSize: 11, color: "rgba(0,212,160,0.45)", marginTop: 4 }}>Ready to trade</div>
              </div>
              {locked > 0 && (
                <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 26px", minWidth: 148 }}>
                  <div style={{ fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em", marginBottom: 7 }}>IN ORDERS</div>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "rgba(201,168,76,0.6)", letterSpacing: "-0.02em" }}>{formatUSD(locked)}</div>
                  <div style={{ fontSize: 11, color: "rgba(150,170,200,0.3)", marginTop: 4 }}>Locked by open bids</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", background: "#06090f" }}>

        {/* ── LEFT: Action Panel ── */}
        <div style={{ padding: "32px 32px 48px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>

          {/* Tab toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, gap: 4, marginBottom: 24 }}>
            {(["deposit", "withdraw"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setMsg(null); }} style={{
                flex: 1, padding: "11px 0", borderRadius: 9,
                fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer",
                transition: "all 0.15s",
                background: tab === t
                  ? t === "deposit" ? "linear-gradient(135deg, #c9a84c, #8a6020)" : "rgba(255,255,255,0.07)"
                  : "transparent",
                color: tab === t ? (t === "deposit" ? "#04100c" : "#e8eaf0") : "rgba(120,140,170,0.45)",
                boxShadow: tab === t && t === "deposit" ? "0 4px 16px rgba(201,168,76,0.22)" : "none",
                letterSpacing: "0.03em",
              }}>
                {t === "deposit" ? "Deposit" : "Withdraw"}
              </button>
            ))}
          </div>

          {/* Alert */}
          {msg && (
            <div style={{ padding: "11px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 18, lineHeight: 1.5, background: msg.ok ? "rgba(0,212,160,0.06)" : "rgba(255,77,106,0.06)", border: `1px solid ${msg.ok ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`, color: msg.ok ? "#00d4a0" : "#ff4d6a" }}>
              {msg.text}
            </div>
          )}

          {tab === "deposit" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: 12.5, color: "rgba(120,140,170,0.4)", lineHeight: 1.65, padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                Powered by Stripe · Funds arrive instantly · Minimum $1.00
              </div>

              {/* Quick amounts grid */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.35)", marginBottom: 10 }}>QUICK AMOUNTS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {QUICK.map(amt => (
                    <button key={amt} onClick={() => setDepositAmt(String(amt))} style={{
                      padding: "10px 0", borderRadius: 9, fontSize: 14, fontWeight: 700,
                      cursor: "pointer", transition: "all 0.12s",
                      border: depositAmt === String(amt) ? "1px solid rgba(201,168,76,0.45)" : "1px solid rgba(255,255,255,0.07)",
                      background: depositAmt === String(amt) ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)",
                      color: depositAmt === String(amt) ? "#c9a84c" : "rgba(160,180,210,0.5)",
                    }}>
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom input */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.35)", marginBottom: 8 }}>OR ENTER AMOUNT</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(150,170,200,0.35)", fontSize: 18, fontFamily: "monospace", fontWeight: 700 }}>$</span>
                  <input
                    type="number" min="1" step="1" placeholder="0.00"
                    value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 11, padding: "14px 16px 14px 40px", fontSize: 20, fontFamily: "monospace", fontWeight: 800, color: "#e8eaf0", outline: "none" }}
                  />
                </div>
              </div>

              <button
                onClick={deposit}
                disabled={depositing}
                style={{ padding: "15px 20px", borderRadius: 12, fontSize: 15, fontWeight: 800, border: "none", cursor: depositing ? "not-allowed" : "pointer", letterSpacing: "0.03em", transition: "all 0.13s", opacity: depositing ? 0.6 : 1, background: "linear-gradient(135deg, #c9a84c, #8a6020)", color: "#04100c", boxShadow: "0 6px 24px rgba(201,168,76,0.22)" }}
                onMouseEnter={e => { if (!depositing) (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(201,168,76,0.32)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(201,168,76,0.22)"; }}
              >
                {depositing ? "Redirecting…" : `Deposit${depositAmt ? ` $${depositAmt}` : ""} via Stripe →`}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: 12.5, color: "rgba(120,140,170,0.4)", lineHeight: 1.65, padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                Admin-processed · 1–2 business days · Only available balance can be withdrawn
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.35)" }}>AMOUNT</div>
                  <button
                    onClick={() => setWithdrawAmt((available / 100).toFixed(2))}
                    style={{ fontSize: 11, color: "#00d4a0", background: "rgba(0,212,160,0.08)", border: "1px solid rgba(0,212,160,0.18)", borderRadius: 6, padding: "3px 9px", cursor: "pointer" }}
                  >
                    Max {formatUSD(available)}
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(150,170,200,0.35)", fontSize: 18, fontFamily: "monospace", fontWeight: 700 }}>$</span>
                  <input
                    type="number" min="1" step="1" placeholder="0.00"
                    value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 11, padding: "14px 16px 14px 40px", fontSize: 20, fontFamily: "monospace", fontWeight: 800, color: "#e8eaf0", outline: "none" }}
                  />
                </div>

                {/* Utilization preview */}
                {withdrawAmt && Number(withdrawAmt) > 0 && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(150,170,200,0.45)", marginBottom: 4 }}>
                      <span>Remaining after withdrawal</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#e8eaf0" }}>
                        {formatUSD(Math.max(0, available - Math.round(parseFloat(withdrawAmt) * 100)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={requestWithdraw}
                disabled={withdrawing || !withdrawAmt}
                style={{ padding: "14px 20px", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: withdrawing || !withdrawAmt ? "not-allowed" : "pointer", letterSpacing: "0.03em", transition: "all 0.13s", opacity: withdrawing || !withdrawAmt ? 0.45 : 1, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e8eaf0" }}
                onMouseEnter={e => { if (!withdrawing && withdrawAmt) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; }}}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
              >
                {withdrawing ? "Submitting…" : "Request Withdrawal"}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Transaction History ── */}
        <div style={{ padding: "32px 40px 52px" }}>
          {/* Header + filters */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap" as const, gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)" }}>
              TRANSACTION HISTORY
              {wallet.history.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(150,170,200,0.45)", padding: "1px 8px", borderRadius: 10 }}>
                  {wallet.history.length}
                </span>
              )}
            </div>
            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: 3 }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: "5px 13px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: "none", cursor: "pointer", transition: "all 0.12s",
                  background: filter === f.key ? "rgba(255,255,255,0.08)" : "transparent",
                  color: filter === f.key ? "#e8eaf0" : "rgba(120,140,170,0.45)",
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "72px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}>
              <div style={{ fontSize: 32, opacity: 0.12, marginBottom: 12 }}>◆</div>
              <div style={{ fontSize: 14, color: "rgba(120,140,170,0.35)" }}>
                {filter === "all" ? "No transactions yet" : `No ${filter === "in" ? "incoming" : filter === "out" ? "outgoing" : "trade"} transactions`}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {Array.from(grouped.entries()).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  {/* Date group header */}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(120,140,170,0.35)", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <span>{dateLabel.toUpperCase()}</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
                    <span style={{ fontSize: 10, color: "rgba(120,140,170,0.25)" }}>
                      {formatUSD(items.reduce((s, h) => s + Number(h.deltaCents), 0))}
                    </span>
                  </div>

                  {/* Transactions */}
                  <div style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
                    {items.map((h, i) => {
                      const delta = Number(h.deltaCents);
                      const info  = classifyTx(h.reason, delta);
                      const isLast = i === items.length - 1;
                      return (
                        <div
                          key={h.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 16,
                            padding: "14px 18px",
                            borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* Icon */}
                          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: info.bg, border: `1px solid ${info.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: info.color, fontFamily: "monospace", fontWeight: 700 }}>
                            {info.icon}
                          </div>

                          {/* Label + time */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#dde5f0", marginBottom: 3 }}>
                              {info.label}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(120,140,170,0.38)" }}>
                              {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {h.refId && <span style={{ marginLeft: 8, color: "rgba(120,140,170,0.25)", fontFamily: "monospace", fontSize: 10 }}>#{h.refId.slice(0, 8)}</span>}
                            </div>
                          </div>

                          {/* Amount */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: delta >= 0 ? "#00d4a0" : "#ff4d6a" }}>
                              {delta >= 0 ? "+" : ""}{formatUSD(delta)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
