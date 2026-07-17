export default function HomeErrorState({ title, description, retry, onRetry }: { title: string; description: string; retry: string; onRetry: () => void }) {
  return <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm" role="alert"><p className="font-extrabold text-rose-800">{title}</p><p className="mt-1 text-rose-700">{description}</p><button type="button" onClick={onRetry} className="mt-2 font-extrabold text-rose-800 underline underline-offset-2">{retry}</button></div>;
}
