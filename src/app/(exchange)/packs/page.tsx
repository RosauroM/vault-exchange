"use client";
import { useEffect, useState } from "react";
import { PackOpener } from "@/components/exchange/PackOpener";

interface Pack {
  id: string; name: string; type: string; priceCents: number;
  isActive: boolean; claimedToday: boolean;
}
interface PullEntry {
  id: string; packId: string; won: boolean; cardId: string | null;
  sharesAwarded: number; evCents: number; createdAt: string;
  card?: { title: string };
}
interface TimeLeft { h: number; m: number; s: number }

const RECENT_WINS = [
  { user: "trainer_k***", card: "1999 Charizard Holo",        shares: 5, color: "#c9a84c" },
  { user: "vault_r***",   card: "Skyridge Crystal Charizard", shares: 1, color: "#a78bfa" },
  { user: "ace_m***",     card: "1999 Charizard PSA 10",      shares: 5, color: "#c9a84c" },
  { user: "pokefan_j***", card: "Arceus Level X BGS 9.5",    shares: 2, color: "#00d4a0" },
  { user: "flip_s***",    card: "Skyridge Crystal Charizard", shares: 1, color: "#a78bfa" },
  { user: "hold_t***",    card: "1999 Charizard PSA 10",      shares: 5, color: "#c9a84c" },
  { user: "card_w***",    card: "Arceus Level X BGS 9.5",    shares: 2, color: "#00d4a0" },
  { user: "rare_p***",    card: "1999 Charizard Holo",        shares: 5, color: "#c9a84c" },
];

const PRIZE_POOL = [
  { card: "1999 Pokémon Base Set Charizard Holo",    grader: "PSA", grade: "10",   rarity: "ULTRA RARE", color: "#c9a84c", shares: 5, available: 500, totalPool: 500, chance: 0.8  },
  { card: "2003 Pokémon Skyridge Crystal Charizard", grader: "PSA", grade: "9",   rarity: "RARE",       color: "#a78bfa", shares: 1, available: 200, totalPool: 200, chance: 2.4  },
  { card: "2009 Pokémon Platinum Arceus Level X",    grader: "BGS", grade: "9.5", rarity: "UNCOMMON",   color: "#00d4a0", shares: 2, available: 100, totalPool: 100, chance: 5.1  },
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function Countdown({ timeLeft }: { timeLeft: TimeLeft }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((val, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: "#e8eaf0", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 5, padding: "2px 6px", letterSpacing: "0.04em", minWidth: 28, textAlign: "center" as const }}>
            {val}
          </span>
          {i < 2 && <span style={{ color: "rgba(150,170,200,0.35)", fontWeight: 700 }}>:</span>}
        </span>
      ))}
    </div>
  );
}

