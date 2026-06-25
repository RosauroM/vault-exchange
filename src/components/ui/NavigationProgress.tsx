"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname             = usePathname();
  const prevPathname         = useRef<string | null>(null);
  const timers               = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [width, setWidth]    = useState(0);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Skip very first mount — we don't want a bar on initial page load
    if (prevPathname.current === null) {
      prevPathname.current = pathname;
      return;
    }
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    // Cancel any in-flight animation
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const push = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
      return t;
    };

    // Reset → show → run to 100% → fade out
    setWidth(0);
    setOpacity(1);
    push(() => setWidth(35),  10);
    push(() => setWidth(65),  300);
    push(() => setWidth(85),  650);
    push(() => setWidth(100), 950);
    push(() => setOpacity(0), 1200);
    push(() => setWidth(0),   1700);

    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <>
      {/* Progress bar */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", top: 0, left: 0, right: 0,
          height: 2.5, zIndex: 99999,
          opacity,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: "linear-gradient(90deg, #c9a84c 0%, #f5e070 50%, #c9a84c 100%)",
            backgroundSize: "200% 100%",
            animation: "navProgress 1.2s linear infinite",
            transition: width === 0 ? "none" : "width 0.4s cubic-bezier(0.25,0.1,0.25,1)",
            boxShadow: "0 0 14px rgba(201,168,76,0.9), 0 0 6px rgba(240,208,112,0.6)",
            borderRadius: "0 2px 2px 0",
          }}
        />
        {/* Trailing glow dot */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: `${width}%`,
            width: 5, height: 5,
            borderRadius: "50%",
            background: "#f5e070",
            boxShadow: "0 0 10px 3px rgba(245,224,112,0.8)",
            transition: width === 0 ? "none" : "left 0.4s cubic-bezier(0.25,0.1,0.25,1)",
            opacity: opacity,
          }}
        />
      </div>

      <style>{`
        @keyframes navProgress {
          0%   { background-position: 0% center }
          100% { background-position: 200% center }
        }
      `}</style>
    </>
  );
}
