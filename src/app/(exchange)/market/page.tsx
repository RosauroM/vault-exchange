"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatUSD, formatChange } from "@/lib/format";

interface CardRow {
  id: string;
  title: string;
  setName: string;
  year: number;
  grader: string;
  grade: number;
  imageUrl: string | null;
  referencePriceCents: number;
  sharesIssued: number;
  lastPriceCents: number;
  change24h: number;
  lastTradeAt: string | null;
}

export default function MarketPage() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCards = () =>
    fetch("/api/cards")
      .then((r) => r.json())
      .then(setCards)
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchCards();
    const interval = setInterval(fetchCards, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = cards.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.setName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Market</h1>
          <p className="text-muted text-sm mt-1">Fractional shares of vaulted PSA-graded cards</p>
        </div>
        <input
          className="exchange-input"
          style={{ width: 240 }}
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading market...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted text-sm">No cards found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((card) => (
            <Link key={card.id} href={`/cards/${card.id}`}>
              <div className="exchange-card p-4 hover:border-[#2e3d55] transition-colors cursor-pointer h-full flex flex-col">
                {/* Card image */}
                <div
                  className="relative rounded overflow-hidden mb-3 flex items-center justify-center"
                  style={{ height: 160, background: "#0d1321" }}
                >
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.title}
                      fill
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  ) : (
                    <div className="text-muted text-xs">No image</div>
                  )}
                </div>

                {/* Grade badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: "#1e2a3a", color: "#c9a84c" }}
                  >
                    {card.grader} {card.grade}
                  </span>
                  <span className="text-xs text-muted">{card.year}</span>
                </div>

                <div className="text-sm font-semibold text-white leading-snug mb-3 flex-1">
                  {card.title}
                </div>

                {/* Price row */}
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <div className="text-xs text-muted mb-0.5">Price / share</div>
                    <div className="text-base font-bold text-white">
                      {formatUSD(card.lastPriceCents)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold ${card.change24h >= 0 ? "text-up" : "text-down"}`}
                    >
                      {formatChange(card.change24h)}
                    </div>
                    <div className="text-xs text-muted">24h</div>
                  </div>
                </div>

                <div className="mt-2 pt-2" style={{ borderTop: "1px solid #1e2a3a" }}>
                  <div className="flex justify-between text-xs text-muted">
                    <span>Mkt cap</span>
                    <span className="text-white">{formatUSD(card.lastPriceCents * card.sharesIssued)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
