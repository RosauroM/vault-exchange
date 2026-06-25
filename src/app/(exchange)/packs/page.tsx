"use client";
import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/format";

interface Pack { id: string; name: string; type: string; priceCents: number; isActive: boolean; claimedToday: boolean }
interface PullResult { won: boolean; cardId: string | null; sharesAwarded: number; evCents: number }

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const fetchPacks = () =>
    fetch("/api/packs").then((r) => r.json()).then(setPacks).finally(() => setLoading(false));

  useEffect(() => { fetchPacks(); }, []);

  const openPack = async (packId: string) => {
    setOpening(packId);
    setResult(null);
    setShowReveal(false);
    try {
      const res = await fetch(`/api/packs/${packId}/open`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      // Brief delay for "suspense"
      setTimeout(() => setShowReveal(true), 600);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error opening pack");
    } finally {
      setOpening(null);
      fetchPacks();
    }
  };

  if (loading) return <div className="text-muted text-sm">Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Packs</h1>
        <p className="text-muted text-sm mt-1">Open packs to win fractional shares of vaulted cards</p>
      </div>

      {/* Reveal */}
      {result && (
        <div
          className="exchange-card p-8 text-center"
          style={{ border: `1px solid ${result.won ? "#00d4a0" : "#1e2a3a"}` }}
        >
          {!showReveal ? (
            <div className="text-4xl animate-pulse">⟳</div>
          ) : result.won ? (
            <div>
              <div className="text-5xl mb-3">🎉</div>
              <div className="text-xl font-bold text-up mb-2">You Won!</div>
              <div className="text-white text-lg font-semibold">{result.sharesAwarded} share{result.sharesAwarded !== 1 ? "s" : ""}</div>
              <div className="text-muted text-sm mt-1">Est. value: {formatUSD(result.evCents)}</div>
              <div className="text-muted text-xs mt-3">Shares added to your portfolio</div>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3 opacity-50">📦</div>
              <div className="text-lg font-bold text-muted">No win this time</div>
              <div className="text-muted text-sm mt-1">Try again tomorrow!</div>
            </div>
          )}
        </div>
      )}

      {/* Pack grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack) => {
          const isFree = pack.type === "free_daily";
          const isDisabled = opening === pack.id || (isFree && pack.claimedToday);

          return (
            <div key={pack.id} className="exchange-card p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-white">{pack.name}</div>
                  {isFree ? (
                    <div className="text-xs text-up font-semibold mt-1">FREE — Daily</div>
                  ) : (
                    <div className="text-xs text-gold font-semibold mt-1">{formatUSD(pack.priceCents)}</div>
                  )}
                </div>
                <div className="text-3xl">📦</div>
              </div>

              <p className="text-muted text-xs">
                {isFree
                  ? "One free pack per day. Contains random fractional shares."
                  : "Paid pack with improved odds. Spend cash balance to open."}
              </p>

              {isFree && pack.claimedToday && (
                <div className="text-xs text-muted text-center py-1">Claimed today · comes back at midnight UTC</div>
              )}

              <button
                className={isFree ? "btn-buy" : "btn-primary"}
                onClick={() => openPack(pack.id)}
                disabled={isDisabled}
              >
                {opening === pack.id ? "Opening..." : isFree ? "Open Free Pack" : `Open for ${formatUSD(pack.priceCents)}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
