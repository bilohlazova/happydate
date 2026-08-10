import { ArrowUp } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";

interface ChatComposerProps {
  value: string;
  placeholder: string;
  messageLabel: string;
  sendLabel: string;
  keyboardHint: string;
  disabled: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}

export default function ChatComposer({
  value,
  placeholder,
  messageLabel,
  sendLabel,
  keyboardHint,
  disabled,
  textareaRef,
  onChange,
  onKeyDown,
  onSend,
}: ChatComposerProps) {
  return (
    <footer className="happy-chat-composer shrink-0 border-t border-slate-200/70 bg-white/85 px-3 pt-3 backdrop-blur-xl sm:px-4">
      <div className="happy-chat-composer__field flex items-end gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-inner focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder}
          aria-label={messageLabel}
          className="max-h-[120px] min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-[0_8px_18px_rgba(2,132,199,0.24)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
          aria-label={sendLabel}
          title={sendLabel}
        >
          <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p className="px-2 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-1.5 text-[11px] text-slate-400">
        {keyboardHint}
      </p>
    </footer>
  );
}
