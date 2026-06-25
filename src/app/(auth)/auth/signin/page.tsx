"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("nodemailer", { email, redirect: false, callbackUrl: "/market" });
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#070b14" }}>
      <div className="exchange-card p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-gold mb-2">⬡ VAULT</div>
          <div className="text-muted text-sm">Fractional card exchange</div>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-2xl mb-3">📬</div>
            <div className="text-white font-semibold mb-2">Check your email</div>
            <div className="text-muted text-sm">We sent a magic link to <strong>{email}</strong></div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Email address</label>
              <input
                className="exchange-input"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
