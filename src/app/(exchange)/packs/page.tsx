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

const RECENT_WINS = [
  { user: "trainer_k***", card: "1999 Charizard PSA 10",       shares: 5,  color: "#c9a84c" },
  { user: "vault_r***",   card: "Skyridge Crystal Charizard",  shares: 1,  color: "#a78bfa" },
  { user: "ace_m***",     card: "1999 Charizard PSA 10",       shares: 5,  color: "#c9a84c" },
  { user: "pokefan_j***", card: "Arceus Level X BGS 9.5",     shares: 2,  color: "#00d4a0" },
  { user: "flip_s***",    card: "1999 Charizard PSA 10",       shares: 5,  color: "#c9a84c" },
  { user: "hold_t***",    card: "Skyridge Crystal Charizard",  shares: 1,  color: "#a78bfa" },
];

const PRIZE_POOL = [
  { card: "1999 Pokémon Base Set Charizard Holo", grader: "PSA", grade: 10, rarity: "ULTRA RARE", rarityColor: "#c9a84c", sharesPerWin: 5,  available: 500 },
  { card: "2003 Pokémon Skyridge Crystal Charizard", grader: "PSA", grade: 9, rarity: "RARE",       rarityColor: "#a78bfa", sharesPerWin: 1,  available: 200 },
  { card: "2009 Pokémon Platinum Arceus Level X",   grader: "BGS", grade: 9.5, rarity: "UNCOMMON",   rarityColor: "#00d4a0", sharesPerWin: 2,  available: 100 },
];

