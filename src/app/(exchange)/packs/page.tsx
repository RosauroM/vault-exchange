"use client";
import { useEffect, useState } from "react";
import { PackOpener } from "@/components/exchange/PackOpener";

interface Pack {
  id: string;
  name: string;
  type: string;
  priceCents: number;
  isActive: boolean;
  claimedToday: boolean;
}

interface RecentWin {
  user: string;
  card: string;
  shares: number;
  ago: string;
}

const FAKE_RECENT_WINS: RecentWin[] = [
  { user: "collector_k***", card: "Charizard PSA 10", shares: 5, ago: "2m ago" },
  { user: "vault_r***", card: "Skyridge Crystal", shares: 1, ago: "7m ago" },
  { user: "trade_m***", card: "Charizard PSA 10", shares: 5, ago: "12m ago" },
  { user: "pack_j***", card: "Arceus LX", shares: 2, ago: "18m ago" },
  { user: "flip_s***", card: "Charizard PSA 10", shares: 5, ago: "24m ago" },
];

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [selected, setSelected] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickerIdx, setTickerIdx] = useState(0);

  const fetchPacks = () =>
    fetch("/api/packs").then((r) => r.json()).then(setPacks).finally(() => setLoading(false));

  useEffect(() => { fetchPacks(); }, []);

  // Rotate ticker
  useEffect(() => {
    const t = setInterval(() => setTickerIdx((i) => (i + 1) % FAKE_RECENT_WINS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const freePack = packs.find((p) => p.type === "free_daily");
  const paidPacks = packs.filter((p) => p.type !== "free_daily");
  const ticker = FAKE_RECENT_WINS[tickerIdx];

  if (loading) return <div className="text-muted text-sm text-center py-20">Loading...</div>;

  return (
    <div className="flex flex-col items-center gap-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Pack Opening</h1>
        <p className="text-muted text-sm">Win fractional shares of vaulted PSA-graded cards</p>
      </div>

      {/* Recent wins ticker */}
      <div
        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm overflow-hidden"
        style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}
      >
        <span className="text-gold font-bold text-xs whitespace-nowrap animate-pulse">🔴 LIVE</span>
        <span className="text-muted text-xs transition-all">
          <span className="text-white font-semibold">{ticker.user}</span> just won{" "}
          <span className="text-gold font-semibold">{ticker.shares} shares</span> of{" "}
          <span className="text-white">{ticker.card}</span>{" "}
          <span className="text-muted">· {ticker.ago}</span>
        </span>
      </div>

      {/* Active opener */}
      {selected ? (
        <div className="w-full">
          <button
            className="text-muted text-xs hover:text-white mb-6 flex items-center gap-1"
            onClick={() => setSelected(null)}
          >
            ← Back to packs
          </button>
          <PackOpener
            packId={selected.id}
            packName={selected.name}
            packType={selected.type}
            priceCents={selected.priceCents}
            claimedToday={selected.claimedToday}
            onDone={fetchPacks}
          />
        </div>
      ) : (
        <>
          {/* Free pack */}
          {freePack && (
            <div
              className="w-full pack-select-card free-pack cursor-pointer"
              onClick={() => setSelected(freePack)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(0,212,160,0.15)", color: "#00d4a0" }}>
                      FREE DAILY
                    </span>
                    {freePack.claimedToday && (
                      <span className="text-xs text-muted">· claimed today</span>
                    )}
                  </div>
                  <div className="text-white font-bold text-lg">{freePack.name}</div>
                  <div className="text-muted text-sm mt-1">1 random share · resets at midnight UTC</div>
                </div>
                <div style={{ fontSize: 48 }}>📦</div>
              </div>
              {!freePack.claimedToday && (
                <div className="mt-4">
                  <div className="btn-buy text-center text-sm font-bold py-3 rounded-lg">
                    ⚡ Open Free Pack
                  </div>
                </div>
              )}
              {freePack.claimedToday && (
                <div className="mt-3 text-xs text-muted text-center py-2 rounded-lg" style={{ background: "#0d1321" }}>
                  Come back tomorrow for your next free pack
                </div>
              )}
            </div>
          )}

          {/* Paid packs */}
          {paidPacks.length > 0 && (
            <div className="w-full flex flex-col gap-3">
              <div className="text-xs font-semibold text-muted uppercase tracking-widest">Premium Packs</div>
              {paidPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="pack-select-card paid-pack cursor-pointer"
                  onClick={() => setSelected(pack)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gold font-bold text-lg">{pack.name}</div>
                      <div className="text-muted text-sm mt-1">10 cards · improved odds · instant reveal</div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontSize: 36 }}>✨</div>
                      <div className="text-gold font-bold">${(pack.priceCents / 100).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="mt-4 btn-primary text-center text-sm font-bold py-3 rounded-lg">
                    Open Premium Pack · ${(pack.priceCents / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Odds table */}
          <div className="w-full exchange-card p-4">
            <div className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Prize Pool</div>
            <div className="flex flex-col gap-2">
              <OddsRow label="1999 Charizard PSA 10" rarity="ultra" shares="5 shares/win" />
              <OddsRow label="Skyridge Crystal Charizard" rarity="rare" shares="1 share/win" />
              <OddsRow label="Arceus Level X BGS 9.5" rarity="uncommon" shares="2 shares/win" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OddsRow({ label, rarity, shares }: { label: string; rarity: string; shares: string }) {
  const colors: Record<string, string> = {
    ultra: "#c9a84c",
    rare: "#00d4a0",
    uncommon: "#a78bfa",
  };
  const labels: Record<string, string> = {
    ultra: "ULTRA RARE",
    rare: "RARE",
    uncommon: "UNCOMMON",
  };
  return (
    <div className="flex items-center justify-between text-sm py-1" style={{ borderBottom: "1px solid #1e2a3a" }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${colors[rarity]}22`, color: colors[rarity], fontSize: 9 }}>
          {labels[rarity]}
        </span>
        <span className="text-white text-xs">{label}</span>
      </div>
      <span className="text-muted text-xs">{shares}</span>
    </div>
  );
}
