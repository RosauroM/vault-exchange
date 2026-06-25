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

type Phase = "idle" | "shaking" | "dealing" | "revealing" | "done";

const CARD_COUNT = 10;

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/* ── CSS-drawn pack visual ── */
function PackVisual({ name, isFree, shaking }: { name: string; isFree: boolean; shaking?: boolean }) {
  return (
    <div
      style={{
        width: 160, height: 224,
        borderRadius: 12,
        position: "relative",
        overflow: "hidden",
        background: isFree
          ? "linear-gradient(160deg, #0b1e14 0%, #0a1f1a 100%)"
          : "linear-gradient(160deg, #18120a 0%, #1a1408 100%)",
        border: `1px solid ${isFree ? "rgba(0,212,160,0.35)" : "rgba(201,168,76,0.35)"}`,
        boxShadow: isFree
          ? "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,212,160,0.1)"
          : "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(201,168,76,0.12)",
        animation: shaking ? "wiggle 0.5s ease-in-out" : "none",
        cursor: "pointer",
      }}
    >
      {/* Foil shimmer */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)",
        animation: "holoShift 3s linear infinite",
        backgroundSize: "200% 200%",
      }} />

      {/* Top gold band */}
      <div style={{
        height: 32,
        background: isFree
          ? "linear-gradient(90deg, #006644, #00d4a0, #006644)"
          : "linear-gradient(90deg, #7a5a10, #c9a84c, #7a5a10)",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottom: `1px solid ${isFree ? "rgba(0,212,160,0.3)" : "rgba(201,168,76,0.3)"}`,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 900, letterSpacing: "0.2em",
          color: "#05080f",
        }}>
          ✦ VAULT ✦
        </span>
      </div>

      {/* Center art area */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: 130, gap: 6,
        padding: "0 12px",
      }}>
        <div style={{ fontSize: 40, filter: "drop-shadow(0 0 12px rgba(201,168,76,0.4))" }}>
          {isFree ? "🌟" : "✨"}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
          color: isFree ? "rgba(0,212,160,0.8)" : "rgba(201,168,76,0.8)",
          textAlign: "center",
          textTransform: "uppercase" as const,
        }}>
          {name}
        </div>
        <div style={{
          fontSize: 9, color: "rgba(180,200,230,0.35)",
          letterSpacing: "0.1em",
        }}>
          {isFree ? "1 DRAW" : "10 DRAWS"}
        </div>
      </div>

      {/* Tear line */}
      <div style={{
        position: "absolute", bottom: 36, left: 0, right: 0,
        borderTop: "1px dashed rgba(255,255,255,0.08)",
      }} />

      {/* Bottom label */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 36,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.14em",
          color: isFree ? "rgba(0,212,160,0.4)" : "rgba(201,168,76,0.4)",
        }}>
          {isFree ? "DAILY FREE PACK" : "STANDARD PACK"}
        </span>
      </div>
    </div>
  );
}