export default function PacksPage() {
  const [packs, setPacks]       = useState<Pack[]>([]);
  const [selected, setSelected] = useState<Pack | null>(null);
  const [loading, setLoading]   = useState(true);
  const [winnerIdx, setWinnerIdx] = useState(0);

  const fetchPacks = () =>
    fetch("/api/packs").then(r => r.json()).then(setPacks).finally(() => setLoading(false));

  useEffect(() => { fetchPacks(); }, []);

  // Rotate winners ticker
  useEffect(() => {
    const t = setInterval(() => setWinnerIdx(i => (i + 1) % RECENT_WINS.length), 3200);
    return () => clearInterval(t);
  }, []);

  const freePack  = packs.find(p => p.type === "free_daily");
  const paidPacks = packs.filter(p => p.type !== "free_daily");
  const win       = RECENT_WINS[winnerIdx];

  /* ── PACK OPENER view ── */
  if (selected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 -24px" }}>
        {/* Header */}
        <div style={{
          position: "relative",
          padding: "40px 36px 48px",
          background: "linear-gradient(160deg, #05080f 0%, #0b1220 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}>
          {/* Animated background orbs */}
          <div style={{
            position: "absolute", top: -80, left: "30%",
            width: 300, height: 300, borderRadius: "50%",
            background: selected.type === "free_daily"
              ? "radial-gradient(circle, rgba(0,212,160,0.06) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Back link */}
          <button
            onClick={() => setSelected(null)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "rgba(150,170,200,0.45)",
              background: "none", border: "none", cursor: "pointer",
              marginBottom: 32, padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(200,215,240,0.9)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(150,170,200,0.45)")}
          >
            ← Back to Packs
          </button>

          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <h1 style={{
              fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em",
              color: "#fff", marginBottom: 6,
            }}>
              {selected.name}
            </h1>
            <div style={{ fontSize: 13, color: "rgba(150,170,200,0.45)" }}>
              Server-sealed result · reveal animation is display only
            </div>
          </div>
        </div>

        <div style={{ padding: "40px 36px", background: "#06090f" }}>
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

  /* ── PACK SELECTION view ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 -24px" }}>

      {/* ══ HERO ══ */}
      <div style={{
        position: "relative",
        padding: "56px 36px 60px",
        background: "linear-gradient(160deg, #04070d 0%, #08101e 60%, #05080f 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden",
        textAlign: "center",
      }}>
        {/* Radial glow orbs */}
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 500, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "20%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, right: "20%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Floating card silhouettes */}
        {["left: 8%; top: 15%", "right: 10%; top: 10%", "left: 15%; bottom: 10%", "right: 8%; bottom: 8%"].map((pos, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 60, height: 84,
            borderRadius: 6,
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.04)",
            transform: `rotate(${["-12deg","10deg","-8deg","14deg"][i]})`,
            animation: `floatCard ${5 + i}s ease-in-out ${i * 0.8}s infinite`,
            pointerEvents: "none",
            ...Object.fromEntries(pos.split("; ").map(s => s.split(": "))),
          }} />
        ))}

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.15em",
              padding: "4px 12px", borderRadius: 20,
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.25)",
              color: "#c9a84c",
            }}>
              ✦ VAULT PACKS
            </span>
          </div>

          <h1 style={{
            fontSize: 44, fontWeight: 900, letterSpacing: "-0.03em",
            color: "#fff",
            lineHeight: 1.1,
            marginBottom: 12,
            textShadow: "0 0 60px rgba(201,168,76,0.15)",
          }}>
            Open Packs.<br />
            <span style={{
              background: "linear-gradient(90deg, #c9a84c, #f0d070, #c9a84c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Win Shares.
            </span>
          </h1>

          <p style={{ fontSize: 15, color: "rgba(150,170,200,0.55)", marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>
            Server-authoritative draws. Every result is sealed before the reveal animation plays.
          </p>

          {/* Live winner notification */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 13,
            transition: "all 0.5s",
          }}>
            <span className="live-dot" style={{ width: 7, height: 7 }} />
            <span style={{ color: "rgba(180,200,230,0.6)" }}>
              <span style={{ fontWeight: 700, color: "#e8eaf0" }}>{win.user}</span>
              {" "}just won{" "}
              <span style={{ fontWeight: 700, color: win.color }}>{win.shares} shares</span>
              {" "}of{" "}
              <span style={{ fontWeight: 600, color: "#e0eaff" }}>{win.card}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══ PACK CARDS ══ */}
      <div style={{
        padding: "48px 36px",
        background: "#06090f",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(150,170,200,0.4)", fontSize: 14 }}>Loading packs…</div>
        ) : (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>

            {/* Free daily pack */}
            {freePack && (
              <div
                onClick={!freePack.claimedToday ? () => setSelected(freePack) : undefined}
                style={{
                  position: "relative",
                  borderRadius: 20,
                  padding: "28px 28px 32px",
                  background: freePack.claimedToday
                    ? "linear-gradient(160deg, #080f14 0%, #06090f 100%)"
                    : "linear-gradient(160deg, #071410 0%, #060c0a 100%)",
                  border: freePack.claimedToday
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(0,212,160,0.25)",
                  width: 300,
                  cursor: freePack.claimedToday ? "default" : "pointer",
                  transition: "all 0.25s",
                  boxShadow: freePack.claimedToday ? "none" : "0 8px 40px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                }}
                onMouseEnter={e => {
                  if (!freePack.claimedToday) {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,160,0.2)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,212,160,0.5)";
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = freePack.claimedToday ? "none" : "0 8px 40px rgba(0,0,0,0.5)";
                  (e.currentTarget as HTMLElement).style.borderColor = freePack.claimedToday ? "rgba(255,255,255,0.06)" : "rgba(0,212,160,0.25)";
                }}
              >
                {/* Glow */}
                {!freePack.claimedToday && (
                  <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
                )}

                {/* Badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
                    padding: "4px 10px", borderRadius: 5,
                    background: "rgba(0,212,160,0.1)",
                    border: "1px solid rgba(0,212,160,0.2)",
                    color: "#00d4a0",
                  }}>
                    FREE DAILY
                  </span>
                  {freePack.claimedToday && (
                    <span style={{ fontSize: 11, color: "rgba(150,170,200,0.35)" }}>Claimed ✓</span>
                  )}
                </div>

                {/* Pack visual centered */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 120, height: 168,
                    borderRadius: 10,
                    background: freePack.claimedToday
                      ? "rgba(255,255,255,0.02)"
                      : "linear-gradient(160deg, #0b1e14, #0a1f1a)",
                    border: `1px solid ${freePack.claimedToday ? "rgba(255,255,255,0.05)" : "rgba(0,212,160,0.3)"}`,
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                    opacity: freePack.claimedToday ? 0.4 : 1,
                  }}>
                    <div style={{ height: 24, background: "linear-gradient(90deg, #006644, #00d4a0, #006644)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", color: "#05080f" }}>✦ VAULT ✦</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 28 }}>🌟</div>
                      <div style={{ fontSize: 8, color: "rgba(0,212,160,0.6)", letterSpacing: "0.1em" }}>1 DRAW</div>
                    </div>
                    <div style={{ height: 24, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px dashed rgba(0,212,160,0.15)" }}>
                      <span style={{ fontSize: 7, color: "rgba(0,212,160,0.35)", letterSpacing: "0.12em" }}>DAILY FREE</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eaf0", marginBottom: 4 }}>{freePack.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(150,170,200,0.45)" }}>1 server draw · resets at midnight UTC</div>
                </div>

                <div style={{ marginTop: 20 }}>
                  {freePack.claimedToday ? (
                    <div style={{
                      padding: "12px", borderRadius: 10, textAlign: "center",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 13, color: "rgba(120,140,170,0.5)",
                    }}>
                      Returns tomorrow
                    </div>
                  ) : (
                    <div style={{
                      padding: "14px", borderRadius: 10, textAlign: "center",
                      background: "linear-gradient(135deg, #00c897, #009e78)",
                      fontSize: 15, fontWeight: 800, color: "#05080f",
                      letterSpacing: "0.04em",
                      boxShadow: "0 6px 20px rgba(0,200,151,0.3)",
                    }}>
                      ⚡ Claim Free Pack
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paid packs */}
            {paidPacks.map(pack => (
              <div
                key={pack.id}
                onClick={() => setSelected(pack)}
                style={{
                  position: "relative",
                  borderRadius: 20,
                  padding: "28px 28px 32px",
                  background: "linear-gradient(160deg, #110e05 0%, #0a0902 100%)",
                  border: "1px solid rgba(201,168,76,0.25)",
                  width: 300,
                  cursor: "pointer",
                  transition: "all 0.25s",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.15)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.55)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(0,0,0,0.5)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.25)";
                }}
              >
                {/* Gold glow */}
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />

                {/* Badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
                    padding: "4px 10px", borderRadius: 5,
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: "#c9a84c",
                  }}>
                    PREMIUM
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#c9a84c", fontFamily: "monospace" }}>
                    ${(pack.priceCents / 100).toFixed(2)}
                  </span>
                </div>

                {/* Pack visual */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 120, height: 168,
                    borderRadius: 10,
                    background: "linear-gradient(160deg, #18120a, #1a1408)",
                    border: "1px solid rgba(201,168,76,0.3)",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 20px rgba(201,168,76,0.08)",
                  }}>
                    <div style={{ height: 24, background: "linear-gradient(90deg, #7a5a10, #c9a84c, #7a5a10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", color: "#05080f" }}>✦ VAULT ✦</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 28 }}>✨</div>
                      <div style={{ fontSize: 8, color: "rgba(201,168,76,0.6)", letterSpacing: "0.1em" }}>10 DRAWS</div>
                    </div>
                    <div style={{ height: 24, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px dashed rgba(201,168,76,0.15)" }}>
                      <span style={{ fontSize: 7, color: "rgba(201,168,76,0.35)", letterSpacing: "0.12em" }}>STANDARD PACK</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eaf0", marginBottom: 4 }}>{pack.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(150,170,200,0.45)" }}>10 draws · improved odds · instant reveal</div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{
                    padding: "14px", borderRadius: 10, textAlign: "center",
                    background: "linear-gradient(135deg, #c9a84c, #8a6020)",
                    fontSize: 15, fontWeight: 800, color: "#05080f",
                    letterSpacing: "0.04em",
                    boxShadow: "0 6px 20px rgba(201,168,76,0.25)",
                  }}>
                    Open Pack · ${(pack.priceCents / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ PRIZE POOL TABLE ══ */}
      <div style={{ padding: "40px 36px 56px", background: "#05080f" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
              color: "rgba(150,170,200,0.35)",
              marginBottom: 8,
            }}>
              PRIZE POOL
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e8eaf0", letterSpacing: "-0.02em" }}>
              What you can win
            </h2>
          </div>

          <div style={{
            background: "#080d18",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto auto auto",
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              color: "rgba(120,140,170,0.5)",
            }}>
              <span>CARD</span>
              <span style={{ textAlign: "center", minWidth: 90 }}>RARITY</span>
              <span style={{ textAlign: "center", minWidth: 90 }}>WIN</span>
              <span style={{ textAlign: "right", minWidth: 90 }}>POOL</span>
            </div>

            {PRIZE_POOL.map((row, i) => (
              <div
                key={row.card}
                style={{
                  display: "grid", gridTemplateColumns: "1fr auto auto auto",
                  padding: "16px 20px",
                  borderBottom: i < PRIZE_POOL.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  alignItems: "center",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#dde5f0", marginBottom: 3 }}>
                    {row.card}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(120,140,170,0.5)" }}>
                    {row.grader} {row.grade}
                  </div>
                </div>

                <div style={{ textAlign: "center", minWidth: 90 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                    padding: "3px 8px", borderRadius: 4,
                    background: `${row.rarityColor}18`,
                    border: `1px solid ${row.rarityColor}35`,
                    color: row.rarityColor,
                  }}>
                    {row.rarity}
                  </span>
                </div>

                <div style={{ textAlign: "center", minWidth: 90 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0", fontFamily: "monospace" }}>
                    {row.sharesPerWin} share{row.sharesPerWin !== 1 ? "s" : ""}
                  </span>
                </div>

                <div style={{ textAlign: "right", minWidth: 90 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0", fontFamily: "monospace" }}>
                    {row.available.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(120,140,170,0.4)" }}>available</div>
                </div>
              </div>
            ))}
          </div>

          {/* Provable fairness note */}
          <div style={{
            marginTop: 16,
            padding: "14px 18px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "flex-start", gap: 10,
            fontSize: 12,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
            <div style={{ color: "rgba(150,170,200,0.45)", lineHeight: 1.5 }}>
              All draws are server-authoritative with a recorded <code style={{ color: "rgba(200,215,240,0.5)", fontSize: 11 }}>server_seed_hash</code>.
              Results are sealed before the reveal animation plays.
              Every award is backed by pre-reserved shares — the pool cannot award what it doesn't hold.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
