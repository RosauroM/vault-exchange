"use client";
import { useRef, MouseEvent } from "react";
import Image from "next/image";

interface Props {
  imageUrl: string | null;
  title: string;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export function HoloCard({ imageUrl, title, width = 200, height = 280, className = "", onClick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    const ov = overlayRef.current;
    if (!el || !ov) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -22;
    const ry = ((x / rect.width)  - 0.5) *  22;
    const px = (x / rect.width)  * 100;
    const py = (y / rect.height) * 100;
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.05)`;
    el.style.boxShadow = `0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.15)`;
    ov.style.opacity = "1";
    ov.style.background = `
      radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.18) 0%, transparent 55%),
      linear-gradient(105deg,
        rgba(255,215,0,0.14)  ${px * 0.3}%,
        rgba(255,80,120,0.14) ${px * 0.5}%,
        rgba(80,160,255,0.14) ${px * 0.7}%,
        rgba(0,255,160,0.14)  ${px * 0.9}%
      )
    `;
  };

  const onMouseLeave = () => {
    const el = wrapRef.current;
    const ov = overlayRef.current;
    if (!el || !ov) return;
    el.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)";
    el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.7)";
    ov.style.opacity = "0";
  };

  return (
    <div
      ref={wrapRef}
      className={`holo-card-wrap ${className}`}
      style={{ width, height, cursor: onClick ? "pointer" : "default" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="holo-card-inner" style={{ position: "absolute", inset: 0 }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            style={{ objectFit: "contain", padding: "4px" }}
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted text-xs">No image</div>
        )}
        <div ref={overlayRef} className="holo-overlay" style={{ opacity: 0 }} />
        <div className="holo-sparkle" />
      </div>
    </div>
  );
}