export function PackOpener({ packId, packName, packType, priceCents, claimedToday, onDone }: Props) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [results, setResults]   = useState<PullResult[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(Array(CARD_COUNT).fill(false));
  const [currentReveal, setCurrentReveal] = useState(-1);
  const [nearMissIdx, setNearMissIdx] = useState<number | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFree   = packType === "free_daily";
  const disabled = isFree && claimedToday;

  const triggerFlash = () => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 600);
  };

  const openPack = async () => {
    if (phase !== "idle") return;
    setError(null);
    setPhase("shaking");
    setResults([]);
    setRevealed(Array(CARD_COUNT).fill(false));
    setCurrentReveal(-1);
    setNearMissIdx(null);

    await delay(600);

    try {
      const count = isFree ? 1 : CARD_COUNT;
      const res = await fetch(`/api/packs/${packId}/pull`, {
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

      // Place winner at a random position, keep last 2 as losses (near-miss territory)
      const winnerIdx = padded.findIndex(r => r.won);
      if (winnerIdx > -1) {
        const target = Math.floor(Math.random() * (CARD_COUNT - 3)) + 1;
        [padded[winnerIdx], padded[target]] = [padded[target], padded[winnerIdx]];
      }

      setResults(padded);
      setPhase("dealing");
      await delay(500);
      setPhase("revealing");
      startReveal(padded);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
      setPhase("idle");
    }
  };

  const startReveal = (padded: PullResult[]) => {
    let idx = 0;
    const next = () => {
      if (idx >= CARD_COUNT) { setPhase("done"); return; }
      const isWinner = padded[idx]?.won;
      if (!isWinner && idx >= CARD_COUNT - 3) {
        setNearMissIdx(idx);
        setTimeout(() => setNearMissIdx(null), 420);
      }
      setCurrentReveal(idx);
      setRevealed(prev => { const n = [...prev]; n[idx] = true; return n; });
      if (isWinner) {
        triggerFlash();
        idx++;
        revealTimer.current = setTimeout(next, 2200);
      } else {
        idx++;
        revealTimer.current = setTimeout(next, 340);
      }
    };
    next();
  };

  const revealAll = () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setRevealed(Array(CARD_COUNT).fill(true));
    setPhase("done");
  };

  const hasWinner  = results.some(r => r.won);
  const winners    = results.filter(r => r.won);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, position: "relative" }}>

      {/* Screen flash on win */}
      {screenFlash && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999, pointerEvents: "none",
          background: "radial-gradient(ellipse at center, rgba(201,168,76,0.25) 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
          animation: "fadeIn 0.1s ease-out forwards",
        }} />
      )}

      {/* ── IDLE: show pack ── */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div
            onClick={!disabled ? openPack : undefined}
            style={{
              transform: "scale(1)",
              transition: "transform 0.2s",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = "scale(1.04) translateY(-4px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            <PackVisual name={packName} isFree={isFree} />
          </div>

          <button
            onClick={!disabled ? openPack : undefined}
            disabled={disabled}
            style={{
              padding: "14px 40px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.04em",
              border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.4 : 1,
              transition: "all 0.2s",
              background: disabled
                ? "#1a2535"
                : isFree
                ? "linear-gradient(135deg, #00c897, #009e78)"
                : "linear-gradient(135deg, #c9a84c, #8a6020)",
              color: disabled ? "#5a6a88" : isFree ? "#05080f" : "#05080f",
              boxShadow: disabled ? "none" : isFree
                ? "0 8px 28px rgba(0,200,151,0.3)"
                : "0 8px 28px rgba(201,168,76,0.3)",
            }}
          >
            {disabled
              ? "Come back tomorrow"
              : isFree
              ? "⚡ Open Free Pack"
              : `Open Pack · $${(priceCents / 100).toFixed(2)}`}
          </button>

          {!disabled && (
            <div style={{ fontSize: 12, color: "rgba(150,170,200,0.35)", textAlign: "center" }}>
              {isFree ? "1 server-authoritative draw · result is sealed before reveal" : "10 draws · result sealed server-side"}
            </div>
          )}
        </div>
      )}

      {/* ── SHAKING: opening animation ── */}
      {phase === "shaking" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ animation: "wiggle 0.5s ease-in-out infinite" }}>
            <PackVisual name={packName} isFree={isFree} shaking />
          </div>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: isFree ? "#00d4a0" : "#c9a84c",
            letterSpacing: "0.08em",
            animation: "pulseDot 0.8s ease-in-out infinite",
          }}>
            Opening…
          </div>
        </div>
      )}

      {/* ── DEALING / REVEALING / DONE: card grid ── */}
      {(phase === "dealing" || phase === "revealing" || phase === "done") && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}>

          {/* Card grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            width: "100%",
            maxWidth: 680,
          }}>
            {Array.from({ length: CARD_COUNT }, (_, i) => {
              const result    = results[i];
              const isRevealed = revealed[i];
              const isWinner   = result?.won;
              const isNearMiss = nearMissIdx === i;
              const isCurrent  = currentReveal === i && phase === "revealing";

              return (
                <div
                  key={i}
                  className="card-slot"
                  style={{
                    transform: isCurrent ? "scale(1.12)" : "scale(1)",
                    transition: "transform 0.2s ease",
                    zIndex: isCurrent ? 10 : 1,
                    cursor: phase === "done" && !isRevealed ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (phase === "done" && !isRevealed) {
                      setRevealed(prev => { const n = [...prev]; n[i] = true; return n; });
                    }
                  }}
                >
                  <div className={`card-flip-container${isRevealed ? " flipped" : ""}${isNearMiss && !isRevealed ? " near-miss-glow" : ""}`}>
                    {/* Back face */}
                    <div className="card-face card-back-face">
                      <div style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        gap: 4, opacity: 0.4,
                      }}>
                        <div style={{ fontSize: 20 }}>✦</div>
                        <div style={{ fontSize: 8, letterSpacing: "0.12em", color: "#c9a84c" }}>VAULT</div>
                      </div>
                    </div>

                    {/* Front face */}
                    <div className={`card-face card-front-face${isWinner ? " winner-card" : " loss-card"}`}>
                      {isWinner && result?.card ? (
                        <div className="winner-content">
                          <div className="holo-effect" />
                          {result.card.imageUrl ? (
                            /* Use <img> not <Image fill> — transform-style:preserve-3d on the
                               flip container breaks Next.js Image fill absolute positioning */
                            <img
                              src={result.card.imageUrl}
                              alt={result.card.title}
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                padding: 6,
                                boxSizing: "border-box",
                                zIndex: 0,
                              }}
                            />
                          ) : (
                            <div style={{ textAlign: "center", padding: 8, zIndex: 2 }}>
                              <div style={{ fontSize: 18 }}>⭐</div>
                              <div style={{ fontSize: 8, color: "#c9a84c", fontWeight: 700, marginTop: 4 }}>
                                {result.card.title?.slice(0, 24)}
                              </div>
                            </div>
                          )}
                          <div className="winner-badge">WIN</div>
                        </div>
                      ) : (
                        <div className="loss-content">
                          <div style={{ fontSize: 14, opacity: 0.2 }}>✕</div>
                          <div style={{ fontSize: 7, color: "rgba(90,106,136,0.7)" }}>No win</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reveal all skip */}
          {phase === "revealing" && (
            <button
              onClick={revealAll}
              style={{
                fontSize: 12, color: "rgba(150,170,200,0.4)",
                background: "none", border: "none", cursor: "pointer",
                textDecoration: "underline", textUnderlineOffset: 3,
              }}
            >
              Reveal all at once
            </button>
          )}

          {/* Result summary */}
          {phase === "done" && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 16,
              width: "100%", maxWidth: 480,
            }}>
              {hasWinner ? (
                <div style={{
                  width: "100%",
                  padding: "20px 24px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(0,212,160,0.08), rgba(0,212,160,0.04))",
                  border: "1px solid rgba(0,212,160,0.25)",
                  display: "flex", alignItems: "center", gap: 16,
                  animation: "slideUp 0.4s ease-out",
                }}>
                  <div style={{ fontSize: 40 }}>🏆</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#00d4a0", marginBottom: 4 }}>
                      You Won!
                    </div>
                    {winners.map((r, i) => (
                      <div key={i} style={{ fontSize: 13, color: "rgba(220,240,230,0.8)" }}>
                        <span style={{ fontWeight: 700, color: "#e8eaf0" }}>{r.sharesAwarded} share{r.sharesAwarded !== 1 ? "s" : ""}</span>
                        {r.card && (
                          <span style={{ color: "rgba(150,170,200,0.6)" }}> · {r.card.title}</span>
                        )}
                        <span style={{ color: "#00d4a0", marginLeft: 6, fontSize: 12 }}>
                          ~${(r.evCents / 100).toFixed(2)} est. value
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  textAlign: "center",
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>🎴</div>
                  <div style={{ color: "rgba(180,200,230,0.7)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    No win this time
                  </div>
                  <div style={{ color: "rgba(120,140,170,0.5)", fontSize: 12 }}>
                    Every pull is independent — the odds reset completely.
                  </div>
                </div>
              )}

              <button
                onClick={() => { setPhase("idle"); onDone(); }}
                style={{
                  padding: "13px 36px",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "0.04em",
                  border: "none",
                  cursor: "pointer",
                  background: isFree
                    ? "rgba(255,255,255,0.06)"
                    : "linear-gradient(135deg, #c9a84c, #8a6020)",
                  color: isFree ? "rgba(180,200,230,0.7)" : "#05080f",
                  boxShadow: isFree ? "none" : "0 6px 20px rgba(201,168,76,0.25)",
                  transition: "all 0.15s",
                }}
              >
                {isFree ? "Done" : "Open Another Pack"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: "12px 20px", borderRadius: 10, fontSize: 13,
          background: "rgba(255,77,106,0.08)",
          border: "1px solid rgba(255,77,106,0.2)",
          color: "#ff4d6a",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
