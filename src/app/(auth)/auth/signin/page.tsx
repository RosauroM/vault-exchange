"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";

const PREVIEW_CARDS = [
  { src: "https://images.pokemontcg.io/base1/4_hires.png",   label: "Charizard PSA 10",     delay: 0 },
  { src: "https://images.pokemontcg.io/ecard3/146_hires.png", label: "Crystal Charizard",    delay: 1.5 },
  { src: "https://images.pokemontcg.io/pl3/96_hires.png",    label: "Arceus LV.X",          delay: 3 },
];

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
    <div
      className="min-h-screen flex items-center justify-center px-4 overflow-hidden relative"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0e1a2e 0%, #05080f 60%)" }}
    >
      {/* Floating card backgrounds */}
      {PREVIEW_CARDS.map((card, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 130,
            height: 182,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
            opacity: 0.25,
            animation: `floatCard 6s ease-in-out ${card.delay}s infinite`,
            left: i === 0 ? "8%" : i === 1 ? "78%" : "88%",
            top: i === 0 ? "20%" : i === 1 ? "12%" : "55%",
            transform: `rotate(${i % 2 === 0 ? -8 : 8}deg)`,
            pointerEvents: "none",
          }}
        >
          <Image src={card.src} alt={card.label} fill style={{ objectFit: "contain" }} unoptimized />
        </div>
      ))}

      {/* Glow orbs */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", top: "10%", left: "20%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,160,0.04) 0%, transparent 70%)", bottom: "15%", right: "20%", pointerEvents: "none" }} />

      {/* Sign-in card */}
      <div
        className="w-full max-w-sm animate-slide-up"
        style={{
          background: "rgba(14,20,32,0.85)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 20,
          padding: "40px 36px",
          backdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.05)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, #c9a84c, #8a6020)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(201,168,76,0.35)",
            }}
          >
            ⬡
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #c9a84c 0%, #e8c76d 60%, #f0d070 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            VAULT
          </div>
          <div style={{ color: "#5a6a88", fontSize: 13, marginTop: 6 }}>
            Trade fractional shares of graded Pokémon cards
          </div>
        </div>

        {sent ? (
          <div className="text-center animate-fade-in">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
            <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check your inbox</div>
            <div style={{ color: "#5a6a88", fontSize: 13 }}>
              Magic link sent to <span style={{ color: "#c9a84c" }}>{email}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: 12, color: "#5a6a88", display: "block", marginBottom: 6, fontWeight: 600, letterSpacing: "0.04em" }}>
                EMAIL ADDRESS
              </label>
              <input
                className="exchange-input"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ fontSize: 15 }}
              />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={loading} style={{ padding: "13px 20px", fontSize: 15, marginTop: 4 }}>
              {loading ? "Sending…" : "Send magic link →"}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <hr className="divider flex-1" />
          <span style={{ color: "#5a6a88", fontSize: 11, whiteSpace: "nowrap" }}>or</span>
          <hr className="divider flex-1" />
        </div>

        {/* Dev login */}
        <a
          href="/api/dev-login"
          style={{
            display: "block",
            textAlign: "center",
            fontSize: 12,
            color: "#5a6a88",
            padding: "10px",
            border: "1px dashed #1a2535",
            borderRadius: 8,
            transition: "all 0.15s",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#c9a84c"; (e.target as HTMLElement).style.borderColor = "rgba(201,168,76,0.3)"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#5a6a88"; (e.target as HTMLElement).style.borderColor = "#1a2535"; }}
        >
          ⚡ Dev login (admin)
        </a>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#3a4a60" }}>
          By signing in you agree to our Terms of Service
        </div>
      </div>
    </div>
  );
}
