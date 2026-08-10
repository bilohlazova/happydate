import { SquarePen, X } from "lucide-react";

interface ChatAssistantHeaderProps {
  title: string;
  subtitle: string;
  status: string;
  newConversationLabel: string;
  closeLabel: string;
  onNewConversation: () => void;
  onClose: () => void;
}

export default function ChatAssistantHeader({
  title,
  subtitle,
  status,
  newConversationLabel,
  closeLabel,
  onNewConversation,
  onClose,
}: ChatAssistantHeaderProps) {
  return (
    <header className="happy-chat-header flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/75 px-4 py-3 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="happy-chat-avatar relative flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-1 rounded-full bg-sky-200/70 blur-md" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-white text-sm font-black text-sky-700 shadow-[0_8px_20px_rgba(2,132,199,0.16)]">
            H
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 id="happy-assistant-title" className="truncate text-base font-extrabold text-slate-950">
              {title}
            </h2>
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          </div>
          <p className="truncate text-xs font-semibold text-slate-500">{subtitle}</p>
          <span className="sr-only">{status}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onNewConversation}
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          aria-label={newConversationLabel}
          title={newConversationLabel}
        >
          <SquarePen className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          aria-label={closeLabel}
          title={closeLabel}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
