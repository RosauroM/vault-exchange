export default function Loading() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#05080f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 28, zIndex: 50,
    }}>
      {/* Orbit rings + card */}
      <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Outer spinning ring */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: "1px solid transparent",
          borderTopColor: "rgba(201,168,76,0.6)",
          borderRightColor: "rgba(201,168,76,0.2)",
          animation: "spinRingOuter 1.2s linear infinite",
        }} />

        {/* Inner spinning ring */}
        <div style={{
          position: "absolute", inset: 10,
          borderRadius: "50%",
          border: "1px solid transparent",
          borderTopColor: "rgba(0,212,160,0.5)",
          borderLeftColor: "rgba(0,212,160,0.15)",
          animation: "spinRingInner 0.8s linear infinite reverse",
        }} />

        {/* Glow backdrop */}
        <div style={{
          position: "absolute", inset: 20,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)",
          animation: "glowPulse 2s ease-in-out infinite",
        }} />

        {/* Card */}
        <div style={{
          width: 52, height: 72,
          borderRadius: 6,
          background: "linear-gradient(160deg, #18120a 0%, #1a1408 100%)",
          border: "1px solid rgba(201,168,76,0.45)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 28px rgba(0,0,0,0.8), 0 0 24px rgba(201,168,76,0.12)",
          animation: "cardFloat 3s ease-in-out infinite",
          position: "relative", zIndex: 1,
        }}>
          {/* Top band */}
          <div style={{
            height: 12,
            background: "linear-gradient(90deg, #7a5a10, #c9a84c, #7a5a10)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 5, fontWeight: 900, letterSpacing: "0.2em", color: "#05080f" }}>✦ VAULT ✦</span>
          </div>
          {/* Center icon */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{
              fontSize: 22, color: "#c9a84c",
              animation: "iconSpin 4s linear infinite",
              display: "inline-block",
              filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))",
            }}>✦</span>
          </div>
          {/* Bottom band */}
          <div style={{
            height: 12,
            background: "rgba(0,0,0,0.5)",
            borderTop: "1px dashed rgba(201,168,76,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 5, color: "rgba(201,168,76,0.35)", letterSpacing: "0.15em" }}>VAULT</span>
          </div>
        </div>
      </div>

      {/* Text + dots */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: "0.3em",
          background: "linear-gradient(90deg, #c9a84c 0%, #f5e070 50%, #c9a84c 100%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "shimmerText 1.8s linear infinite",
        }}>
          LOADING
        </div>

        {/* Animated dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 5, height: 5, borderRadius: "50%",
                background: i === 0 ? "#c9a84c" : i === 1 ? "#00d4a0" : "#a78bfa",
                animation: `dotBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spinRingOuter {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spinRingInner {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px);    }
          50%       { transform: translateY(-6px);   }
        }
        @keyframes iconSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0);    opacity: 0.35; }
          40%       { transform: translateY(-6px); opacity: 1;    }
        }
        @keyframes shimmerText {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
