export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#070b14" }}>
      <div className="exchange-card p-8 w-full max-w-sm text-center">
        <div className="text-3xl mb-3">📬</div>
        <div className="text-white font-semibold mb-2">Check your email</div>
        <div className="text-muted text-sm">A magic link was sent. Click it to sign in.</div>
      </div>
    </div>
  );
}
