import type { GiftWorkspaceViewModel } from "@/lib/gifts/gift.types";
import { MobileUI } from "@/lib/theme/mobile";

interface GiftWorkspacePanelProps {
  workspace: GiftWorkspaceViewModel | null;
  hasError: boolean;
}

export function GiftWorkspacePanel({
  workspace,
  hasError,
}: GiftWorkspacePanelProps) {
  if (hasError) {
    return (
      <section className={`${MobileUI.card} mb-4 border-white/60 bg-white/80 p-4 backdrop-blur`}>
        <p className="text-sm text-slate-600">
          Nie udało się teraz wczytać zapisanych prezentów.
        </p>
      </section>
    );
  }
  if (!workspace) {
    return (
      <section
        aria-label="Ładowanie zapisanych prezentów"
        className={`${MobileUI.card} mb-4 h-20 animate-pulse border-white/60 bg-white/60`}
      />
    );
  }

  return (
    <section className={`${MobileUI.card} mb-4 border-white/60 bg-white/80 p-4 backdrop-blur`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">Twoje prezenty</h2>
          <p className="mt-1 text-sm text-slate-600">
            {workspace.activeIdeas.length
              ? `${workspace.activeIdeas.length} aktywnych pomysłów`
              : "Nie masz jeszcze zapisanych pomysłów."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-amber-50 px-2.5 py-1">
            Pomysły: {workspace.counts.idea}
          </span>
          <span className="rounded-full bg-sky-50 px-2.5 py-1">
            Wybrane: {workspace.counts.selected}
          </span>
          <span className="rounded-full bg-violet-50 px-2.5 py-1">
            Kupione: {workspace.counts.purchased}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1">
            Wręczone: {workspace.counts.given}
          </span>
        </div>
      </div>

      {(workspace.activeIdeas.length > 0 || workspace.history.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <GiftList title="Aktywne pomysły" items={workspace.activeIdeas} />
          <GiftList title="Historia prezentów" items={workspace.history} />
        </div>
      )}

      {(workspace.personIds.length > 0 || workspace.eventIds.length > 0) && (
        <p className="mt-3 text-xs text-slate-500">
          Powiązania: {workspace.personIds.length} osób · {workspace.eventIds.length} wydarzeń
        </p>
      )}
    </section>
  );
}

function GiftList({
  title,
  items,
}: {
  title: string;
  items: GiftWorkspaceViewModel["activeIdeas"];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <ul className="mt-1 space-y-1 text-sm text-slate-700">
        {items.slice(0, 3).map((gift) => (
          <li key={gift.id} className="truncate">• {gift.title}</li>
        ))}
      </ul>
    </div>
  );
}