/* ─── Pack visual ─── */
function PackCard({ isFree, claimed, size = "md" }: { isFree: boolean; claimed?: boolean; size?: "sm" | "md" }) {
  const w = size === "sm" ? 96 : 128;
  const h = size === "sm" ? 134 : 178;
  const accent = isFree ? "#00d4a0" : "#c9a84c";
  const accentDim = isFree ? "rgba(0,212,160,0.35)" : "rgba(201,168,76,0.35)";
  const bg = isFree
    ? "linear-gradient(155deg, #081a14 0%, #050e09 100%)"
    : "linear-gradient(155deg, #1c1408 0%, #100d04 100%)";

  return (
    <div style={{ width: w, height: h, borderRadius: 10, position: "relative", overflow: "hidden", background: bg, border: `1px solid ${accentDim}`, boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 24px ${isFree ? "rgba(0,212,160,0.07)" : "rgba(201,168,76,0.09)"}`, opacity: claimed ? 0.32 : 1, flexShrink: 0 }}>
      {/* Foil overlay */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.04) 45%, transparent 65%)", animation: claimed ? "none" : "holoShift 3s linear infinite", backgroundSize: "200% 200%" }} />
      {/* Top band */}
      <div style={{ height: size === "sm" ? 20 : 24, background: isFree ? "linear-gradient(90deg, #005c3d, #00d4a0, #005c3d)" : "linear-gradient(90deg, #6a4e10, #c9a84c, #6a4e10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size === "sm" ? 6 : 7, fontWeight: 900, letterSpacing: "0.2em", color: "#03080c" }}>✦ VAULT ✦</span>
      </div>
      {/* Center */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: h - (size === "sm" ? 20 : 24) - (size === "sm" ? 24 : 30), gap: 5 }}>
        <div style={{ fontSize: size === "sm" ? 24 : 30, filter: `drop-shadow(0 0 8px ${isFree ? "rgba(0,212,160,0.45)" : "rgba(201,168,76,0.45)"})` }}>
          {isFree ? "🌟" : "✨"}
        </div>
        <div style={{ fontSize: size === "sm" ? 6 : 7, color: `${accent}99`, letterSpacing: "0.14em", fontWeight: 700 }}>
          {isFree ? "1 DRAW" : "10 DRAWS"}
        </div>
      </div>
      {/* Tear perforation */}
      <div style={{ position: "absolute", bottom: size === "sm" ? 24 : 30, left: 0, right: 0, borderTop: "1px dashed rgba(255,255,255,0.06)" }} />
      {/* Bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: size === "sm" ? 24 : 30, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size === "sm" ? 5 : 6, letterSpacing: "0.14em", color: `${accent}55`, fontWeight: 700 }}>
          {isFree ? "DAILY FREE" : "PREMIUM"}
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
  const [pulls, setPulls]       = useState<PullEntry[]>([]);

  const fetchPacks = () =>
    fetch("/api/packs").then(r => r.json()).then(setPacks).finally(() => setLoading(false));

  useEffect(() => {
    fetchPacks();
    fetch("/api/packs/history").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPulls(data.slice(0, 10));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const update = () => {
      const now  = new Date();
      const next = new Date();
      next.setUTCHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      setTimeLeft({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const freePack  = packs.find(p => p.type === "free_daily");
  const paidPacks = packs.filter(p => p.type !== "free_daily");

  /* ─── Pack opener view ─── */
  if (selected) {
    const isFreeSelected = selected.type === "free_daily";
    const accentColor    = isFreeSelected ? "#00d4a0" : "#c9a84c";
    return (
      <div style={{ display: "flex", flexDirection: "column", margin: "0 -24px" }}>
        {/* Opener header */}
        <div style={{ position: "relative", overflow: "hidden", padding: "32px 48px 36px", background: "linear-gradient(160deg, #04070d 0%, #08101e 100%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ position: "absolute", top: -60, right: "20%", width: 320, height: 200, borderRadius: "50%", background: `radial-gradient(ellipse, ${isFreeSelected ? "rgba(0,212,160,0.05)" : "rgba(201,168,76,0.05)"} 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => setSelected(null)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(150,170,200,0.4)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, cursor: "pointer", padding: "7px 14px", transition: "all 0.13s", flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e8eaf0"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(150,170,200,0.4)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
              >
                ← Back
              </button>
              <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.06)" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", padding: "3px 9px", borderRadius: 5, background: `${accentColor}12`, border: `1px solid ${accentColor}30`, color: accentColor }}>
                    {isFreeSelected ? "FREE DAILY" : "PREMIUM"}
                  </span>
                  {!isFreeSelected && (
                    <span style={{ fontSize: 9, color: "rgba(150,170,200,0.35)", letterSpacing: "0.08em" }}>10 DRAWS · ${(selected.priceCents / 100).toFixed(2)}</span>
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eaf0", letterSpacing: "-0.01em" }}>{selected.name}</div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "rgba(120,140,170,0.35)", letterSpacing: "0.07em", marginBottom: 3 }}>FAIRNESS</div>
              <div style={{ fontSize: 12, color: "rgba(120,140,170,0.45)" }}>🔒 Server-sealed before reveal</div>
            </div>
          </div>
        </div>

        {/* Opener body */}
        <div style={{ padding: "52px 48px 72px", background: "#06090f", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 720 }}>
            <PackOpener packId={selected.id} packName={selected.name} packType={selected.type} priceCents={selected.priceCents} claimedToday={selected.claimedToday} onDone={() => { fetchPacks(); setSelected(null); }} />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Lobby view ─── */
  const HERO_STATS = [
    { label: "DRAWS TODAY",    value: "1,247", color: "#c9a84c" },
    { label: "SHARES AWARDED", value: "384",   color: "#00d4a0" },
    { label: "PRIZE POOL",     value: "$94K",  color: "#a78bfa" },
    { label: "WINNERS TODAY",  value: "38",    color: "#ff9d4a" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "0 -24px" }}>

      {/* ══ HERO ══ */}
      <div style={{ position: "relative", overflow: "hidden", padding: "52px 48px 0", background: "linear-gradient(160deg, #03060c 0%, #070e1c 55%, #04070d 100%)" }}>
        {/* Glows */}
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: "10%",  width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, right: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Ghost cards */}
        {[
          { left: "3%",  top: "10%", rot: "-14deg", dur: "6s",   delay: "0s"   },
          { right: "4%", top: "8%",  rot: "11deg",  dur: "7s",   delay: "1.2s" },
          { left: "11%", bottom: "0", rot: "-9deg",  dur: "5.5s", delay: "0.6s" },
          { right: "10%",bottom: "0", rot: "16deg",  dur: "6.5s", delay: "1.8s" },
        ].map((c, i) => {
          const { dur, delay, rot, ...posStyle } = c;
          return (
            <div key={i} style={{ position: "absolute", width: 56, height: 78, borderRadius: 6, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", transform: `rotate(${rot})`, animation: `floatCard ${dur} ease-in-out ${delay} infinite`, pointerEvents: "none", ...posStyle }} />
          );
        })}

        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", padding: "5px 14px", borderRadius: 20, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.22)", color: "#c9a84c" }}>
              ✦ VAULT PACKS
            </span>
          </div>
          <h1 style={{ fontSize: 50, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.06, marginBottom: 14, textShadow: "0 0 80px rgba(201,168,76,0.1)" }}>
            Open Packs.{" "}
            <span style={{ background: "linear-gradient(90deg, #c9a84c 0%, #f5e070 50%, #c9a84c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", backgroundSize: "200% auto", animation: "shimmerText 4s linear infinite" }}>
              Win Shares.
            </span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(150,170,200,0.45)", maxWidth: 440, margin: "0 auto 44px" }}>
            Server-authoritative draws. Results sealed before reveal. Every award backed by pre-reserved shares.
          </p>

          {/* Stats strip inside hero */}
          <div style={{ display: "flex", justifyContent: "center", gap: 0, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 0 }}>
            {HERO_STATS.map((s, i) => (
              <div key={s.label} style={{ flex: "1 1 0", maxWidth: 200, padding: "20px 24px", borderRight: i < HERO_STATS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: s.color, letterSpacing: "-0.02em", marginBottom: 5 }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(120,140,170,0.38)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ WINNER TICKER ══ */}
      <div style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "9px 0", overflow: "hidden", position: "relative" }}>
        <div style={{ display: "flex", animation: "winnerTicker 28s linear infinite", whiteSpace: "nowrap" as const }}>
          {[...RECENT_WINS, ...RECENT_WINS].map((w, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 30px" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4a0", boxShadow: "0 0 6px #00d4a0", flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "rgba(160,180,210,0.5)" }}>
                <span style={{ fontWeight: 700, color: "#dde5f0" }}>{w.user}</span>
                {" "}won{" "}
                <span style={{ fontWeight: 700, color: w.color }}>{w.shares} share{w.shares !== 1 ? "s" : ""}</span>
                {" "}of{" "}
                <span style={{ fontWeight: 600, color: "rgba(200,220,245,0.7)" }}>{w.card}</span>
              </span>
              <span style={{ color: "rgba(255,255,255,0.07)", fontSize: 10 }}>·</span>
            </span>
          ))}
        </div>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg, #05080f 0%, transparent 5%, transparent 95%, #05080f 100%)" }} />
      </div>

      {/* ══ PACKS ══ */}
      <div style={{ padding: "48px 48px 52px", background: "#06090f" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "80px 0" }}>
            {/* Spinning ring */}
            <div style={{ position: "relative", width: 48, height: 48 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.08)" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#c9a84c", borderRightColor: "rgba(201,168,76,0.3)", animation: "spinRing 0.8s linear infinite" }} />
              <div style={{ position: "absolute", inset: "10px", borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(201,168,76,0.4)", animation: "spinRing 1.2s linear infinite reverse" }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(120,140,170,0.35)" }}>LOADING PACKS…</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Section label ── */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.38)" }}>AVAILABLE PACKS</div>

            {/* ── Free daily pack ── */}
            {freePack && (
              <div style={{
                position: "relative", overflow: "hidden", borderRadius: 20,
                background: freePack.claimedToday ? "rgba(255,255,255,0.02)" : "linear-gradient(145deg, #061310 0%, #040c09 100%)",
                border: freePack.claimedToday ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,212,160,0.18)",
                padding: "32px 36px",
                boxShadow: freePack.claimedToday ? "none" : "0 0 0 1px rgba(0,212,160,0.06) inset",
              }}>
                {!freePack.claimedToday && (
                  <>
                    <div style={{ position: "absolute", top: -80, right: -40, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: -40, left: "30%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />
                  </>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" as const }}>
                  {/* Pack visual */}
                  <div style={{ flexShrink: 0, position: "relative" }}>
                    <PackCard isFree={true} claimed={freePack.claimedToday} />
                    {!freePack.claimedToday && (
                      <div style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#00d4a0", boxShadow: "0 0 10px #00d4a0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 900 }}>!</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", padding: "3px 10px", borderRadius: 5, background: "rgba(0,212,160,0.1)", border: "1px solid rgba(0,212,160,0.22)", color: "#00d4a0" }}>FREE DAILY</span>
                      {freePack.claimedToday && <span style={{ fontSize: 10, color: "rgba(120,140,170,0.45)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 8px" }}>✓ Claimed today</span>}
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: freePack.claimedToday ? "rgba(200,215,240,0.3)" : "#e8eaf0", letterSpacing: "-0.02em", marginBottom: 6 }}>{freePack.name}</h2>
                    <p style={{ fontSize: 13, color: "rgba(150,170,200,0.4)", marginBottom: 18, lineHeight: 1.5, maxWidth: 440 }}>
                      One draw per day. Resets at midnight UTC. Server-authoritative — results sealed before the reveal plays.
                    </p>

                    {/* Countdown row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                      {freePack.claimedToday ? (
                        <>
                          <span style={{ fontSize: 11, color: "rgba(120,140,170,0.38)", letterSpacing: "0.05em" }}>RESETS IN</span>
                          <Countdown timeLeft={timeLeft} />
                        </>
                      ) : (
                        <>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00d4a0", boxShadow: "0 0 8px #00d4a0", flexShrink: 0, display: "inline-block" }} />
                          <span style={{ fontSize: 13, color: "#00d4a0", fontWeight: 600 }}>Ready to claim</span>
                          <span style={{ color: "rgba(120,140,170,0.25)", fontSize: 11 }}>· expires in <Countdown timeLeft={timeLeft} /></span>
                        </>
                      )}
                    </div>

                    {freePack.claimedToday ? (
                      <div style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", borderRadius: 11, fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(120,140,170,0.35)", cursor: "not-allowed" }}>
                        Come back tomorrow
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelected(freePack)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 30px", borderRadius: 11, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", border: "none", cursor: "pointer", background: "linear-gradient(135deg, #00c897 0%, #008f6a 100%)", color: "#031a10", boxShadow: "0 8px 28px rgba(0,200,151,0.26)", transition: "transform 0.1s, box-shadow 0.1s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(0,200,151,0.36)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,200,151,0.26)"; }}
                      >
                        ⚡ Claim Free Pack
                      </button>
                    )}
                  </div>

                  {/* Odds preview */}
                  <div style={{ flexShrink: 0, minWidth: 180, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(120,140,170,0.35)", marginBottom: 2 }}>DRAW ODDS</div>
                    {PRIZE_POOL.map(p => (
                      <div key={p.card} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(p.chance * 10, 100)}%`, height: "100%", background: p.color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: p.color, minWidth: 36, textAlign: "right" as const }}>{p.chance}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Premium packs ── */}
            {paidPacks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {paidPacks.map(pack => {
                  const perDraw = pack.priceCents / 100 / 10;
                  return (
                    <div
                      key={pack.id}
                      onClick={() => setSelected(pack)}
                      style={{
                        position: "relative", overflow: "hidden", borderRadius: 20,
                        background: "linear-gradient(145deg, #130f04 0%, #0c0900 100%)",
                        border: "1px solid rgba(201,168,76,0.18)",
                        padding: "32px 36px",
                        cursor: "pointer",
                        transition: "transform 0.13s ease, box-shadow 0.13s ease, border-color 0.13s ease",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
                      }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,168,76,0.18) inset"; el.style.borderColor = "rgba(201,168,76,0.42)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "0 4px 24px rgba(0,0,0,0.45)"; el.style.borderColor = "rgba(201,168,76,0.18)"; }}
                    >
                      <div style={{ position: "absolute", top: -70, right: -50, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

                      <div style={{ display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" as const }}>
                        {/* Pack visual */}
                        <PackCard isFree={false} />

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 220 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", padding: "3px 10px", borderRadius: 5, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.22)", color: "#c9a84c" }}>PREMIUM</span>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(180,200,230,0.45)" }}>10 DRAWS</span>
                          </div>
                          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#e8eaf0", letterSpacing: "-0.02em", marginBottom: 6 }}>{pack.name}</h2>
                          <p style={{ fontSize: 13, color: "rgba(150,170,200,0.4)", marginBottom: 20, lineHeight: 1.5, maxWidth: 380 }}>
                            10 server-authoritative draws with boosted odds. Spend from wallet balance — no redirect needed.
                          </p>

                          {/* Pricing row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                            <div>
                              <div style={{ fontSize: 10, color: "rgba(120,140,170,0.35)", letterSpacing: "0.07em", marginBottom: 3 }}>PACK PRICE</div>
                              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "#c9a84c", letterSpacing: "-0.02em" }}>${(pack.priceCents / 100).toFixed(2)}</div>
                            </div>
                            <div style={{ width: 1, height: 34, background: "rgba(255,255,255,0.06)" }} />
                            <div>
                              <div style={{ fontSize: 10, color: "rgba(120,140,170,0.35)", letterSpacing: "0.07em", marginBottom: 3 }}>PER DRAW</div>
                              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "rgba(201,168,76,0.45)", letterSpacing: "-0.02em" }}>${perDraw.toFixed(2)}</div>
                            </div>
                          </div>

                          <button
                            onClick={e => { e.stopPropagation(); setSelected(pack); }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 11, fontSize: 14, fontWeight: 800, letterSpacing: "0.03em", border: "none", cursor: "pointer", background: "linear-gradient(135deg, #c9a84c 0%, #7a5010 100%)", color: "#06050c", boxShadow: "0 8px 28px rgba(201,168,76,0.2)", transition: "transform 0.1s, box-shadow 0.1s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(201,168,76,0.32)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(201,168,76,0.2)"; }}
                          >
                            ✦ Open Pack · ${(pack.priceCents / 100).toFixed(2)}
                          </button>
                        </div>

                        {/* Odds preview */}
                        <div style={{ flexShrink: 0, minWidth: 180, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(120,140,170,0.35)", marginBottom: 2 }}>BOOSTED ODDS</div>
                          {PRIZE_POOL.map(p => (
                            <div key={p.card} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                              <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(p.chance * 10 * 1.5, 100)}%`, height: "100%", background: p.color, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: p.color, minWidth: 36, textAlign: "right" as const }}>{(p.chance * 1.5).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ PRIZE POOL ══ */}
      <div style={{ padding: "44px 48px 52px", background: "#050810", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.38)", marginBottom: 7 }}>PRIZE POOL</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e8eaf0", letterSpacing: "-0.02em" }}>What you can win</h2>
          </div>
          <span style={{ fontSize: 11, color: "rgba(120,140,170,0.3)" }}>All pools pre-reserved · no oversell possible</span>
        </div>

        <div style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px 120px", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(120,140,170,0.4)" }}>
            <span>CARD</span>
            <span>RARITY</span>
            <span style={{ textAlign: "center" as const }}>SHARES</span>
            <span style={{ textAlign: "center" as const }}>WIN CHANCE</span>
            <span style={{ textAlign: "right" as const }}>POOL LEFT</span>
          </div>

          {PRIZE_POOL.map((row, i) => {
            const usedPct = ((row.totalPool - row.available) / row.totalPool) * 100;
            return (
              <div key={row.card} style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px 120px", padding: "18px 20px", alignItems: "center", borderBottom: i < PRIZE_POOL.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Card info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#dde5f0", marginBottom: 2 }}>{row.card}</div>
                    <div style={{ fontSize: 11, color: "rgba(120,140,170,0.4)" }}>{row.grader} Grade {row.grade}</div>
                  </div>
                </div>

                {/* Rarity */}
                <div>
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 7px", borderRadius: 4, background: `${row.color}14`, border: `1px solid ${row.color}28`, color: row.color }}>
                    {row.rarity}
                  </span>
                </div>

                {/* Shares */}
                <div style={{ textAlign: "center" as const, fontFamily: "monospace", fontWeight: 800, fontSize: 14, color: "#e8eaf0" }}>{row.shares}</div>

                {/* Win chance with bar */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, color: row.color }}>{row.chance}%</span>
                  <div style={{ width: 70, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(row.chance * 12, 100)}%`, height: "100%", background: row.color, borderRadius: 2 }} />
                  </div>
                </div>

                {/* Pool remaining */}
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 4 }}>{row.available.toLocaleString()}</div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginBottom: 3 }}>
                    <div style={{ width: `${100 - usedPct}%`, height: "100%", background: `${row.color}88`, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(120,140,170,0.35)" }}>of {row.totalPool.toLocaleString()} remaining</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fairness note */}
        <div style={{ marginTop: 14, padding: "13px 16px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12 }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>🔒</span>
          <div style={{ color: "rgba(150,170,200,0.38)", lineHeight: 1.6 }}>
            All draws are server-authoritative with a recorded{" "}
            <code style={{ color: "rgba(200,215,240,0.4)", fontSize: 10.5, background: "rgba(255,255,255,0.05)", borderRadius: 3, padding: "1px 5px" }}>server_seed_hash</code>.
            {" "}Results are sealed before the reveal animation plays. The pool cannot award what it doesn&apos;t hold.
          </div>
        </div>
      </div>

      {/* ══ YOUR PULL HISTORY ══ */}
      {pulls.length > 0 && (
        <div style={{ padding: "44px 48px 56px", background: "#06090f", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(120,140,170,0.38)", marginBottom: 20 }}>YOUR RECENT PULLS</div>

          <div style={{ background: "#080c18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
            {pulls.map((pull, i) => {
              const won = pull.won;
              return (
                <div key={pull.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 18px", borderBottom: i < pulls.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.018)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Result icon */}
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: won ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${won ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.07)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                    {won ? "★" : "◇"}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: won ? "#c9a84c" : "rgba(150,170,200,0.45)", marginBottom: 2 }}>
                      {won ? `Won ${pull.sharesAwarded} share${pull.sharesAwarded !== 1 ? "s" : ""} of ${pull.card?.title ?? "a card"}` : "No win this draw"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(120,140,170,0.35)" }}>
                      {new Date(pull.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(pull.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  {/* EV */}
                  {pull.evCents > 0 && (
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#c9a84c" }}>
                      +${(pull.evCents / 100).toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes floatCard {
          0%,100% { transform: translateY(0px) rotate(var(--rot,0deg)); }
          50%      { transform: translateY(-10px) rotate(var(--rot,0deg)); }
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
      `}</style>
    </div>
  );
}
