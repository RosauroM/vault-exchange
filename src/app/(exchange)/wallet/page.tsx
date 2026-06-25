"use client";
import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/format";

interface WalletData {
  balanceCents: string;
  lockedCents: string;
  availableCents: string;
  history: { id: string; deltaCents: string; reason: string; refId: string | null; createdAt: string }[];
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

function txIcon(reason: string) {
  if (reason.includes("deposit"))  return { icon: "↓", up: true  };
  if (reason.includes("withdraw")) return { icon: "↑", up: false };
  if (reason.includes("pack"))     return { icon: "✦", up: true  };
  if (reason.includes("order"))    return { icon: "⇄", up: null  };
  return { icon: "·", up: null };
}

export default function WalletPage() {
  const [wallet, setWallet]         = useState<WalletData | null>(null);
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null);
  const [tab, setTab]               = useState<"deposit" | "withdraw">("deposit");

  useEffect(() => {
    fetch("/api/wallet").then(r => r.json()).then(setWallet).finally(() => setLoading(false));
  }, []);

  const deposit = async () => {
    const cents = Math.round(parseFloat(depositAmt) * 100);
    if (cents < 100) { setMsg({ text: "Minimum deposit is $1.00", ok: false }); return; }
    const res  = await fetch("/api/wallet/deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: cents }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMsg({ text: data.error ?? "Error", ok: false });
  };

  const requestWithdraw = async () => {
    const cents = Math.round(parseFloat(withdrawAmt) * 100);
    const res  = await fetch("/api/wallet/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: cents }) });
    const data = await res.json();
    if (res.ok) setMsg({ text: "Withdrawal request submitted. Admin will process within 1–2 business days.", ok: true });
    else setMsg({ text: data.error ?? "Error", ok: false });
    setWithdrawAmt("");
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: "rgba(150,170,200,0.4)", fontSize: 14 }}>
      Loading wallet…
    </div>
  );
  if (!wallet) return null;

  const balance   = Number(wallet.balanceCents);
  const available = Number(wallet.availableCents);
  const locked    = Number(wallet.lockedCents);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 -24px" }}>

      {/* ── HERO ── */}
      <div style={{
        position: "relative",
        padding: "44px 48px 48px",
        background: "linear-gradient(160deg, #04070d 0%, #080f1e 60%, #05080f 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: "25%",  width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", padding: "4px 14px", borderRadius: 20, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
              ✦ WALLET
            </span>
          </div>

          {/* Balance + stats row */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            {/* Left: total balance */}
            <div>
              <div style={{ fontSize: 12, color: "rgba(120,140,170,0.45)", letterSpacing: "0.08em", marginBottom: 6 }}>TOTAL BALANCE</div>
              <div style={{ fontSize: 52, fontWeight: 900, fontFamily: "monospace", letterSpacing: "-0.04em", color: "#fff", lineHeight: 1, textShadow: "0 0 60px rgba(201,168,76,0.12)" }}>
                {formatUSD(balance)}
              </div>
            </div>

            {/* Right: available + in orders */}
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <div style={{ background: "rgba(0,212,160,0.05)", border: "1px solid rgba(0,212,160,0.15)", borderRadius: 14, padding: "16px 24px", minWidth: 160 }}>
                <div style={{ fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em", marginBottom: 6 }}>AVAILABLE</div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: "#00d4a0" }}>{formatUSD(available)}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 24px", minWidth: 160 }}>
                <div style={{ fontSize: 10, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em", marginBottom: 6 }}>IN ORDERS</div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: "rgba(150,170,200,0.45)" }}>{formatUSD(locked)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN BODY ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "400px 1fr",
        gap: 0,
        background: "#06090f",
        minHeight: 500,
      }}>

        {/* ── LEFT: Deposit / Withdraw form ── */}
        <div style={{
          padding: "36px 36px 48px",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, gap: 4, marginBottom: 24 }}>
            {(["deposit", "withdraw"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setMsg(null); }}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 9,
                  fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                  transition: "all 0.18s",
                  background: tab === t
                    ? t === "deposit" ? "linear-gradient(135deg, #c9a84c, #8a6020)" : "rgba(255,255,255,0.07)"
                    : "transparent",
                  color: tab === t ? (t === "deposit" ? "#05080f" : "#e8eaf0") : "rgba(120,140,170,0.5)",
                  boxShadow: tab === t && t === "deposit" ? "0 4px 14px rgba(201,168,76,0.25)" : "none",
                }}
              >
                {t === "deposit" ? "Deposit" : "Withdraw"}
              </button>
            ))}
          </div>

          {/* Message */}
          {msg && (
            <div style={{ padding: "12px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16, background: msg.ok ? "rgba(0,212,160,0.06)" : "rgba(255,77,106,0.06)", border: `1px solid ${msg.ok ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`, color: msg.ok ? "#00d4a0" : "#ff4d6a" }}>
              {msg.text}
            </div>
          )}

          {tab === "deposit" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: "rgba(120,140,170,0.45)", lineHeight: 1.6 }}>
                Processed instantly via Stripe. Funds available immediately.
              </div>

              {/* Quick amounts */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.35)", marginBottom: 10 }}>QUICK AMOUNTS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_AMOUNTS.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setDepositAmt(String(amt))}
                      style={{
                        padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                        border: depositAmt === String(amt) ? "1px solid rgba(201,168,76,0.5)" : "1px solid rgba(255,255,255,0.08)",
                        background: depositAmt === String(amt) ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.03)",
                        color: depositAmt === String(amt) ? "#c9a84c" : "rgba(150,170,200,0.6)",
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.35)", marginBottom: 8 }}>CUSTOM AMOUNT</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(150,170,200,0.4)", fontSize: 16, fontFamily: "monospace" }}>$</span>
                  <input
                    type="number" min="1" step="1" placeholder="0.00"
                    value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px 14px 36px", fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: "#e8eaf0", outline: "none" }}
                  />
                </div>
              </div>

