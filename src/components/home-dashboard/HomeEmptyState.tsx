import Link from "next/link";

export default function HomeEmptyState({ title, description, addPerson, addEvent }: { title: string; description: string; addPerson: string; addEvent: string }) {
  return <section className="mt-7 rounded-[1.5rem] border border-dashed border-sky-200 bg-gradient-to-br from-white to-sky-50 p-6 text-center"><span className="text-3xl" aria-hidden="true">💙</span><h2 className="mt-3 text-lg font-black text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">{description}</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><Link href="/people/add" className="hd-button hd-button-primary min-h-11">{addPerson}</Link><Link href="/dashboard" className="hd-button min-h-11 border border-sky-200 bg-white text-sky-700">{addEvent}</Link></div></section>;
}
