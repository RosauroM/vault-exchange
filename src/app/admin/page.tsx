"use client";
import { useState } from "react";
import { formatUSD } from "@/lib/format";

export default function AdminPage() {
  const [tab, setTab] = useState<"card" | "withdrawals">("card");

  // Card creation form
  const [form, setForm] = useState({
    title: "", setName: "", year: "1999", grader: "PSA", grade: "10",
    certNumber: "", imageUrl: "", referencePriceCents: "", sharesIssued: "10000",
    treasuryShares: "5000", prizePoolShares: "500",
  });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const createCard = async () => {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateMsg({ text: `Card created: ${data.cardId}`, ok: true });
    } catch (e: unknown) {
      setCreateMsg({ text: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setCreating(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-muted block mb-1">{label}</label>
      <input
        className="exchange-input"
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Admin Panel</h1>

      <div className="flex gap-2">
        {(["card", "withdrawals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === t ? "bg-[#1e2a3a] text-white" : "text-muted hover:text-white"
            }`}
          >
            {t === "card" ? "Create Card" : "Withdrawals"}
          </button>
        ))}
      </div>

      {tab === "card" && (
        <div className="exchange-card p-6 flex flex-col gap-4">
          <div className="text-sm font-semibold text-white mb-2">New Card Issuance</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Title", "title", "text", "1999 Pokémon Base Set Charizard Holo")}
            {field("Set name", "setName", "text", "Base Set")}
            {field("Year", "year", "number", "1999")}
            <div>
              <label className="text-xs text-muted block mb-1">Grader</label>
              <select
                className="exchange-input"
                value={form.grader}
                onChange={(e) => setForm((f) => ({ ...f, grader: e.target.value }))}
              >
                <option>PSA</option><option>BGS</option><option>CGC</option>
              </select>
            </div>
            {field("Grade", "grade", "number", "10")}
            {field("Cert number", "certNumber", "text", "12345678")}
            {field("Image URL", "imageUrl", "text", "https://...")}
            {field("Reference price ($)", "referencePriceCents", "number", "500000")}
            {field("Shares issued", "sharesIssued", "number", "10000")}
            {field("Treasury shares", "treasuryShares", "number", "5000")}
            {field("Prize pool shares", "prizePoolShares", "number", "500")}
          </div>

          {createMsg && (
            <div
              className="text-sm rounded p-3"
              style={{ background: createMsg.ok ? "rgba(0,212,160,0.1)" : "rgba(255,77,106,0.1)", color: createMsg.ok ? "#00d4a0" : "#ff4d6a" }}
            >
              {createMsg.text}
            </div>
          )}

          <button className="btn-primary" onClick={createCard} disabled={creating}>
            {creating ? "Creating..." : "Create & Issue Card"}
          </button>
        </div>
      )}

      {tab === "withdrawals" && <WithdrawalsList />}
    </div>
  );
}

function WithdrawalsList() {
  const [requests, setRequests] = useState<{ id: string; userId: string; amountCents: string; status: string; createdAt: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  if (!loaded) {
    fetch("/api/admin/withdrawals").then((r) => r.json()).then(setRequests).finally(() => setLoaded(true));
  }

  const approve = async (id: string) => {
    setApproving(id);
    await fetch(`/api/admin/withdrawals/${id}/approve`, { method: "POST" });
    setRequests((rs) => rs.map((r) => r.id === id ? { ...r, status: "approved" } : r));
    setApproving(null);
  };

  if (!loaded) return <div className="text-muted text-sm">Loading...</div>;

  return (
    <div className="exchange-card overflow-hidden">
      {requests.length === 0 ? (
        <div className="p-6 text-muted text-sm text-center">No withdrawal requests.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted border-b" style={{ borderColor: "#1e2a3a" }}>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">User</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b" style={{ borderColor: "#1e2a3a" }}>
                <td className="px-4 py-3 text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs text-white font-mono">{r.userId.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-right text-xs font-mono text-white">{formatUSD(Number(r.amountCents))}</td>
                <td className="px-4 py-3 text-xs capitalize" style={{ color: r.status === "approved" ? "#00d4a0" : "#c9a84c" }}>
                  {r.status}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "pending" && (
                    <button
                      className="text-xs btn-primary px-3 py-1"
                      onClick={() => approve(r.id)}
                      disabled={approving === r.id}
                    >
                      {approving === r.id ? "..." : "Approve"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
