"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatUSD } from "@/lib/format";

/* ── Custom number stepper ── */
function NumStepper({
  label, value, onChange, min = 0, step = 1,
}: { label: string; value: string; onChange: (v: string) => void; min?: number; step?: number }) {
  const adjust = (delta: number) => {
    const cur = parseFloat(value) || 0;
    onChange(String(Math.max(min, cur + delta)));
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "stretch", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, overflow: "hidden", width: "100%" }}>
        <button type="button" onClick={() => adjust(-step)}
          style={{ width: 32, flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "none", borderRight: "1px solid rgba(255,255,255,0.06)", color: "rgba(180,200,230,0.7)", fontSize: 18, lineHeight: 1, cursor: "pointer", transition: "background 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        >−</button>
        <input
          type="number" value={value} min={min} step={step}
          onChange={e => onChange(e.target.value)}
          className="no-spinner"
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", padding: "11px 4px", textAlign: "center", fontSize: 14, fontFamily: "monospace", color: "#e8eaf0" }}
        />
        <button type="button" onClick={() => adjust(step)}
          style={{ width: 32, flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "none", borderLeft: "1px solid rgba(255,255,255,0.06)", color: "rgba(180,200,230,0.7)", fontSize: 18, lineHeight: 1, cursor: "pointer", transition: "background 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        >+</button>
      </div>
    </div>
  );
}

/* ── Custom grader dropdown ── */
const GRADERS = ["PSA", "BGS", "CGC"];
function GraderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)" }}>GRADER</label>
      <div ref={ref} style={{ position: "relative" }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", border: open ? "1px solid rgba(201,168,76,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "11px 12px", fontSize: 14, fontWeight: 700, color: "#e8eaf0", cursor: "pointer", transition: "border-color 0.15s" }}
        >
          <span>{value}</span>
          <span style={{ fontSize: 9, color: "rgba(150,170,200,0.4)", transform: open ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
        </button>
        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0d1828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, overflow: "hidden", zIndex: 50, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            {GRADERS.map((g, i) => (
              <button key={g} type="button" onClick={() => { onChange(g); setOpen(false); }}
                style={{ width: "100%", display: "block", padding: "11px 14px", background: g === value ? "rgba(201,168,76,0.08)" : "transparent", border: "none", borderBottom: i < GRADERS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", fontSize: 14, fontWeight: 600, color: g === value ? "#c9a84c" : "rgba(200,215,240,0.8)", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                onMouseEnter={e => { if (g !== value) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (g !== value) e.currentTarget.style.background = "transparent"; }}
              >{g}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Text input ── */
function TextInp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</label>
      <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "11px 14px", fontSize: 14, color: "#e8eaf0", outline: "none", width: "100%", boxSizing: "border-box" as const, transition: "border-color 0.15s" }}
        onFocus={e => (e.target.style.borderColor = "rgba(201,168,76,0.35)")}
        onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
      />
    </div>
  );
}

/* ── Validation ── */
const REQUIRED: { key: string; label: string }[] = [
  { key: "title",               label: "Card title" },
  { key: "setName",             label: "Set name" },
  { key: "year",                label: "Year" },
  { key: "grade",               label: "Grade" },
  { key: "certNumber",          label: "Cert number" },
  { key: "imageUrl",            label: "Image URL" },
  { key: "referencePriceCents", label: "Reference price" },
];

/* ══ ADMIN PAGE ══ */
export default function AdminPage() {
  const [tab, setTab] = useState<"card" | "withdrawals">("card");
  const [form, setForm] = useState({
    title: "", setName: "", year: "1999", grader: "PSA", grade: "10",
    certNumber: "", imageUrl: "", referencePriceCents: "",
    sharesIssued: "10000", treasuryShares: "5000", prizePoolShares: "500",
  });
  const [creating, setCreating]   = useState(false);
  const [createMsg, setCreateMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const set = (key: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  const createCard = async () => {
    // Validate required fields
    const missing = REQUIRED.filter(r => !form[r.key as keyof typeof form].toString().trim()).map(r => r.label);
    if (missing.length > 0) {
      setCreateMsg({ text: `Please fill in: ${missing.join(", ")}`, ok: false });
      return;
    }

    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          year: parseInt(form.year),
          grade: parseFloat(form.grade),
          referencePriceCents: Math.round(parseFloat(form.referencePriceCents) * 100),
          sharesIssued: parseInt(form.sharesIssued),
          treasuryShares: parseInt(form.treasuryShares),
          prizePoolShares: parseInt(form.prizePoolShares),
          vaulterAllocations: [],
        }),
      });
      let data: Record<string, unknown> = {};
      const text = await res.text();
      try { data = JSON.parse(text); } catch { throw new Error(text.slice(0, 200) || `HTTP ${res.status}`); }
      if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`);
      setCreateMsg({ text: `Card created successfully: ${data.cardId}`, ok: true });
      setForm(f => ({ ...f, title: "", setName: "", certNumber: "", imageUrl: "", referencePriceCents: "" }));
    } catch (e: unknown) {
      setCreateMsg({ text: e instanceof Error ? e.message : "Unknown error", ok: false });
    } finally {
      setCreating(false);
    }
  };

  const issued      = parseInt(form.sharesIssued)    || 0;
  const treasury    = parseInt(form.treasuryShares)  || 0;
  const prizePool   = parseInt(form.prizePoolShares) || 0;
  const circulating = Math.max(0, issued - treasury - prizePool);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 -24px" }}>

      {/* ── HEADER ── */}
      <div style={{
        position: "relative",
        background: "linear-gradient(160deg, #04070d 0%, #090e1c 55%, #07101a 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}>
        {/* Grid texture */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Glows */}
        <div style={{ position: "absolute", top: -60, right: "15%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,77,106,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "30%", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, padding: "28px 36px 24px" }}>
          {/* Single row: back button | icon + title | ADMIN badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Back button */}
            <Link
              href="/market"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
                fontSize: 12, fontWeight: 600, color: "rgba(150,170,200,0.55)",
                textDecoration: "none", padding: "8px 14px", borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = "rgba(220,230,245,0.85)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = "rgba(150,170,200,0.55)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              ← Back to Dashboard
            </Link>

            {/* Separator */}
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

            {/* Icon */}
            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, rgba(255,77,106,0.14), rgba(255,77,106,0.05))", border: "1px solid rgba(255,77,106,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 2px 12px rgba(255,77,106,0.1)" }}>
              ⚙️
            </div>

            {/* Title + subtitle */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1, margin: 0 }}>
                Admin Panel
              </h1>
              <p style={{ fontSize: 12, color: "rgba(150,170,200,0.38)", margin: "4px 0 0", letterSpacing: "0.01em" }}>
                Issue cards · manage withdrawals · configure the exchange
              </p>
            </div>

            {/* ADMIN badge — right */}
            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", padding: "5px 14px", borderRadius: 20, background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.22)", color: "#ff4d6a" }}>
              ⚙ ADMIN
            </span>
          </div>

          {/* Bottom accent line */}
          <div style={{ marginTop: 22, height: 1, background: "linear-gradient(90deg, rgba(255,77,106,0.35), rgba(255,255,255,0.04) 60%, transparent)" }} />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "32px 36px 64px", background: "#06090f" }}>
        {/* Hide native number spinners */}
        <style>{`.no-spinner::-webkit-inner-spin-button,.no-spinner::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.no-spinner{-moz-appearance:textfield}`}</style>

        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* Tab bar */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, gap: 4, marginBottom: 28 }}>
            {(["card", "withdrawals"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 9, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", transition: "all 0.18s", background: tab === t ? "rgba(255,255,255,0.07)" : "transparent", color: tab === t ? "#e8eaf0" : "rgba(120,140,170,0.45)", boxShadow: tab === t ? "0 1px 6px rgba(0,0,0,0.3)" : "none" }}
              >
                {t === "card" ? "✦ Create Card" : "🏦 Withdrawals"}
              </button>
            ))}
          </div>

          {/* ── CREATE CARD ── */}
          {tab === "card" && (
            <div style={{ background: "#080d18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "visible" }}>
              {/* Panel header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10, borderRadius: "18px 18px 0 0" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", flexShrink: 0 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>New Card Issuance</div>
              </div>

              <div style={{ padding: "24px 24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

                {/* IDENTITY */}
                <section>
                  <SectionLabel>IDENTITY</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <TextInp label="TITLE"    value={form.title}   onChange={set("title")}   placeholder="1999 Pokémon Base Set Charizard Holo" />
                    <TextInp label="SET NAME" value={form.setName} onChange={set("setName")} placeholder="Base Set" />
                  </div>
                </section>

                {/* GRADING — 2×2 grid so cert# has full width */}
                <section>
                  <SectionLabel>GRADING</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <NumStepper label="YEAR"  value={form.year}  onChange={set("year")}  min={1990} step={1} />
                    <GraderSelect value={form.grader} onChange={set("grader")} />
                    <NumStepper label="GRADE" value={form.grade} onChange={set("grade")} min={1}    step={0.5} />
                  </div>
                  <TextInp label="CERT NUMBER" value={form.certNumber} onChange={set("certNumber")} placeholder="12345678" />
                </section>

                {/* PRICING & MEDIA */}
                <section>
                  <SectionLabel>PRICING &amp; MEDIA</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <NumStepper label="REFERENCE PRICE ($)" value={form.referencePriceCents} onChange={set("referencePriceCents")} min={0} step={1000} />
                    <TextInp    label="IMAGE URL"           value={form.imageUrl}             onChange={set("imageUrl")}            placeholder="https://images.pokemontcg.io/..." />
                  </div>
                </section>

                {/* SHARE ALLOCATION */}
                <section>
                  <SectionLabel>SHARE ALLOCATION</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <NumStepper label="SHARES ISSUED"   value={form.sharesIssued}    onChange={set("sharesIssued")}    min={0} step={1000} />
                    <NumStepper label="TREASURY SHARES" value={form.treasuryShares}  onChange={set("treasuryShares")}  min={0} step={500} />
                    <NumStepper label="PRIZE POOL"      value={form.prizePoolShares} onChange={set("prizePoolShares")} min={0} step={100} />
                  </div>
                  {/* Live summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[
                      { label: "Issued",      val: issued,      color: "#c9a84c" },
                      { label: "Treasury",    val: treasury,    color: "#a78bfa" },
                      { label: "Prize pool",  val: prizePool,   color: "#00d4a0" },
                      { label: "Circulating", val: circulating, color: "rgba(150,170,200,0.5)" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "9px 12px" }}>
                        <div style={{ fontSize: 10, color: "rgba(120,140,170,0.35)", marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: s.color }}>{s.val.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Status / validation message */}
                {createMsg && (
                  <div style={{ padding: "13px 16px", borderRadius: 10, fontSize: 13, background: createMsg.ok ? "rgba(0,212,160,0.06)" : "rgba(255,77,106,0.06)", border: `1px solid ${createMsg.ok ? "rgba(0,212,160,0.2)" : "rgba(255,77,106,0.2)"}`, color: createMsg.ok ? "#00d4a0" : "#ff4d6a", wordBreak: "break-word" as const, lineHeight: 1.5 }}>
                    {createMsg.text}
                  </div>
                )}

                {/* Submit */}
                <button onClick={createCard} disabled={creating}
                  style={{ padding: "15px 24px", borderRadius: 12, fontSize: 15, fontWeight: 800, border: "none", cursor: creating ? "wait" : "pointer", background: creating ? "rgba(201,168,76,0.35)" : "linear-gradient(135deg, #c9a84c, #8a6020)", color: "#05080f", letterSpacing: "0.02em", boxShadow: creating ? "none" : "0 6px 24px rgba(201,168,76,0.2)", transition: "all 0.15s" }}
                >
                  {creating ? "Creating…" : "✦ Create & Issue Card"}
                </button>
              </div>
            </div>
          )}

          {tab === "withdrawals" && <WithdrawalsList />}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(120,140,170,0.28)", marginBottom: 12 }}>{children}</div>;
}

/* ── Withdrawals panel ── */
function WithdrawalsList() {
  const [requests, setRequests] = useState<
    { id: string; userId: string; amountCents: string; status: string; createdAt: string }[]
  >([]);
  const [loaded, setLoaded]     = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  if (!loaded) {
    fetch("/api/admin/withdrawals").then(r => r.json()).then(setRequests).finally(() => setLoaded(true));
  }

  const approve = async (id: string) => {
    setApproving(id);
    await fetch(`/api/admin/withdrawals/${id}/approve`, { method: "POST" });
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status: "approved" } : r));
    setApproving(null);
  };

  if (!loaded) return <div style={{ textAlign: "center", padding: 40, color: "rgba(120,140,170,0.4)", fontSize: 14 }}>Loading…</div>;

  const pending = requests.filter(r => r.status === "pending").length;

  return (
    <div style={{ background: "#080d18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c" }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>Withdrawal Requests</div>
        </div>
        {pending > 0 && (
          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "#ff4d6a" }}>
            {pending} pending
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, color: "rgba(120,140,170,0.4)" }}>No withdrawal requests</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 100px 90px", padding: "11px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(120,140,170,0.45)" }}>
            <span>DATE</span><span>USER ID</span><span style={{ textAlign: "right" }}>AMOUNT</span><span>STATUS</span><span />
          </div>
          {requests.map((r, i) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 100px 90px", padding: "15px 24px", alignItems: "center", borderBottom: i < requests.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <div style={{ fontSize: 12, color: "rgba(120,140,170,0.45)" }}>{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(180,200,230,0.6)" }}>{r.userId.slice(0, 12)}…</div>
              <div style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>{formatUSD(Number(r.amountCents))}</div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: 5, background: r.status === "approved" ? "rgba(0,212,160,0.08)" : "rgba(201,168,76,0.08)", border: `1px solid ${r.status === "approved" ? "rgba(0,212,160,0.2)" : "rgba(201,168,76,0.2)"}`, color: r.status === "approved" ? "#00d4a0" : "#c9a84c", textTransform: "uppercase" as const }}>
                  {r.status}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                {r.status === "pending" && (
                  <button onClick={() => approve(r.id)} disabled={approving === r.id}
                    style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: "none", cursor: approving === r.id ? "wait" : "pointer", background: approving === r.id ? "rgba(0,212,160,0.2)" : "linear-gradient(135deg, #00d4a0, #009e78)", color: "#05080f", transition: "all 0.15s", boxShadow: "0 3px 10px rgba(0,212,160,0.2)" }}
                  >
                    {approving === r.id ? "…" : "Approve"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
