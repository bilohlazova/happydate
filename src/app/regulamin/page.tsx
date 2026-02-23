// src/app/regulamin/page.tsx
"use client";

export const dynamic = "force-dynamic";

export default function RegulaminPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold mb-6">Regulamin – HappyDate</h1>
      <p className="text-sm text-slate-500 mb-8">Obowiązuje od: 26.10.2025</p>

      <div className="space-y-8 text-sm leading-relaxed">
        {/* 1 */}
        <section>
          <h2 className="font-semibold mb-2">1. Postanowienia ogólne</h2>
          <p>
            Regulamin określa zasady korzystania z platformy{" "}
            <strong>HappyDate</strong>, prowadzonej przez [pełna nazwa firmy,
            adres, NIP]. Platforma umożliwia klientom zamawianie produktów i
            usług od Partnerów współpracujących z HappyDate.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-semibold mb-2">2. Definicje</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Klient</strong> – osoba fizyczna lub firma dokonująca
              zakupu poprzez platformę.
            </li>
            <li>
              <strong>Partner</strong> – podmiot współpracujący z HappyDate,
              oferujący produkty lub usługi.
            </li>
            <li>
              <strong>HappyDate</strong> – właściciel platformy i pośrednik
              między Klientem a Partnerem.
            </li>
            <li>
              <strong>HappyDate Kurier</strong> – usługa dostawy organizowana
              przez HappyDate.
            </li>
          </ul>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-semibold mb-2">3. Zasady korzystania</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Klient korzystając z platformy akceptuje niniejszy Regulamin oraz
              Politykę Prywatności.
            </li>
            <li>
              Zamówienia mogą być składane 24/7, realizacja odbywa się zgodnie z
              dostępnością Partnera.
            </li>
            <li>
              HappyDate zastrzega sobie prawo do weryfikacji i odrzucenia
              zamówienia w przypadku naruszenia zasad bezpieczeństwa lub braku
              dostępności.
            </li>
          </ul>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-semibold mb-2">4. Płatności</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Płatności realizowane są za pośrednictwem operatorów płatności
              (np. Stripe, PayU).
            </li>
            <li>
              HappyDate nie przechowuje danych kart płatniczych Klientów.
            </li>
            <li>
              Klient zobowiązany jest do uiszczenia pełnej kwoty zamówienia
              przed jego realizacją.
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-semibold mb-2">5. Odpowiedzialność</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Za jakość i zgodność produktu odpowiada Partner, który go
              dostarcza.
            </li>
            <li>
              HappyDate odpowiada za obsługę klienta, system płatności oraz
              organizację dostawy HappyDate Kurier.
            </li>
            <li>
              Łączna odpowiedzialność HappyDate ograniczona jest do wartości
              zamówienia.
            </li>
            <li>
              HappyDate nie odpowiada za szkody spowodowane przez siłę wyższą
              (np. warunki pogodowe, awarie systemów).
            </li>
          </ul>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-semibold mb-2">6. Zwroty i reklamacje</h2>
          <p>
            Zasady zwrotów i reklamacji określa odrębny dokument:{" "}
            <a href="/regulamin-zwrotow" className="text-sky-600 underline">
              Regulamin Zwrotów i Reklamacji
            </a>
            .
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="font-semibold mb-2">7. Dane osobowe</h2>
          <p>
            Zasady przetwarzania danych osobowych określa{" "}
            <a href="/privacy" className="text-sky-600 underline">
              Polityka Prywatności
            </a>
            .
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="font-semibold mb-2">8. Postanowienia końcowe</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              HappyDate zastrzega sobie prawo do zmiany Regulaminu. Aktualna
              wersja publikowana jest na stronie.
            </li>
            <li>
              W sprawach nieuregulowanych stosuje się przepisy prawa polskiego,
              w tym Kodeks cywilny i ustawę o prawach konsumenta.
            </li>
            <li>
              Spory będą rozstrzygane przez właściwe sądy powszechne w Polsce.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
