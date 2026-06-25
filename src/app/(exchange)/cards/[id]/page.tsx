"use client";
import { useEffect, useState, use } from "react";
import Image from "next/image";
import { formatUSD, formatChange } from "@/lib/format";

interface BookLevel { priceCents: number; quantity: number }
interface TradeRow { id: string; priceCents: number; quantity: number; createdAt: string }
interface CardDetail {
  id: string; title: string; setName: string; year: number; grader: string;
  grade: number; imageUrl: string | null; referencePriceCents: number;
  sharesIssued: number; lastPriceCents: number; change24h: number;
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [card, setCard] = useState<CardDetail | null>(null);
  const [bids, setBids] = useState<BookLevel[]>([]);
  const [asks, setAsks] = useState<BookLevel[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);

  // Order panel state
  const [side, setSide] = useState<"bid" | "ask">("bid");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchAll = async () => {
    const [cardRes, bookRes, tradesRes] = await Promise.all([
      fetch(`/api/cards/${id}`).then((r) => r.json()),
      fetch(`/api/cards/${id}/book`).then((r) => r.json()),
      fetch(`/api/cards/${id}/trades`).then((r) => r.json()),
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
      setMsg({ text: `Order placed! Filled: ${data.filled} / ${data.filled + data.remaining}`, ok: true });
      setPrice(""); setQty("");
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setPlacing(false);
    }
  };

  if (!card) return <div className="text-muted text-sm">Loading...</div>;

  const bestBid = bids[0]?.priceCents;
  const bestAsk = asks[0]?.priceCents;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-6 flex-wrap">
        <div
          className="relative rounded overflow-hidden flex-shrink-0"
          style={{ width: 120, height: 168, background: "#0d1321" }}
        >
          {card.imageUrl ? (
            <Image src={card.imageUrl} alt={card.title} fill style={{ objectFit: "contain" }} unoptimized />
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-xs">No image</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: "#1e2a3a", color: "#c9a84c" }}
            >
              {card.grader} {Number(card.grade)}
            </span>
            <span className="text-xs text-muted">{card.year} · {card.setName}</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-3">{card.title}</h1>
          <div className="flex items-end gap-6 flex-wrap">
            <div>
              <div className="text-xs text-muted mb-0.5">Last price / share</div>
              <div className="text-2xl font-bold text-white">{formatUSD(card.lastPriceCents)}</div>
            </div>
            <div className={`text-lg font-semibold ${card.change24h >= 0 ? "text-up" : "text-down"}`}>
              {formatChange(card.change24h)}
            </div>
            <div>
              <div className="text-xs text-muted mb-0.5">Ref price</div>
              <div className="text-sm text-white">{formatUSD(card.referencePriceCents)}</div>
            </div>
            <div>
              <div className="text-xs text-muted mb-0.5">Shares issued</div>
              <div className="text-sm text-white">{card.sharesIssued.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book */}
        <div className="exchange-card p-4 lg:col-span-1">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Order Book</div>
          {spread !== null && (
            <div className="text-xs text-muted mb-2">
              Spread: {formatUSD(spread)} ({((spread / (bestAsk ?? 1)) * 100).toFixed(2)}%)
            </div>
          )}

          {/* Asks (reversed, highest first) */}
          <div className="mb-1">
            {[...asks].reverse().slice(0, 8).map((a) => (
              <div
                key={a.priceCents}
                className="flex justify-between text-xs py-0.5 px-1 rounded"
                style={{ background: "rgba(255,77,106,0.06)" }}
              >
                <span className="text-down font-mono">{formatUSD(a.priceCents)}</span>
                <span className="text-muted">{a.quantity.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Spread line */}
          {bestBid && bestAsk && (
            <div className="text-center text-xs text-muted py-1 font-mono">
              ── {formatUSD(Math.round((bestBid + bestAsk) / 2))} mid ──
            </div>
          )}

          {/* Bids */}
          <div>
            {bids.slice(0, 8).map((b) => (
              <div
                key={b.priceCents}
                className="flex justify-between text-xs py-0.5 px-1 rounded"
                style={{ background: "rgba(0,212,160,0.06)" }}
              >
                <span className="text-up font-mono">{formatUSD(b.priceCents)}</span>
                <span className="text-muted">{b.quantity.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {bids.length === 0 && asks.length === 0 && (
            <div className="text-muted text-xs text-center py-4">No open orders</div>
          )}
        </div>

        {/* Buy / Sell Panel */}
        <div className="exchange-card p-4 lg:col-span-1">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide("bid")}
              className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
                side === "bid" ? "btn-buy" : "text-muted"
              }`}
              style={side !== "bid" ? { background: "#0d1321" } : {}}
            >
              Buy
            </button>
            <button
              onClick={() => setSide("ask")}
              className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
                side === "ask" ? "btn-sell" : "text-muted"
              }`}
              style={side !== "ask" ? { background: "#0d1321" } : {}}
            >
              Sell
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Price per share ($)</label>
              <input
                className="exchange-input font-mono"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={bestAsk ? (bestAsk / 100).toFixed(2) : "0.00"}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Quantity (shares)</label>
              <input
                className="exchange-input font-mono"
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

            {price && qty && (
              <div className="text-xs text-muted">
                Total: <span className="text-white font-semibold">
                  {formatUSD(Math.round(parseFloat(price || "0") * 100 * parseInt(qty || "0")))}
                </span>
              </div>
            )}

            <button
              className={side === "bid" ? "btn-buy" : "btn-sell"}
              onClick={placeOrder}
              disabled={placing || !price || !qty}
            >
              {placing ? "Placing..." : side === "bid" ? "Place Buy Order" : "Place Sell Order"}
            </button>

            {msg && (
              <div
                className="text-xs rounded p-2 text-center"
                style={{ background: msg.ok ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)", color: msg.ok ? "#00d4a0" : "#ff4d6a" }}
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="exchange-card p-4 lg:col-span-1">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Recent Trades</div>
          {trades.length === 0 ? (
            <div className="text-muted text-xs">No trades yet</div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {trades.slice(0, 20).map((t) => (
                <div key={t.id} className="flex justify-between text-xs py-0.5">
                  <span className="font-mono text-white">{formatUSD(t.priceCents)}</span>
                  <span className="text-muted">{t.quantity.toLocaleString()}</span>
                  <span className="text-muted">{new Date(t.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
