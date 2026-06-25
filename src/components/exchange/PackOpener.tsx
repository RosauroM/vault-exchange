"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface PullResult {
  index: number;
  won: boolean;
  cardId: string | null;
  sharesAwarded: number;
  evCents: number;
  error?: string;
  card?: { title: string; imageUrl: string | null; grade: number; grader: string; referencePriceCents: number };
}

interface Props {
  packId: string;
  packName: string;
  packType: string;
  priceCents: number;
  claimedToday: boolean;
  onDone: () => void;
}

type Phase = "idle" | "shaking" | "dealing" | "revealing" | "done";

const CARD_COUNT = 10;

export function PackOpener({ packId, packName, packType, priceCents, claimedToday, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<PullResult[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(Array(CARD_COUNT).fill(false));
  const [currentReveal, setCurrentReveal] = useState(-1);
  const [showAll, setShowAll] = useState(false);
  const [nearMissIdx, setNearMissIdx] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFree = packType === "free_daily";
  const disabled = isFree && claimedToday;

  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
  };

  const openPack = async () => {
    if (phase !== "idle") return;
    setError(null);
    setPhase("shaking");
    setResults([]);
    setRevealed(Array(CARD_COUNT).fill(false));
    setCurrentReveal(-1);
    setShowAll(false);
    setNearMissIdx(null);

    // Shake animation then fetch
    await delay(400);

    try {
      const count = isFree ? 1 : CARD_COUNT;
      const res = await fetch(`/api/packs/${packId}/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open pack");

      // Pad to CARD_COUNT with losses
      const raw: PullResult[] = data.results ?? [data];
      const padded: PullResult[] = Array.from({ length: CARD_COUNT }, (_, i) =>
        raw[i] ?? { index: i, won: false, cardId: null, sharesAwarded: 0, evCents: 0 }
      );

      // Shuffle winner to random position (not last — near-miss at second-to-last)
      const winnerIdx = padded.findIndex((r) => r.won);
      if (winnerIdx > -1 && winnerIdx !== CARD_COUNT - 3) {
        const target = Math.floor(Math.random() * (CARD_COUNT - 3)) + 1;
        [padded[winnerIdx], padded[target]] = [padded[target], padded[winnerIdx]];
      }

      setResults(padded);
      setPhase("dealing");
      await delay(600);
      setPhase("revealing");
      startSequentialReveal(padded);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
      setPhase("idle");
    }
  };

  const startSequentialReveal = (padded: PullResult[]) => {
    let idx = 0;
    const revealNext = () => {
      if (idx >= CARD_COUNT) {
        setPhase("done");
        return;
      }
      const isWinner = padded[idx]?.won;
      // Near-miss: glow briefly on non-winner cards near the end
      if (!isWinner && idx >= CARD_COUNT - 3) {
        setNearMissIdx(idx);
        setTimeout(() => setNearMissIdx(null), 400);
      }
      setCurrentReveal(idx);
      setRevealed((prev) => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      if (isWinner) {
        triggerShake();
        idx++;
        revealTimer.current = setTimeout(revealNext, 2000); // linger on winner
      } else {
        idx++;
        revealTimer.current = setTimeout(revealNext, 350);
      }
    };
    revealNext();
  };

  const revealAll = () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setRevealed(Array(CARD_COUNT).fill(true));
    setShowAll(true);
    setPhase("done");
  };

  const hasWinner = results.some((r) => r.won);

  return (
    <div className={`flex flex-col items-center gap-6 ${screenShake ? "animate-shake" : ""}`}>
      {/* Pack card */}
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <div
            className={`pack-card ${phase === "shaking" ? "animate-shake" : ""}`}
            style={{ width: 180, height: 252, cursor: disabled ? "not-allowed" : "pointer" }}
            onClick={!disabled ? openPack : undefined}
          >
            <div className="pack-inner">
              <div className="pack-glow" />
              <div className="pack-content">
                <div style={{ fontSize: 48 }}>📦</div>
                <div className="text-gold font-bold text-sm mt-2">{packName}</div>
                {isFree ? (
                  <div className="text-up text-xs font-bold mt-1">FREE</div>
                ) : (
                  <div className="text-gold text-xs mt-1">${(priceCents / 100).toFixed(2)}</div>
                )}
              </div>
            </div>
          </div>

          <button
            className={`px-8 py-3 rounded-lg font-bold text-sm transition-all ${
              disabled
                ? "opacity-40 cursor-not-allowed bg-gray-800 text-gray-500"
                : isFree
                ? "btn-buy text-base"
                : "btn-primary text-base"
            }`}
            onClick={!disabled ? openPack : undefined}
            disabled={disabled}
          >
            {disabled ? "Come back tomorrow" : isFree ? "⚡ Open Free Pack" : `Open Pack · $${(priceCents / 100).toFixed(2)}`}
          </button>
        </div>
      )}

      {/* Shaking / loading */}
      {phase === "shaking" && (
        <div className="flex flex-col items-center gap-4">
          <div className="pack-card animate-wiggle" style={{ width: 180, height: 252 }}>
            <div className="pack-inner">
              <div className="pack-glow pulse" />
              <div className="pack-content">
                <div style={{ fontSize: 48 }}>📦</div>
                <div className="text-gold font-bold text-sm mt-2 animate-pulse">Opening...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card grid */}
      {(phase === "dealing" || phase === "revealing" || phase === "done") && (
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Cards grid */}
          <div className="grid grid-cols-5 gap-3 w-full max-w-2xl">
            {Array.from({ length: CARD_COUNT }, (_, i) => {
              const result = results[i];
              const isRevealed = revealed[i];
              const isWinner = result?.won;
              const isNearMiss = nearMissIdx === i;
              const isCurrent = currentReveal === i && phase === "revealing";

              return (
                <div
                  key={i}
                  className={`card-slot ${isCurrent ? "scale-110" : ""} transition-transform duration-200`}
                  style={{ cursor: phase !== "done" ? "default" : "pointer" }}
                  onClick={() => {
                    if (phase === "done" && !isRevealed) {
                      setRevealed((prev) => { const n = [...prev]; n[i] = true; return n; });
                    }
                  }}
                >
                  <div className={`card-flip-container ${isRevealed ? "flipped" : ""} ${isNearMiss && !isRevealed ? "near-miss-glow" : ""}`}>
                    {/* Card back */}
                    <div className="card-face card-back-face">
                      <div className="card-back-design">
                        <div style={{ fontSize: 24 }}>🃏</div>
                      </div>
                    </div>
                    {/* Card front */}
                    <div className={`card-face card-front-face ${isWinner ? "winner-card" : "loss-card"}`}>
                      {isWinner && result?.card ? (
                        <div className="winner-content">
                          <div className="holo-effect" />
                          {result.card.imageUrl ? (
                            <Image src={result.card.imageUrl} alt={result.card.title} fill style={{ objectFit: "contain", borderRadius: 6 }} unoptimized />
                          ) : (
                            <div className="text-center p-2">
                              <div style={{ fontSize: 20 }}>⭐</div>
                              <div className="text-xs text-gold font-bold mt-1" style={{ fontSize: 9, lineHeight: 1.2 }}>
                                {result.card.title?.slice(0, 30)}
                              </div>
                            </div>
                          )}
                          <div className="winner-badge">WIN</div>
                        </div>
                      ) : (
                        <div className="loss-content">
                          <div style={{ fontSize: 16, opacity: 0.3 }}>✕</div>
                          <div className="text-muted" style={{ fontSize: 8 }}>No win</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          {phase === "revealing" && (
            <button onClick={revealAll} className="text-muted text-xs hover:text-white underline transition-colors">
              Reveal all at once
            </button>
          )}

          {/* Result summary */}
          {phase === "done" && (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              {hasWinner ? (
                <div className="winner-banner">
                  <div style={{ fontSize: 32 }}>🎉</div>
                  <div>
                    <div className="text-up font-bold text-lg">You Won!</div>
                    {results.filter(r => r.won).map((r, i) => (
                      <div key={i} className="text-white text-sm">
                        {r.sharesAwarded} share{r.sharesAwarded !== 1 ? "s" : ""} · est. ${(r.evCents / 100).toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-muted text-sm text-center">
                  No win this time — the next pull could be it.
                </div>
              )}

              <button
                className="btn-primary px-8 py-3 text-sm font-bold"
                onClick={() => { setPhase("idle"); onDone(); }}
              >
                {isFree ? "Done" : "Open Another"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-down text-sm text-center">{error}</div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
