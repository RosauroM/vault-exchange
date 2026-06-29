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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: hasWinner ? 640 : 500, marginTop: 12 }}>

              {hasWinner ? (
                /* ── WIN ── */
                <div style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", background: "linear-gradient(145deg, #1a1005, #0d0a02)", border: "1px solid rgba(201,168,76,0.4)", boxShadow: "0 0 60px rgba(201,168,76,0.18), 0 0 120px rgba(201,168,76,0.06)", padding: "32px 28px 28px", animation: "winBurst 0.55s cubic-bezier(0.22,1,0.36,1)" }}>

                  {/* Confetti rain */}
                  {[...Array(18)].map((_, i) => {
                    const left = (i * 41 + 7) % 97;
                    const dur  = 1.4 + (i * 0.11) % 1.0;
                    const del  = (i * 0.13) % 1.2;
                    const sz   = 4 + (i % 3) * 2;
                    const col  = i % 4 === 0 ? "#c9a84c" : i % 4 === 1 ? "#ffe082" : i % 4 === 2 ? "#ffffff" : "#00d4a0";
                    return (
                      <div key={i} style={{ position: "absolute", top: -sz, left: `${left}%`, width: sz, height: sz, borderRadius: i % 2 === 0 ? "50%" : "2px", background: col, animation: `confettiFall ${dur}s ease-in ${del}s infinite`, zIndex: 0, pointerEvents: "none" }} />
                    );
                  })}

                  {/* Win header */}
                  <div style={{ textAlign: "center", marginBottom: 22, position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.28em", color: "#c9a84c", marginBottom: 10, animation: "pulseDot 1s ease-in-out infinite" }}>
                      ✦ &nbsp; L E G E N D A R Y &nbsp; P U L L &nbsp; ✦
                    </div>
                    <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em", animation: "goldPulse 1.6s ease-in-out infinite" }}>
                      YOU WON!
                    </div>
                    <div style={{ fontSize: 32, marginTop: 2 }}>🏆</div>
                  </div>

                  {/* Won cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 1 }}>
                    {winners.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(201,168,76,0.07)", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(201,168,76,0.2)" }}>
                        {r.card?.imageUrl && (
                          <div style={{ flexShrink: 0, width: 80, height: 112, borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,0.7), 0 0 20px rgba(201,168,76,0.3)", animation: "starSpin 0.6s cubic-bezier(0.22,1,0.36,1)" }}>
                            <img src={r.card.imageUrl} alt={r.card.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: "#e8eaf0", marginBottom: 5, lineHeight: 1.3 }}>{r.card?.title ?? "Card"}</div>
                          {r.card && (
                            <div style={{ fontSize: 12, color: "rgba(150,170,200,0.55)", marginBottom: 8 }}>
                              {r.card.grader} {r.card.grade} &nbsp;·&nbsp; Grade
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#c9a84c", background: "rgba(201,168,76,0.12)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(201,168,76,0.25)" }}>
                              {r.sharesAwarded} share{r.sharesAwarded !== 1 ? "s" : ""} earned
                            </span>
                            {r.evCents > 0 && (
                              <span style={{ fontSize: 12, color: "rgba(180,210,160,0.7)" }}>
                                ~${(r.evCents / 100).toFixed(2)} est. value
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── NO WIN ── */
                <div style={{ width: "100%", textAlign: "center", borderRadius: 20, background: "linear-gradient(145deg, #0c1018, #080c14)", border: "1px solid rgba(255,255,255,0.06)", padding: "32px 28px 28px", animation: "openerSlideUp 0.4s ease-out" }}>
                  {/* Pikachu */}
                  <div style={{ position: "relative", display: "inline-block", marginBottom: 18 }}>
                    <img
                      src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
                      alt="Pikachu"
                      style={{ width: 120, height: 120, objectFit: "contain", filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.6)) saturate(0.7)", animation: "tryBounce 2.4s ease-in-out infinite" }}
                    />
                    <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(255,77,106,0.88)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", boxShadow: "0 2px 8px rgba(255,77,106,0.5)" }}>✕</div>
                  </div>

                  <div style={{ fontSize: 30, fontWeight: 900, color: "#e8eaf0", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 10 }}>
                    NOT THIS TIME!
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(160,180,220,0.55)", lineHeight: 1.8, marginBottom: 6 }}>
                    {isFree ? "1 draw" : "10 draws"}, zero wins — the hunt continues.
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(201,168,76,0.65)", fontWeight: 700, letterSpacing: "0.02em" }}>
                    ⚡ Every pack resets the odds. Your pull is coming.
                  </div>
                </div>
              )}

              <button
                onClick={() => { setPhase("idle"); onDone(); }}
                style={{ padding: "14px 48px", borderRadius: 12, fontWeight: 800, fontSize: 15, letterSpacing: "0.04em", border: "none", cursor: "pointer", background: hasWinner ? "linear-gradient(135deg, #c9a84c, #8a6020)" : isFree ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #c9a84c, #8a6020)", color: hasWinner ? "#05080f" : isFree ? "rgba(180,200,230,0.7)" : "#05080f", boxShadow: hasWinner || !isFree ? "0 8px 28px rgba(201,168,76,0.3)" : "none", transition: "all 0.13s" }}
                onMouseEnter={e => { if (hasWinner || !isFree) { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(201,168,76,0.42)"; }}}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = hasWinner || !isFree ? "0 8px 28px rgba(201,168,76,0.3)" : "none"; }}
              >
                {isFree ? "Done" : hasWinner ? "🎉 Open Another Pack!" : "Try Again →"}
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
        @keyframes winBurst {
          0%   { opacity: 0; transform: scale(0.85) translateY(12px); }
          60%  { transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes goldPulse {
          0%,100% { text-shadow: 0 0 24px rgba(201,168,76,0.5); color: #fff; }
          50%     { text-shadow: 0 0 48px rgba(201,168,76,1), 0 0 90px rgba(201,168,76,0.35); color: #ffe082; }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(320px) rotate(540deg); opacity: 0; }
        }
        @keyframes starSpin {
          0%   { transform: rotateY(-90deg) scale(0.6); opacity: 0; }
          60%  { transform: rotateY(10deg)  scale(1.05); }
          100% { transform: rotateY(0deg)   scale(1);   opacity: 1; }
        }
        @keyframes tryBounce {
          0%,100% { transform: translateY(0)   scale(1); }
          35%     { transform: translateY(-14px) scale(1.06); }
          55%     { transform: translateY(-8px)  scale(1.03); }
        }
        .near-miss-glow { box-shadow: 0 0 12px rgba(255,160,60,0.3); }
      `}</style>
    </div>
  );
}
