export const MobileUI = {
  screen: "min-h-[100dvh] bg-slate-50",
  container: "mx-auto w-full max-w-[430px] px-4 sm:max-w-[520px] sm:px-5",
  contentBottom: "pb-[calc(88px+env(safe-area-inset-bottom))]",
  stack: "flex flex-col gap-3",
  sectionStack: "flex flex-col gap-2.5",

  header: "flex items-end justify-between gap-3",
  title: "text-[2.15rem] font-black leading-none text-slate-950 sm:text-[2.45rem]",
  pageSubtitle: "mt-1.5 text-[0.95rem] font-semibold leading-snug text-slate-500",

  card: "rounded-[1.15rem] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.055)] ring-1 ring-slate-100",
  cardPadding: "px-4 py-3",
  compactCardPadding: "px-3.5 py-3",

  button: "min-h-11 rounded-[0.95rem] px-4 text-sm font-bold transition active:scale-[0.98]",
  iconButton: "flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] transition active:scale-[0.96]",
  input: "h-11 w-full rounded-[0.95rem] border border-slate-100 bg-white px-4 text-[16px] font-semibold text-slate-800 shadow-[0_8px_22px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:ring-4 focus:ring-blue-100",
  chip: "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold",

  character: "h-[100px] w-[100px]",
  characterEyesTop: "top-8",
  characterEyesGap: "gap-6",
  characterMouthTop: "top-[57px]",

  bubblePadding: "p-3",
  bubbleSpacing: "space-y-2",

  sectionTitle: "text-base",
  body: "text-base",
  caption: "text-sm",

  cardIcon: "text-2xl",
  spacing: "space-y-3",
  compactSpacing: "space-y-2.5",
  cardSpacing: "space-y-2",
};