              <button
                onClick={deposit}
                style={{ padding: "15px 20px", borderRadius: 12, fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #c9a84c, #8a6020)", color: "#05080f", boxShadow: "0 6px 24px rgba(201,168,76,0.25)", transition: "all 0.15s", letterSpacing: "0.02em" }}
              >
                Deposit {depositAmt ? `$${depositAmt}` : "funds"} via Stripe →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: "rgba(120,140,170,0.45)", lineHeight: 1.6 }}>
                Processed by admin within 1–2 business days.
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.35)", marginBottom: 8 }}>AMOUNT</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(150,170,200,0.4)", fontSize: 16, fontFamily: "monospace" }}>$</span>
                  <input
                    type="number" min="1" step="1" placeholder="0.00"
                    value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px 14px 36px", fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: "#e8eaf0", outline: "none" }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "rgba(120,140,170,0.35)", marginTop: 8 }}>
                  Available: <span style={{ color: "#00d4a0", fontFamily: "monospace" }}>{formatUSD(available)}</span>
                </div>
              </div>
              <button
                onClick={requestWithdraw}
                style={{ padding: "14px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "#e8eaf0", transition: "all 0.15s" }}
              >
                Request Withdrawal
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Transaction history ── */}
        <div style={{ padding: "36px 40px 48px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)", marginBottom: 20 }}>
            TRANSACTION HISTORY
          </div>

          {wallet.history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 14, color: "rgba(120,140,170,0.4)" }}>No transactions yet</div>
            </div>
          ) : (
            <div style={{ background: "#080d18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 120px", padding: "11px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(120,140,170,0.45)" }}>
                <span />
                <span>TYPE</span>
                <span>DATE</span>
                <span style={{ textAlign: "right" }}>AMOUNT</span>
              </div>

              {wallet.history.map((h, i) => {
                const delta  = Number(h.deltaCents);
                const up     = delta >= 0;
                const meta   = txIcon(h.reason);
                return (
                  <div
                    key={h.id}
                    style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 120px", padding: "13px 20px", alignItems: "center", borderBottom: i < wallet.history.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent")}
                  >
                    {/* Icon */}
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: up ? "rgba(0,212,160,0.08)" : "rgba(255,77,106,0.08)", border: `1px solid ${up ? "rgba(0,212,160,0.18)" : "rgba(255,77,106,0.18)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: meta.up === null ? "rgba(150,170,200,0.5)" : up ? "#00d4a0" : "#ff4d6a", fontFamily: "monospace" }}>
                      {meta.icon}
                    </div>

                    <div style={{ fontSize: 13, color: "#dde5f0", textTransform: "capitalize" as const }}>
                      {h.reason.replace(/_/g, " ")}
                    </div>

                    <div style={{ fontSize: 12, color: "rgba(120,140,170,0.4)" }}>
                      {new Date(h.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>

                    <div style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: up ? "#00d4a0" : "#ff4d6a" }}>
                      {up ? "+" : ""}{formatUSD(delta)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
