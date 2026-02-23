"use client";

type PowiadomModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
};

export function PowiadomModal({
  open,
  onClose,
  title,
  description,
}: PowiadomModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="mb-2 text-2xl font-bold">
          {title}
        </h2>

        <p className="mb-4 text-gray-600">
          {description}
        </p>

        <input
          type="email"
          placeholder="Twój email"
          className="mb-4 w-full rounded-xl border px-4 py-3"
        />

        <button
          className="w-full rounded-xl bg-pink-500 py-3 font-semibold text-white hover:bg-pink-600"
        >
          Powiadom mnie
        </button>

        <p className="mt-3 text-center text-xs text-gray-400">
          Bez spamu. Jedno powiadomienie 💗
        </p>
      </div>
    </div>
  );
}
