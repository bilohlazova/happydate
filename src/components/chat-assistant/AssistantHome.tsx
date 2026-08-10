import AssistantActions from "./AssistantActions";
import AssistantStatusCard from "./AssistantStatusCard";
import type { AssistantAction } from "./types";
import type { AssistantCardData } from "@/lib/brain/mapInsightToAssistant";

interface AssistantHomeProps {
  greeting: string;
  question: string;
  statusState: AssistantCardData["state"];
  statusTitle: string;
  statusDescription?: string | null;
  statusLoading: boolean;
  statusLoadingLabel: string;
  statusActionLabel?: string | null;
  onStatusAction?: (() => void) | null;
  actionsLabel: string;
  actions: AssistantAction[];
  exiting: boolean;
  onSelectAction: (action: AssistantAction) => void;
}

export default function AssistantHome({
  greeting,
  question,
  statusState,
  statusTitle,
  statusDescription,
  statusLoading,
  statusLoadingLabel,
  statusActionLabel,
  onStatusAction,
  actionsLabel,
  actions,
  exiting,
  onSelectAction,
}: AssistantHomeProps) {
  return (
    <div className={`happy-chat-home__content mx-auto w-full max-w-md py-1 ${exiting ? "motion-safe:animate-[assistant-home-out_.18s_ease-in_both]" : "motion-safe:animate-[assistant-home-in_.24s_ease-out_both]"}`}>
      <div className="mb-4 px-1">
        <p className="text-sm font-bold text-sky-700">{greeting}</p>
        <h3 className="mt-1 text-balance text-[1.65rem] font-black leading-tight tracking-tight text-slate-950">
          {question}
        </h3>
      </div>
      <AssistantStatusCard
        state={statusState}
        title={statusTitle}
        description={statusDescription}
        loading={statusLoading}
        loadingLabel={statusLoadingLabel}
        actionLabel={statusActionLabel}
        onAction={onStatusAction}
      />
      <AssistantActions label={actionsLabel} actions={actions} onSelect={onSelectAction} />
    </div>
  );
}
