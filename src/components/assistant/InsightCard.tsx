"use client";

import type { AssistantCardData } from "@/lib/brain/mapInsightToAssistant";

interface Props {
  data: AssistantCardData;
}

export default function InsightCard({ data }: Props) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: 20,
        border: "1px solid #E8E8E8",
        boxShadow: "0 10px 30px rgba(0,0,0,.05)",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "#888",
          marginBottom: 8,
        }}
      >
        HappyDate AI
      </p>

      <div
        style={{
          fontSize: 34,
          marginBottom: 10,
        }}
      >
        {data.icon}
      </div>

      <h2
        style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {data.title}
      </h2>

      <p
        style={{
          marginTop: 12,
          color: "#555",
          lineHeight: 1.6,
        }}
      >
        {data.description}
      </p>

      {data.actionLabel && (
        <button
          style={{
            marginTop: 18,
            padding: "12px 18px",
            borderRadius: 12,
            border: "none",
            background: "#3a9bd5",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {data.actionLabel}
        </button>
      )}
    </div>
  );
}