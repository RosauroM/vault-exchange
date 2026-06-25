"use client";
import { useEffect, useState, useRef } from "react";
import { PackOpener } from "@/components/exchange/PackOpener";

interface Pack {
  id: string;
  name: string;
  type: string;
  priceCents: number;
  isActive: boolean;
  claimedToday: boolean;
}

interface TimeLeft { h: number; m: number; s: number }

const RECENT_WINS = [
  { user: "trainer_k***", card: "1999 Charizard Holo",          shares: 5,  color: "#c9a84c" },
  { user: "vault_r***",   card: "Skyridge Crystal Charizard",   shares: 1,  color: "#a78bfa" },
  { user: "ace_m***",     card: "1999 Charizard PSA 10",        shares: 5,  color: "#c9a84c" },
  { user: "pokefan_j***", card: "Arceus Level X BGS 9.5",      shares: 2,  color: "#00d4a0" },
  { user: "flip_s***",    card: "Skyridge Crystal Charizard",   shares: 1,  color: "#a78bfa" },
  { user: "hold_t***",    card: "1999 Charizard PSA 10",        shares: 5,  color: "#c9a84c" },
  { user: "card_w***",    card: "Arceus Level X BGS 9.5",      shares: 2,  color: "#00d4a0" },
  { user: "rare_p***",    card: "1999 Charizard Holo",          shares: 5,  color: "#c9a84c" },
];

const PRIZE_POOL = [
  { card: "1999 Pokémon Base Set Charizard Holo", grader: "PSA", grade: "10",   rarity: "ULTRA RARE", color: "#c9a84c", shares: 5, available: 500,   chance: "0.8%" },
  { card: "2003 Pokémon Skyridge Crystal Charizard", grader: "PSA", grade: "9",  rarity: "RARE",       color: "#a78bfa", shares: 1, available: 200,   chance: "2.4%" },
  { card: "2009 Pokémon Platinum Arceus Level X",   grader: "BGS", grade: "9.5", rarity: "UNCOMMON",   color: "#00d4a0", shares: 2, available: 100,   chance: "5.1%" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function Countdown({ timeLeft }: { timeLeft: TimeLeft }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((val, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            fontFamily: "monospace", fontSize: 15, fontWeight: 800,
            color: "#e8eaf0", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, padding: "3px 7px", letterSpacing: "0.05em",
            minWidth: 30, textAlign: "center",
          }}>{val}</span>
          {i < 2 && <span style={{ color: "rgba(150,170,200,0.4)", fontSize: 13, fontWeight: 700 }}>:</span>}
        </span>
      ))}
    </div>
  );
}

function PackCard({ isFree, claimed }: { isFree: boolean; claimed?: boolean }) {
  return (
    <div style={{
      width: 140, height: 196,
      borderRadius: 12,
      position: "relative",
      overflow: "hidden",
      background: isFree
        ? "linear-gradient(160deg, #071410 0%, #060c0a 100%)"
        : "linear-gradient(160deg, #18120a 0%, #1a1408 100%)",
      border: `1px solid ${isFree ? "rgba(0,212,160,0.35)" : "rgba(201,168,76,0.35)"}`,
      boxShadow: isFree
        ? "0 16px 48px rgba(0,0,0,0.7), 0 0 28px rgba(0,212,160,0.08)"
        : "0 16px 48px rgba(0,0,0,0.7), 0 0 28px rgba(201,168,76,0.1)",
      opacity: claimed ? 0.38 : 1,
    }}>
      {/* Foil shimmer */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)",
        animation: claimed ? "none" : "holoShift 3s linear infinite",
        backgroundSize: "200% 200%",
      }} />
      {/* Top band */}
      <div style={{
        height: 28,
        background: isFree
          ? "linear-gradient(90deg, #006644, #00d4a0, #006644)"
          : "linear-gradient(90deg, #7a5a10, #c9a84c, #7a5a10)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.2em", color: "#05080f" }}>✦ VAULT ✦</span>
      </div>
      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 128, gap: 6 }}>
        <div style={{ fontSize: 36, filter: `drop-shadow(0 0 10px ${isFree ? "rgba(0,212,160,0.4)" : "rgba(201,168,76,0.4)"})` }}>
          {isFree ? "🌟" : "✨"}
        </div>
        <div style={{ fontSize: 8, color: isFree ? "rgba(0,212,160,0.6)" : "rgba(201,168,76,0.6)", letterSpacing: "0.12em" }}>
          {isFree ? "1 DRAW" : "10 DRAWS"}
        </div>
      </div>
      {/* Tear line */}
      <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, borderTop: "1px dashed rgba(255,255,255,0.07)" }} />
      {/* Bottom strip */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 32, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 7, letterSpacing: "0.14em", color: isFree ? "rgba(0,212,160,0.4)" : "rgba(201,168,76,0.4)" }}>
          {isFree ? "DAILY FREE PACK" : "STANDARD PACK"}
        </span>
      </div>
    </div>
  );
}

