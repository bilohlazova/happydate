import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

type Locale = "uk" | "pl" | "en" | "de" | "ru";

const COPY = {
  uk: {
    eyebrow: "Майбутній ритуал турботи",
    title: "Одне привітання. Багато близьких голосів.",
    intro: "HappyDate допоможе зібрати короткі відео від рідних і друзів у спільну теплу історію — навіть якщо всі живуть у різних містах і країнах.",
    soonTitle: "Групове повідомлення ще готується",
    soonText: "Завантаження відео, монтаж, оплата й замовлення зараз недоступні. Ми відкриємо сервіс лише після перевірки згоди учасників, приватного доступу та безпечного зберігання файлів.",
    storyTitle: "Як це має відчуватися",
    story: "Не як шаблонна послуга, а як момент присутності: знайомі обличчя, живі голоси та слова, які хочеться зберегти.",
    flowTitle: "Як працюватиме сервіс",
    steps: [
      ["Запросіть близьких", "Створіть приватне запрошення й поясніть, для кого готується сюрприз."],
      ["Зберіть відео", "Кожен учасник сам підтвердить згоду та завантажить короткий фрагмент."],
      ["Складіть історію", "Фрагменти можна буде впорядкувати, доповнити підписами й перевірити перед створенням."],
      ["Поділіться приватно", "Готове повідомлення отримає контрольований доступ і зрозумілий строк зберігання."],
    ],
    trustTitle: "Що має бути готове до запуску",
    trust: ["Явна згода кожного учасника", "Захищене завантаження й приватний доступ", "Модерація та повідомлення про неприйнятний вміст", "Зрозуміле видалення файлів і строк зберігання", "Ліцензована музика та права на матеріали"],
    close: "Тепло — це не кількість ефектів. Це відчуття, що важливі люди поруч.",
  },
  pl: {
    eyebrow: "Przyszły rytuał troski", title: "Jedno życzenie. Wiele bliskich głosów.",
    intro: "HappyDate pomoże połączyć krótkie nagrania rodziny i przyjaciół w jedną ciepłą historię — nawet gdy wszyscy mieszkają daleko od siebie.",
    soonTitle: "Wiadomość grupowa jest jeszcze przygotowywana", soonText: "Przesyłanie filmów, montaż, płatności i zamówienia są obecnie niedostępne. Uruchomimy usługę dopiero po sprawdzeniu zgód, prywatnego dostępu i bezpiecznego przechowywania plików.",
    storyTitle: "Jak powinno to być odczuwane", story: "Nie jak szablonowa usługa, lecz jak chwila obecności: znajome twarze, prawdziwe głosy i słowa, które warto zachować.", flowTitle: "Jak usługa będzie działać",
    steps: [["Zaproś bliskich", "Utwórz prywatne zaproszenie i wyjaśnij, dla kogo powstaje niespodzianka."], ["Zbierz nagrania", "Każdy uczestnik sam potwierdzi zgodę i prześle krótki film."], ["Ułóż historię", "Nagrania będzie można uporządkować, podpisać i sprawdzić przed utworzeniem."], ["Udostępnij prywatnie", "Gotowa wiadomość otrzyma kontrolowany dostęp i jasny czas przechowywania."]],
    trustTitle: "Co musi być gotowe przed startem", trust: ["Wyraźna zgoda każdego uczestnika", "Bezpieczne przesyłanie i prywatny dostęp", "Moderacja i zgłaszanie niewłaściwych treści", "Jasne usuwanie i okres przechowywania", "Licencjonowana muzyka i prawa do materiałów"], close: "Ciepło nie wynika z liczby efektów. To poczucie, że ważni ludzie są blisko.",
  },
  en: {
    eyebrow: "A future care ritual", title: "One greeting. Many familiar voices.", intro: "HappyDate will help bring short videos from family and friends into one warm story — even when everyone lives far apart.", soonTitle: "Group Message is still in preparation", soonText: "Video uploads, editing, payments and orders are not available yet. We will launch only after consent, private access and secure file storage have been thoroughly validated.", storyTitle: "How it should feel", story: "Not like a template service, but a moment of presence: familiar faces, real voices and words worth keeping.", flowTitle: "How it will work", steps: [["Invite loved ones", "Create a private invitation and explain who the surprise is for."], ["Collect videos", "Each participant confirms consent and uploads a short clip."], ["Shape the story", "Arrange, caption and review the clips before creation."], ["Share privately", "The finished message gets controlled access and a clear retention period."]], trustTitle: "What must be ready before launch", trust: ["Explicit consent from every participant", "Secure upload and private access", "Moderation and content reporting", "Clear deletion and retention controls", "Licensed music and media rights"], close: "Warmth is not the number of effects. It is the feeling that important people are close.",
  },
  de: {
    eyebrow: "Ein zukünftiges Fürsorgeritual", title: "Ein Gruß. Viele vertraute Stimmen.", intro: "HappyDate wird kurze Videos von Familie und Freunden zu einer warmen Geschichte verbinden — auch wenn alle weit voneinander entfernt leben.", soonTitle: "Die Gruppennachricht wird noch vorbereitet", soonText: "Video-Uploads, Schnitt, Zahlungen und Bestellungen sind derzeit nicht verfügbar. Der Start erfolgt erst nach Prüfung von Einwilligung, privatem Zugriff und sicherer Speicherung.", storyTitle: "Wie es sich anfühlen soll", story: "Nicht wie ein Standarddienst, sondern wie ein Moment der Nähe: vertraute Gesichter, echte Stimmen und bewahrenswerte Worte.", flowTitle: "So wird es funktionieren", steps: [["Menschen einladen", "Eine private Einladung erstellen und erklären, für wen die Überraschung ist."], ["Videos sammeln", "Jede Person bestätigt selbst die Einwilligung und lädt einen kurzen Clip hoch."], ["Geschichte gestalten", "Clips ordnen, beschriften und vor der Erstellung prüfen."], ["Privat teilen", "Die fertige Nachricht erhält kontrollierten Zugriff und eine klare Speicherfrist."]], trustTitle: "Was vor dem Start bereit sein muss", trust: ["Ausdrückliche Einwilligung aller Beteiligten", "Sicherer Upload und privater Zugriff", "Moderation und Meldung von Inhalten", "Klare Löschung und Speicherfristen", "Lizenzierte Musik und Medienrechte"], close: "Wärme entsteht nicht durch viele Effekte, sondern durch das Gefühl, dass wichtige Menschen nah sind.",
  },
  ru: {
    eyebrow: "Будущий ритуал заботы", title: "Одно поздравление. Много близких голосов.", intro: "HappyDate поможет собрать короткие видео родных и друзей в одну тёплую историю — даже если все живут далеко друг от друга.", soonTitle: "Групповое сообщение ещё готовится", soonText: "Загрузка видео, монтаж, оплата и заказы пока недоступны. Мы запустим сервис только после проверки согласий, приватного доступа и безопасного хранения файлов.", storyTitle: "Каким должен быть этот момент", story: "Не шаблонная услуга, а ощущение присутствия: знакомые лица, живые голоса и слова, которые хочется сохранить.", flowTitle: "Как будет работать сервис", steps: [["Пригласите близких", "Создайте приватное приглашение и объясните, для кого готовится сюрприз."], ["Соберите видео", "Каждый участник сам подтвердит согласие и загрузит короткий фрагмент."], ["Сложите историю", "Фрагменты можно будет упорядочить, подписать и проверить."], ["Поделитесь приватно", "Готовое сообщение получит контролируемый доступ и понятный срок хранения."]], trustTitle: "Что должно быть готово к запуску", trust: ["Явное согласие каждого участника", "Безопасная загрузка и приватный доступ", "Модерация и жалобы на контент", "Понятное удаление и сроки хранения", "Лицензированная музыка и права на материалы"], close: "Тепло — не в количестве эффектов, а в ощущении, что важные люди рядом.",
  },
} satisfies Record<Locale, { eyebrow: string; title: string; intro: string; soonTitle: string; soonText: string; storyTitle: string; story: string; flowTitle: string; steps: string[][]; trustTitle: string; trust: string[]; close: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.groupMessage");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/services/wiadomosc-grupowa" }, robots: { index: true, follow: true } };
}

