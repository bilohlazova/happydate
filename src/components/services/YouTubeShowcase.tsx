"use client";

import { useState } from "react";

const VIDEOS = [
  {
    id: "4jwYAuj8QO4",
    title: "Pomoc dla zwierząt",
    emoji: "🐾",
    desc: "Wspieramy lokalne schroniska — odwiedzamy, karmimy, kochamy.",
  },
  {
    id: "TbSiXeDoo1A",
    title: "Wizyta w domu dziecka",
    emoji: "👧",
    desc: "Dajemy dzieciom uwagę, czas i prezenty — tworzymy wspomnienia.",
  },
  {
    id: "3VnezHfE5iQ",
    title: "Akcja ekologiczna",
    emoji: "🌿",
    desc: "Sprzątamy lasy, sadzimy rośliny, edukujemy — razem dla natury.",
  },
];

function VideoCard({ id, title, emoji, desc }: typeof VIDEOS[0]) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      border: "1.5px solid #ede9f8",
    }}>
      {/* Thumbnail або iframe */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
        {playing ? (
          <iframe
            style={{ width: "100%", height: "100%", border: "none" }}
            src={`https://www.youtube.com/embed/${id}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="lazy"
            />
            {/* Overlay з кнопкою play */}
            <button
              onClick={() => setPlaying(true)}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,.35)",
                border: "none", cursor: "pointer",
              }}
              aria-label={`Odtwórz: ${title}`}
            >
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(255,255,255,.92)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* Play triangle */}
                <div style={{
                  width: 0, height: 0,
                  borderTop: "10px solid transparent",
                  borderBottom: "10px solid transparent",
                  borderLeft: "18px solid #e53e3e",
                  marginLeft: 4,
                }} />
              </div>
            </button>
          </>
        )}
      </div>

      {/* Підпис */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1040", marginBottom: 4 }}>
          {emoji} {title}
        </div>
        <div style={{ fontSize: 12, color: "#7c6f9f", lineHeight: 1.4 }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

export default function YouTubeShowcase() {
  return (
    <section style={{ background: "#f8f7ff", padding: "24px 16px" }}>
      <h3 style={{
        fontSize: 18, fontWeight: 800, color: "#1a1040",
        textAlign: "center", marginBottom: 16,
      }}>
        Zobacz, jak pomagamy 💛
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto" }}>
        {VIDEOS.map(v => <VideoCard key={v.id} {...v} />)}
      </div>
    </section>
  );
}