export default function PacksPage() {
  const [packs, setPacks]       = useState<Pack[]>([]);
  const [selected, setSelected] = useState<Pack | null>(null);
  const [loading, setLoading]   = useState(true);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ h: 0, m: 0, s: 0 });
  const tickerRef               = useRef<HTMLDivElement>(null);

  const fetchPacks = () =>
    fetch("/api/packs").then(r => r.json()).then(setPacks).finally(() => setLoading(false));

  useEffect(() => { fetchPacks(); }, []);

  // Countdown to midnight UTC
  useEffect(() => {
    const update = () => {
      const now  = new Date();
      const next = new Date();
      next.setUTCHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const freePack  = packs.find(p => p.type === "free_daily");
  const paidPacks = packs.filter(p => p.type !== "free_daily");

  /* ─── PACK OPENER view ─── */
  if (selected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 -24px" }}>
        {/* Opener header */}
        <div style={{
          padding: "32px 40px 36px",
          background: "linear-gradient(160deg, #04070d 0%, #080f1e 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "rgba(150,170,200,0.45)",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8, cursor: "pointer", padding: "7px 14px",
              transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e8eaf0"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(150,170,200,0.45)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
          >
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e8eaf0", letterSpacing: "-0.01em" }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: "rgba(120,140,170,0.45)", marginTop: 2 }}>
              Server-sealed · result is decided before the animation plays
            </div>
          </div>
        </div>
        <div style={{ padding: "48px 40px 64px", background: "#06090f" }}>
          <PackOpener
            packId={selected.id}
            packName={selected.name}
            packType={selected.type}
            priceCents={selected.priceCents}
            claimedToday={selected.claimedToday}
            onDone={() => { fetchPacks(); setSelected(null); }}
          />
        </div>
      </div>
    );
  }

  /* ─── LOBBY view ─── */
  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "0 -24px" }}>

      {/* ══ HERO ══ */}
      <div style={{
        position: "relative", overflow: "hidden",
        padding: "52px 48px 56px",
        background: "linear-gradient(160deg, #03060c 0%, #070e1c 55%, #04070d 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {/* Atmospheric glows */}
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,168,76,0.055) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: "15%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.035) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: "15%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.035) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Floating ghost cards */}
        {[
          { style: "left:4%;top:12%", rot: "-14deg", delay: "0s", dur: "6s" },
          { style: "right:5%;top:8%", rot: "11deg",  delay: "1.2s", dur: "7s" },
          { style: "left:12%;bottom:8%", rot: "-9deg",  delay: "0.6s", dur: "5.5s" },
          { style: "right:11%;bottom:12%", rot: "16deg", delay: "1.8s", dur: "6.5s" },
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute", width: 52, height: 72, borderRadius: 5,
            background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.035)",
            transform: `rotate(${c.rot})`,
            animation: `floatCard ${c.dur} ease-in-out ${c.delay} infinite`,
            pointerEvents: "none",
            ...Object.fromEntries(c.style.split(";").map(s => s.trim().split(":"))) ,
          }} />
        ))}

        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          {/* Badge */}
          <div style={{ marginBottom: 18 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.16em",
              padding: "5px 14px", borderRadius: 20,
              background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.22)",
              color: "#c9a84c",
            }}>
              ✦ VAULT PACKS
            </span>
          </div>

          <h1 style={{
            fontSize: 48, fontWeight: 900, letterSpacing: "-0.03em",
            color: "#fff", lineHeight: 1.08, marginBottom: 14,
            textShadow: "0 0 80px rgba(201,168,76,0.12)",
          }}>
            Open Packs.{" "}
            <span style={{
              background: "linear-gradient(90deg, #c9a84c 0%, #f5e070 50%, #c9a84c 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", backgroundSize: "200% auto",
              animation: "shimmerText 4s linear infinite",
            }}>
              Win Shares.
            </span>
          </h1>

          <p style={{ fontSize: 15, color: "rgba(150,170,200,0.5)", maxWidth: 460, margin: "0 auto" }}>
            Server-authoritative draws. Results are sealed before the reveal animation plays.
            Every award is backed by pre-reserved shares.
          </p>
        </div>
      </div>

      {/* ══ LIVE WINNER TICKER ══ */}
      <div style={{
        background: "rgba(0,0,0,0.35)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: "10px 0", overflow: "hidden", position: "relative",
      }}>
        <div ref={tickerRef} style={{
          display: "flex", gap: 0,
          animation: "winnerTicker 28s linear infinite",
          whiteSpace: "nowrap",
        }}>
          {[...RECENT_WINS, ...RECENT_WINS].map((w, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 32px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4a0", boxShadow: "0 0 6px #00d4a0", flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: 12.5, color: "rgba(160,180,210,0.55)" }}>
                <span style={{ fontWeight: 700, color: "#dde5f0" }}>{w.user}</span>
                {" "}won{" "}
                <span style={{ fontWeight: 700, color: w.color }}>{w.shares} share{w.shares !== 1 ? "s" : ""}</span>
                {" "}of{" "}
                <span style={{ fontWeight: 600, color: "rgba(210,225,245,0.75)" }}>{w.card}</span>
              </span>
              <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 10 }}>·</span>
            </span>
          ))}
        </div>
        {/* Fade edges */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg, #05080f 0%, transparent 6%, transparent 94%, #05080f 100%)" }} />
      </div>

      {/* ══ PACKS ══ */}
      <div style={{ padding: "52px 48px 60px", background: "#06090f" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(150,170,200,0.35)", fontSize: 13, padding: "60px 0" }}>
            Loading packs…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* ── Free daily pack ── */}
            {freePack && (
              <div style={{
                position: "relative", overflow: "hidden",
                borderRadius: 20,
                background: freePack.claimedToday
                  ? "rgba(255,255,255,0.02)"
                  : "linear-gradient(145deg, #071410 0%, #050d09 100%)",
                border: freePack.claimedToday
                  ? "1px solid rgba(255,255,255,0.05)"
                  : "1px solid rgba(0,212,160,0.2)",
                padding: "36px 40px",
              }}>
                {!freePack.claimedToday && (
                  <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" as const }}>
                  {/* Pack visual */}
                  <div style={{ flexShrink: 0 }}>
                    <PackCard isFree={true} claimed={freePack.claimedToday} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                        padding: "4px 12px", borderRadius: 6,
                        background: "rgba(0,212,160,0.1)", border: "1px solid rgba(0,212,160,0.2)",
                        color: "#00d4a0",
                      }}>
                        FREE DAILY
                      </span>
                      {freePack.claimedToday && (
                        <span style={{ fontSize: 11, color: "rgba(120,140,170,0.5)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "3px 10px" }}>
                          ✓ Claimed today
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontSize: 26, fontWeight: 900, color: freePack.claimedToday ? "rgba(200,215,240,0.35)" : "#e8eaf0", letterSpacing: "-0.02em", marginBottom: 8 }}>
                      {freePack.name}
                    </h2>
                    <p style={{ fontSize: 14, color: "rgba(150,170,200,0.45)", marginBottom: 20, lineHeight: 1.5 }}>
                      One server-authoritative draw per day. Resets at midnight UTC.
                      Results sealed before reveal.
                    </p>

                    {/* Countdown or reset note */}
                    {freePack.claimedToday ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                        <span style={{ fontSize: 12, color: "rgba(120,140,170,0.4)", letterSpacing: "0.04em" }}>RESETS IN</span>
                        <Countdown timeLeft={timeLeft} />
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4a0", boxShadow: "0 0 8px #00d4a0", flexShrink: 0, display: "inline-block" }} />
                        <span style={{ fontSize: 13, color: "#00d4a0", fontWeight: 600 }}>Ready to claim</span>
                        <span style={{ color: "rgba(120,140,170,0.3)", fontSize: 12 }}>·</span>
                        <span style={{ fontSize: 12, color: "rgba(120,140,170,0.4)" }}>Expires in <Countdown timeLeft={timeLeft} /></span>
                      </div>
                    )}

                    {freePack.claimedToday ? (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "13px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                        color: "rgba(120,140,170,0.45)", cursor: "not-allowed",
                      }}>
                        Come back tomorrow
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelected(freePack)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8,
                          padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 800,
                          letterSpacing: "0.03em", border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg, #00c897 0%, #009e78 100%)",
                          color: "#04100c",
                          boxShadow: "0 8px 28px rgba(0,200,151,0.28)",
                          transition: "all 0.18s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(0,200,151,0.38)"; (e.currentTarget as HTMLElement).style.transition = "all 0.1s ease"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,200,151,0.28)"; }}
                      >
                        ⚡ Claim Free Pack
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Paid packs ── */}
            {paidPacks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.4)" }}>
                  PREMIUM PACKS
                </div>
                {paidPacks.map(pack => (
                  <div
                    key={pack.id}
                    onClick={() => setSelected(pack)}
                    style={{
                      position: "relative", overflow: "hidden",
                      borderRadius: 20,
                      background: "linear-gradient(145deg, #110e05 0%, #0a0902 100%)",
                      border: "1px solid rgba(201,168,76,0.2)",
                      padding: "36px 40px",
                      cursor: "pointer",
                      transition: "transform 0.13s ease, box-shadow 0.13s ease, border-color 0.13s ease",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(-3px)";
                      el.style.boxShadow = "0 14px 44px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.2)";
                      el.style.borderColor = "rgba(201,168,76,0.45)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(0)";
                      el.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
                      el.style.borderColor = "rgba(201,168,76,0.2)";
                    }}
                  >
                    <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

                    <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" as const }}>
                      {/* Pack visual */}
                      <div style={{ flexShrink: 0 }}>
                        <PackCard isFree={false} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
                            padding: "4px 12px", borderRadius: 6,
                            background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)",
                            color: "#c9a84c",
                          }}>
                            PREMIUM
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                            padding: "4px 12px", borderRadius: 6,
                            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                            color: "rgba(180,200,230,0.5)",
                          }}>
                            10 DRAWS
                          </span>
                        </div>

                        <h2 style={{ fontSize: 26, fontWeight: 900, color: "#e8eaf0", letterSpacing: "-0.02em", marginBottom: 8 }}>
                          {pack.name}
                        </h2>
                        <p style={{ fontSize: 14, color: "rgba(150,170,200,0.45)", marginBottom: 20, lineHeight: 1.5 }}>
                          10 server-authoritative draws with improved odds. Results sealed before reveal.
                          Spend from your wallet balance instantly.
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "rgba(120,140,170,0.38)", letterSpacing: "0.06em", marginBottom: 4 }}>PRICE</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: "#c9a84c", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                              ${(pack.priceCents / 100).toFixed(2)}
                            </div>
                          </div>
                          <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.06)" }} />
                          <div>
                            <div style={{ fontSize: 11, color: "rgba(120,140,170,0.38)", letterSpacing: "0.06em", marginBottom: 4 }}>PER DRAW</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: "rgba(201,168,76,0.45)", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                              ${(pack.priceCents / 100 / 10).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={e => { e.stopPropagation(); setSelected(pack); }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 800,
                            letterSpacing: "0.03em", border: "none", cursor: "pointer",
                            background: "linear-gradient(135deg, #c9a84c 0%, #8a6020 100%)",
                            color: "#05080f",
                            boxShadow: "0 8px 28px rgba(201,168,76,0.22)",
                            transition: "transform 0.1s ease, box-shadow 0.1s ease",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(201,168,76,0.32)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(201,168,76,0.22)"; }}
                        >
                          ✦ Open Pack · ${(pack.priceCents / 100).toFixed(2)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ PRIZE POOL TABLE ══ */}
      <div style={{ padding: "48px 48px 60px", background: "#050810", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.38)", marginBottom: 8 }}>
            PRIZE POOL
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e8eaf0", letterSpacing: "-0.02em" }}>
            What you can win
          </h2>
        </div>

        <div style={{
          background: "#080c18", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 110px 90px 90px 100px",
            padding: "11px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(120,140,170,0.45)",
          }}>
            <span>CARD</span>
            <span>RARITY</span>
            <span style={{ textAlign: "center" }}>SHARES</span>
            <span style={{ textAlign: "center" }}>CHANCE</span>
            <span style={{ textAlign: "right" }}>AVAILABLE</span>
          </div>

          {PRIZE_POOL.map((row, i) => (
            <div key={row.card} style={{
              display: "grid", gridTemplateColumns: "1fr 110px 90px 90px 100px",
              padding: "16px 22px", alignItems: "center",
              borderBottom: i < PRIZE_POOL.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
              transition: "background 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent")}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#dde5f0", marginBottom: 3 }}>{row.card}</div>
                <div style={{ fontSize: 11, color: "rgba(120,140,170,0.45)" }}>{row.grader} Grade {row.grade}</div>
              </div>

              <div>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                  padding: "3px 8px", borderRadius: 4,
                  background: `${row.color}18`, border: `1px solid ${row.color}30`,
                  color: row.color,
                }}>
                  {row.rarity}
                </span>
              </div>

              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0", fontFamily: "monospace" }}>
                  {row.shares}
                </span>
              </div>

              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color, fontFamily: "monospace" }}>
                  {row.chance}
                </span>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0", fontFamily: "monospace" }}>
                  {row.available.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "rgba(120,140,170,0.38)" }}>remaining</div>
              </div>
            </div>
          ))}
        </div>

        {/* Provable fairness note */}
        <div style={{
          marginTop: 16, padding: "14px 18px", borderRadius: 10,
          background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "flex-start", gap: 12, fontSize: 12.5,
        }}>
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>🔒</span>
          <div style={{ color: "rgba(150,170,200,0.4)", lineHeight: 1.6 }}>
            All draws are server-authoritative with a recorded{" "}
            <code style={{ color: "rgba(200,215,240,0.45)", fontSize: 11, background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "1px 5px" }}>server_seed_hash</code>.
            {" "}Results are sealed before the reveal animation plays.
            Every award is backed by pre-reserved shares — the pool cannot award what it doesn&apos;t hold.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(var(--rot, 0deg)); }
          50%       { transform: translateY(-10px) rotate(var(--rot, 0deg)); }
        }
        @keyframes winnerTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmerText {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes holoShift {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
        @keyframes wiggle {
          0%,100% { transform: translateX(0) rotate(-2deg); }
          25%      { transform: translateX(-6px) rotate(2deg); }
          75%      { transform: translateX(6px) rotate(-2deg); }
        }
      `}</style>
    </div>
  );
}