export default async function GroupMessagePage() {
  const locale = (await getLocale()) as Locale;
  const c = COPY[locale] ?? COPY.uk;
  const common = await getTranslations("static.services.phase3b");
  return (
    <main className="group-preview">
      <section className="group-preview__hero">
        <Link href="/services" className="group-preview__back">← {common("backToServices")}</Link>
        <div className="group-preview__faces" aria-hidden="true"><span>👩🏻</span><span>👨🏽</span><span>👵🏻</span><span>👧🏼</span></div>
        <p className="group-preview__eyebrow">{c.eyebrow}</p>
        <h1>{c.title}</h1><p>{c.intro}</p>
      </section>
      <div className="group-preview__body">
        <ComingSoonNotice
          badge={{ uk: "Скоро", pl: "Wkrótce", en: "Coming soon", de: "Demnächst", ru: "Скоро" }[locale] ?? "Скоро"}
          title={c.soonTitle}
          description={c.soonText}
        />
        <section className="group-preview__story"><span>▶</span><div><h2>{c.storyTitle}</h2><p>{c.story}</p></div></section>
        <section><h2>{c.flowTitle}</h2><div className="group-preview__steps">{c.steps.map(([title, text], i) => <article key={title}><b>{String(i + 1).padStart(2, "0")}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
        <section className="group-preview__trust"><div><span>🛡️</span><h2>{c.trustTitle}</h2></div><ul>{c.trust.map(item => <li key={item}>✓ {item}</li>)}</ul></section>
        <blockquote>“{c.close}”</blockquote>
      </div>
    </main>
  );
}
