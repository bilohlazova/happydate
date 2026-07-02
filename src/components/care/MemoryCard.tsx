"use client";

export default function MemoryCard() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: 20,
        border: "1px solid #ECECEC",
      }}
    >
      <div
        style={{
          fontSize: 28,
          marginBottom: 10,
        }}
      >
        🌷
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: 18,
        }}
      >
        Минулого року...
      </h3>

      <p
        style={{
          marginTop: 10,
          color: "#666",
          lineHeight: 1.6,
        }}
      >
        Тут Brain буде показувати історію ваших стосунків.
      </p>
    </div>
  );
}