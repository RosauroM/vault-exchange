"use client";
import { useState, useRef } from "react";

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

type Phase = "idle" | "shaking" | "revealing" | "done";

const CARD_COUNT = 10;

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function PackVisual({ isFree, shaking, large }: { isFree: boolean; shaking?: boolean; large?: boolean }) {
  const w = large ? 180 : 130;
  const h = large ? 252 : 182;
  const accent = isFree ? "#00d4a0" : "#c9a84c";
  const bg = isFree
    ? "linear-gradient(155deg, #091c14 0%, #05100a 100%)"
    : "linear-gradient(155deg, #1a1208 0%, #100d03 100%)";
  return (
    <div style={{ width: w, height: h, borderRadius: 12, position: "relative", overflow: "hidden", background: bg, border: `1px solid ${isFree ? "rgba(0,212,160,0.38)" : "rgba(201,168,76,0.38)"}`, boxShadow: `0 20px 60px rgba(0,0,0,0.85), 0 0 32px ${isFree ? "rgba(0,212,160,0.1)" : "rgba(201,168,76,0.12)"}`, animation: shaking ? "packWiggle 0.38s ease-in-out infinite" : "none" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(130deg, transparent 28%, rgba(255,255,255,0.055) 48%, transparent 68%)", animation: "holoShift 3s linear infinite", backgroundSize: "200% 200%" }} />
      <div style={{ height: large ? 32 : 24, background: isFree ? "linear-gradient(90deg, #005c3d, #00d4a0, #005c3d)" : "linear-gradient(90deg, #6a4e10, #c9a84c, #6a4e10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: large ? 9 : 7, fontWeight: 900, letterSpacing: "0.22em", color: "#03080c" }}>✦ VAULT ✦</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: h - (large ? 32 : 24) - (large ? 34 : 26), gap: 6 }}>
        <div style={{ fontSize: large ? 38 : 28, filter: `drop-shadow(0 0 10px ${isFree ? "rgba(0,212,160,0.5)" : "rgba(201,168,76,0.5)"})` }}>
          {isFree ? "🌟" : "✨"}
        </div>
        <div style={{ fontSize: large ? 8 : 6.5, color: `${accent}99`, letterSpacing: "0.14em", fontWeight: 700 }}>
          {isFree ? "1 DRAW" : "10 DRAWS"}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: large ? 34 : 26, left: 0, right: 0, borderTop: "1px dashed rgba(255,255,255,0.07)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: large ? 34 : 26, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: large ? 7 : 5.5, letterSpacing: "0.15em", color: `${accent}50`, fontWeight: 700 }}>
          {isFree ? "DAILY FREE" : "STANDARD PACK"}
        </span>
      </div>
    </div>
  );
}

export function PackOpener({ packId, packName, packType, priceCents, claimedToday, onDone }: Props) {
  const [phase, setPhase]               = useState<Phase>("idle");
  const [results, setResults]           = useState<PullResult[]>([]);
  const [revealed, setRevealed]         = useState<boolean[]>(Array(CARD_COUNT).fill(false));
  const [currentReveal, setCurrentReveal] = useState(-1);
  const [screenFlash, setScreenFlash]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const revealTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpeningRef = useRef(false);

  const isFree   = packType === "free_daily";
  const disabled = isFree && claimedToday;
  const accent   = isFree ? "#00d4a0" : "#c9a84c";

  const triggerFlash = () => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 320);
  };

  const openPack = async () => {
    if (phase !== "idle" || isOpeningRef.current) return;
    isOpeningRef.current = true;
    setError(null);
    setPhase("shaking");
    setResults([]);
    setRevealed(Array(CARD_COUNT).fill(false));
    setCurrentReveal(-1);

    // Shorter shake — just enough to feel like something is happening
    await delay(320);

    try {
      const count = isFree ? 1 : CARD_COUNT;
      const res   = await fetch(`/api/packs/${packId}/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open pack");

      const raw: PullResult[] = data.results ?? [data];
      const padded: PullResult[] = Array.from({ length: CARD_COUNT }, (_, i) =>
        raw[i] ?? { index: i, won: false, cardId: null, sharesAwarded: 0, evCents: 0 }
      );

      const winnerIdx = padded.findIndex(r => r.won);
      if (winnerIdx > -1) {
        const target = Math.floor(Math.random() * (CARD_COUNT - 3)) + 1;
        [padded[winnerIdx], padded[target]] = [padded[target], padded[winnerIdx]];
      }

      setResults(padded);
      // Minimal transition before reveals start
      await delay(80);
      setPhase("revealing");
      startReveal(padded);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
      setPhase("idle");
    } finally {
      isOpeningRef.current = false;
    }
  };

  const startReveal = (padded: PullResult[]) => {
    let idx = 0;
    const next = () => {
      if (idx >= CARD_COUNT) { setRevealed(Array(CARD_COUNT).fill(true)); setPhase("done"); return; }
      const isWinner = padded[idx]?.won;
      setCurrentReveal(idx);
      setRevealed(prev => { const n = [...prev]; n[idx] = true; return n; });
      if (isWinner) {
        triggerFlash();
        idx++;
        // Winner: short dramatic pause, then continue
        revealTimer.current = setTimeout(next, 820);
      } else {
        idx++;
        // Non-winners: fast
        revealTimer.current = setTimeout(next, 150);
      }
    };
    next();
  };

  const revealAll = () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setRevealed(Array(CARD_COUNT).fill(true));
    setPhase("done");
  };

  const hasWinner = results.some(r => r.won);
  const winners   = results.filter(r => r.won);
  const revealedCount = revealed.filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative", width: "100%" }}>

      {/* Screen flash on win */}
      {screenFlash && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(201,168,76,0.2) 0%, rgba(255,255,255,0.06) 50%, transparent 100%)", animation: "openerFadeIn 0.08s ease-out forwards" }} />
      )}

      {/* ── IDLE ── */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%", maxWidth: 500 }}>
          {/* Pack display area */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 40 }}>
            {/* Ambient glow */}
            <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 260, height: 200, borderRadius: "50%", background: `radial-gradient(ellipse, ${isFree ? "rgba(0,212,160,0.1)" : "rgba(201,168,76,0.08)"} 0%, transparent 70%)`, pointerEvents: "none", animation: "glowPulse 2.4s ease-in-out infinite" }} />
            <div
              onClick={!disabled ? openPack : undefined}
              style={{ position: "relative", zIndex: 1, cursor: disabled ? "not-allowed" : "pointer", transition: "transform 0.18s ease", opacity: disabled ? 0.45 : 1 }}
              onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = "scale(1.05) translateY(-6px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <PackVisual isFree={isFree} large />
            </div>
          </div>

          {/* Pack info */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e8eaf0", letterSpacing: "-0.02em", marginBottom: 6 }}>{packName}</div>
            <div style={{ fontSize: 13, color: "rgba(150,170,200,0.4)", lineHeight: 1.5 }}>
              {isFree ? "1 server-authoritative draw" : "10 server-authoritative draws"} · result sealed before reveal
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={!disabled ? openPack : undefined}
            disabled={disabled}
            style={{ padding: "15px 48px", borderRadius: 13, fontWeight: 800, fontSize: 15, letterSpacing: "0.04em", border: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, background: disabled ? "#1a2535" : isFree ? "linear-gradient(135deg, #00c897, #009e78)" : "linear-gradient(135deg, #c9a84c, #8a6020)", color: disabled ? "#5a6a88" : "#05080f", boxShadow: disabled ? "none" : isFree ? "0 8px 32px rgba(0,200,151,0.28)" : "0 8px 32px rgba(201,168,76,0.28)", transition: "all 0.13s" }}
            onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = isFree ? "0 12px 40px rgba(0,200,151,0.38)" : "0 12px 40px rgba(201,168,76,0.38)"; }}}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = isFree ? "0 8px 32px rgba(0,200,151,0.28)" : "0 8px 32px rgba(201,168,76,0.28)"; }}
          >
            {disabled ? "Come back tomorrow" : isFree ? "⚡ Open Free Pack" : `Open Pack · $${(priceCents / 100).toFixed(2)}`}
          </button>

          {/* Price breakdown for premium */}
          {!disabled && !isFree && (
            <div style={{ marginTop: 12, fontSize: 12, color: "rgba(120,140,170,0.38)" }}>
              ${(priceCents / 100 / 10).toFixed(2)} per draw · deducted from wallet balance
            </div>
          )}
        </div>
      )}

      {/* ── SHAKING ── */}
      {phase === "shaking" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 220, height: 160, borderRadius: "50%", background: `radial-gradient(ellipse, ${isFree ? "rgba(0,212,160,0.14)" : "rgba(201,168,76,0.12)"} 0%, transparent 70%)`, animation: "glowPulse 0.5s ease-in-out infinite" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <PackVisual isFree={isFree} large shaking />
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, letterSpacing: "0.1em", animation: "pulseDot 0.6s ease-in-out infinite" }}>
            OPENING…
          </div>
        </div>
      )}

      {/* ── REVEALING / DONE ── */}
      {(phase === "revealing" || phase === "done") && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%" }}>

          {/* Progress header */}
          {phase === "revealing" && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(120,140,170,0.4)", letterSpacing: "0.08em" }}>
                REVEALING {revealedCount}/{isFree ? 1 : CARD_COUNT}
              </span>
              <div style={{ width: 120, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(revealedCount / (isFree ? 1 : CARD_COUNT)) * 100}%`, background: accent, borderRadius: 2, transition: "width 0.12s ease" }} />
              </div>
              <button onClick={revealAll} style={{ fontSize: 11, color: "rgba(150,170,200,0.35)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}>
                Skip
              </button>
            </div>
          )}

          {/* Card grid */}
          <div style={{ display: "grid", gridTemplateColumns: isFree ? "1fr" : "repeat(5, 1fr)", gap: 10, width: "100%", maxWidth: isFree ? 240 : 700 }}>
            {Array.from({ length: isFree ? 1 : CARD_COUNT }, (_, i) => {
              const result     = results[i];
              const isRevealed = revealed[i];
              const isWinner   = result?.won;
              const isCurrent  = currentReveal === i && phase === "revealing";

              const scaleStr = isCurrent ? "scale(1.1)" : (isWinner && isRevealed) ? "scale(1.04)" : "scale(1)";
              const flipStr  = isRevealed ? "rotateY(180deg)" : "rotateY(0deg)";

              return (
                <div key={i}
                  style={{
                    position: "relative", width: "100%", aspectRatio: "5/7", borderRadius: 8,
                    transformStyle: "preserve-3d",
                    transform: `${scaleStr} ${flipStr}`,
                    transition: "transform 0.28s ease",
                    zIndex: isCurrent ? 10 : isWinner && isRevealed ? 5 : 1,
                    cursor: phase === "done" && !isRevealed ? "pointer" : "default",
                  }}
                  onClick={() => { if (phase === "done" && !isRevealed) setRevealed(prev => { const n = [...prev]; n[i] = true; return n; }); }}
                >
                  {/* Back face — Pokémon card back */}
                  <div style={{ position: "absolute", inset: 0, borderRadius: 8, backfaceVisibility: "hidden", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <img
                      src="https://images.pokemontcg.io/back.png"
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>

                  {/* Front face — pre-rotated 180deg so it's hidden by default, visible when container flips */}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 8, backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: isWinner ? "linear-gradient(145deg, #1a1208, #120e05)" : "linear-gradient(145deg, #090d16, #060910)",
                    border: isWinner ? "1px solid rgba(201,168,76,0.5)" : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: isWinner ? "0 0 18px rgba(201,168,76,0.2), inset 0 0 18px rgba(201,168,76,0.06)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    {isWinner && result?.card ? (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(135deg, transparent 30%, rgba(201,168,76,0.08) 50%, transparent 70%)", animation: "holoShift 2s linear infinite", backgroundSize: "200% 200%" }} />
                        {result.card.imageUrl ? (
                          <img src={result.card.imageUrl} alt={result.card.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 6, boxSizing: "border-box", zIndex: 0 }} />
                        ) : (
                          <div style={{ textAlign: "center", padding: 8, zIndex: 2 }}>
                            <div style={{ fontSize: 20 }}>⭐</div>
                            <div style={{ fontSize: 8, color: "#c9a84c", fontWeight: 700, marginTop: 4 }}>{result.card.title?.slice(0, 22)}</div>
                          </div>
                        )}
                        <div style={{ position: "absolute", top: 5, right: 5, zIndex: 10, background: "linear-gradient(135deg, #c9a84c, #8a6020)", color: "#03080c", fontSize: 7, fontWeight: 900, letterSpacing: "0.12em", padding: "2px 6px", borderRadius: 4 }}>WIN</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontSize: 13, opacity: 0.15, color: "#e8eaf0" }}>✕</div>
                        <div style={{ fontSize: 7, color: "rgba(90,106,136,0.6)", marginTop: 3 }}>No win</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Result summary */}
          {phase === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 500, marginTop: 8 }}>
              {hasWinner ? (
                <div style={{ width: "100%", padding: "22px 28px", borderRadius: 16, background: "linear-gradient(135deg, rgba(201,168,76,0.07), rgba(201,168,76,0.03))", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", gap: 18, animation: "openerSlideUp 0.3s ease-out" }}>
                  <div style={{ fontSize: 36, flexShrink: 0 }}>🏆</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: "#c9a84c", marginBottom: 6 }}>You Won!</div>
                    {winners.map((r, i) => (
                      <div key={i} style={{ fontSize: 13, color: "rgba(220,235,210,0.8)", lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 700, color: "#e8eaf0" }}>{r.sharesAwarded} share{r.sharesAwarded !== 1 ? "s" : ""}</span>
                        {r.card && <span style={{ color: "rgba(150,170,200,0.55)" }}> · {r.card.title}</span>}
                        {r.evCents > 0 && <span style={{ color: "#c9a84c", marginLeft: 6, fontSize: 12 }}>~${(r.evCents / 100).toFixed(2)} est.</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "18px 24px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", animation: "openerSlideUp 0.3s ease-out" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>🎴</div>
                  <div style={{ color: "rgba(180,200,230,0.65)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No win this time</div>
                  <div style={{ color: "rgba(120,140,170,0.45)", fontSize: 12 }}>Every draw is independent — odds reset completely.</div>
                </div>
              )}

              <button
                onClick={() => { setPhase("idle"); onDone(); }}
                style={{ padding: "13px 40px", borderRadius: 11, fontWeight: 800, fontSize: 14, letterSpacing: "0.04em", border: "none", cursor: "pointer", background: isFree ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #c9a84c, #8a6020)", color: isFree ? "rgba(180,200,230,0.7)" : "#05080f", boxShadow: isFree ? "none" : "0 6px 20px rgba(201,168,76,0.22)", transition: "all 0.13s" }}
                onMouseEnter={e => { if (!isFree) { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 26px rgba(201,168,76,0.32)"; }}}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = isFree ? "none" : "0 6px 20px rgba(201,168,76,0.22)"; }}
              >
                {isFree ? "Done" : "Open Another Pack"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 18px", borderRadius: 10, fontSize: 13, background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.2)", color: "#ff4d6a", marginTop: 16 }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes packWiggle {
          0%,100% { transform: translateX(0) rotate(-2deg); }
          25%      { transform: translateX(-7px) rotate(2.5deg); }
          75%      { transform: translateX(7px) rotate(-2.5deg); }
        }
        @keyframes holoShift {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
          50%      { opacity: 1;   transform: translateX(-50%) scale(1.08); }
        }
        @keyframes pulseDot {
          0%,100% { opacity: 0.45; }
          50%      { opacity: 1; }
        }
        @keyframes openerFadeIn {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes openerSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .near-miss-glow { box-shadow: 0 0 12px rgba(255,160,60,0.3); }
      `}</style>
    </div>
  );
}
