"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
      .then((r) => r.json())
      .then((d) => { setPositions(d.positions); setOpenOrders(d.openOrders); })
      .finally(() => setLoading(false));

  useEffect(() => { fetchPortfolio(); }, []);

  const cancelOrder = async (id: string) => {
    setCancelling(id);
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    await fetchPortfolio();
    setCancelling(null);
  };

  const totalValue = positions.reduce((s, p) => s + p.currentValueCents, 0);
  const totalPnl = positions.reduce((s, p) => s + p.unrealizedPnlCents, 0);

  if (loading) return <div className="text-muted text-sm">Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <div className="text-right">
          <div className="text-xs text-muted">Total value</div>
          <div className="text-xl font-bold text-white">{formatUSD(totalValue)}</div>
          <div className={`text-sm font-semibold ${totalPnl >= 0 ? "text-up" : "text-down"}`}>
            {totalPnl >= 0 ? "+" : ""}{formatUSD(totalPnl)} P&L
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="exchange-card overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: "#1e2a3a" }}>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">Holdings</div>
        </div>
        {positions.length === 0 ? (
          <div className="p-6 text-muted text-sm text-center">No positions yet. <Link href="/market" className="text-gold">Browse the market</Link></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b" style={{ borderColor: "#1e2a3a" }}>
                  <th className="text-left px-4 py-2">Card</th>
                  <th className="text-right px-4 py-2">Shares</th>
                  <th className="text-right px-4 py-2">Avg cost</th>
                  <th className="text-right px-4 py-2">Current</th>
                  <th className="text-right px-4 py-2">Value</th>
                  <th className="text-right px-4 py-2">P&L</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.cardId} className="border-b hover:bg-[#0d1321] transition-colors" style={{ borderColor: "#1e2a3a" }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-xs leading-tight">{p.title}</div>
                      <div className="text-muted text-xs">{p.grader} {Number(p.grade)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">{p.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{formatUSD(p.avgCostCents)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{formatUSD(p.currentPriceCents)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{formatUSD(p.currentValueCents)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${p.unrealizedPnlCents >= 0 ? "text-up" : "text-down"}`}>
                      {p.unrealizedPnlCents >= 0 ? "+" : ""}{formatUSD(p.unrealizedPnlCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/cards/${p.cardId}`} className="text-gold text-xs hover:underline">Trade</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Orders */}
      {openOrders.length > 0 && (
        <div className="exchange-card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: "#1e2a3a" }}>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">Open Orders</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b" style={{ borderColor: "#1e2a3a" }}>
                  <th className="text-left px-4 py-2">Card</th>
                  <th className="text-left px-4 py-2">Side</th>
                  <th className="text-right px-4 py-2">Price</th>
                  <th className="text-right px-4 py-2">Qty</th>
                  <th className="text-right px-4 py-2">Filled</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map((o) => (
                  <tr key={o.id} className="border-b" style={{ borderColor: "#1e2a3a" }}>
                    <td className="px-4 py-3 text-xs text-white">{o.card.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${o.side === "bid" ? "text-up" : "text-down"}`}>
                        {o.side === "bid" ? "BUY" : "SELL"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white text-xs">{formatUSD(o.priceCents)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white text-xs">{o.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted text-xs">{o.filledQuantity}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => cancelOrder(o.id)}
                        disabled={cancelling === o.id}
                        className="text-xs text-down hover:underline"
                      >
                        {cancelling === o.id ? "..." : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
