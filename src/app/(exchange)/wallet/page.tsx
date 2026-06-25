"use client";
import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/format";

interface WalletData {
  balanceCents: string;
  lockedCents: string;
  availableCents: string;
  history: { id: string; deltaCents: string; reason: string; refId: string | null; createdAt: string }[];
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/wallet").then((r) => r.json()).then(setWallet).finally(() => setLoading(false));
  }, []);

  const deposit = async () => {
    const cents = Math.round(parseFloat(depositAmt) * 100);
    if (cents < 100) { setMsg({ text: "Minimum deposit is $1.00", ok: false }); return; }
    const res = await fetch("/api/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: cents }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMsg({ text: data.error ?? "Error", ok: false });
  };

  const requestWithdraw = async () => {
    const cents = Math.round(parseFloat(withdrawAmt) * 100);
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: cents }),
    });
    const data = await res.json();
    if (res.ok) setMsg({ text: "Withdrawal request submitted. Admin will process it shortly.", ok: true });
    else setMsg({ text: data.error ?? "Error", ok: false });
    setWithdrawAmt("");
  };

  if (loading) return <div className="text-muted text-sm">Loading...</div>;
  if (!wallet) return null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Wallet</h1>

      {/* Balance card */}
      <div className="exchange-card p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-xs text-muted mb-1">Total balance</div>
            <div className="text-xl font-bold text-white">{formatUSD(Number(wallet.balanceCents))}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Available</div>
            <div className="text-xl font-bold text-up">{formatUSD(Number(wallet.availableCents))}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">In orders</div>
            <div className="text-xl font-bold text-muted">{formatUSD(Number(wallet.lockedCents))}</div>
          </div>
        </div>

        {msg && (
          <div
            className="text-sm rounded p-3 mb-4"
            style={{ background: msg.ok ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)", color: msg.ok ? "#00d4a0" : "#ff4d6a" }}
          >
            {msg.text}
          </div>
        )}

        {/* Deposit */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">Deposit (via Stripe)</div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input
                className="exchange-input pl-7"
                type="number" min="1" step="1" placeholder="100"
                value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
              />
            </div>
            <button className="btn-primary whitespace-nowrap" onClick={deposit}>Deposit</button>
          </div>
        </div>

        {/* Withdraw */}
        <div className="flex flex-col gap-3" style={{ borderTop: "1px solid #1e2a3a", paddingTop: 16 }}>
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">Withdrawal Request</div>
            <div className="text-xs text-muted mt-1">Admin-reviewed · processed within 1-2 business days</div>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input
                className="exchange-input pl-7"
                type="number" min="1" step="1" placeholder="50"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
              />
            </div>
            <button className="btn-primary whitespace-nowrap" onClick={requestWithdraw}>Request</button>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="exchange-card overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: "#1e2a3a" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">Transaction History</div>
        </div>
        {wallet.history.length === 0 ? (
          <div className="p-6 text-muted text-sm text-center">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b" style={{ borderColor: "#1e2a3a" }}>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-right px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {wallet.history.map((h) => {
                  const delta = Number(h.deltaCents);
                  return (
                    <tr key={h.id} className="border-b" style={{ borderColor: "#1e2a3a" }}>
                      <td className="px-4 py-2 text-xs text-muted">{new Date(h.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-xs text-white capitalize">{h.reason.replace("_", " ")}</td>
                      <td className={`px-4 py-2 text-right text-xs font-mono font-semibold ${delta >= 0 ? "text-up" : "text-down"}`}>
                        {delta >= 0 ? "+" : ""}{formatUSD(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
