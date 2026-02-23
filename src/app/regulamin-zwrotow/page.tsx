// src/app/regulamin-zwrotow/page.tsx
"use client";

export const dynamic = "force-dynamic";

export default function RegulaminZwrotow() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold mb-6">
        Regulamin Zwrotów i Reklamacji – HappyDate
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        Obowiązuje od: 26.10.2025
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        {/* 1 */}
        <section>
          <h2 className="font-semibold mb-2">1. Postanowienia ogólne</h2>
          <p>
            Niniejszy regulamin określa zasady dokonywania zwrotów i reklamacji
            w serwisie <strong>HappyDate</strong>. Składając zamówienie klient
            akceptuje warunki niniejszego regulaminu. HappyDate działa jako
            pośrednik pomiędzy klientem a Partnerem, chyba że wprost wskazano
            inaczej.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-semibold mb-2">2. Odpowiedzialność stron</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>HappyDate</strong> odpowiada za obsługę klienta,
              przyjęcie reklamacji, organizację dostawy (HappyDate Kurier) oraz
              rozliczenia.
            </li>
            <li>
              <strong>Partner</strong> ponosi pełną odpowiedzialność za jakość,
              zgodność i kompletność towaru, a w przypadku uznanej reklamacji
              jakościowej pokrywa koszt ponownej realizacji lub zwrotu wartości
              produktu.
            </li>
            <li>
              <strong>HappyDate Kurier</strong> odpowiada za terminowe i
              prawidłowe doręczenie, a w przypadku uszkodzeń zobowiązany jest do
              rekompensaty w zakresie kosztu dostawy.
            </li>
          </ul>
          <p className="mt-2">
            Łączna odpowiedzialność HappyDate wobec klienta jest ograniczona do
            wartości złożonego zamówienia.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-semibold mb-2">3. Zwroty</h2>
          <p>
            Zgodnie z art. 38 ustawy o prawach konsumenta, prawo odstąpienia od
            umowy w ciągu 14 dni nie przysługuje w przypadku:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>produktów szybko psujących się (np. kwiaty, ciasta, żywność),</li>
            <li>
              usług świadczonych w określonym terminie (np. animacje, dostawy o
              ustalonej godzinie).
            </li>
          </ul>
          <p className="mt-2">
            Zwroty są możliwe wyłącznie w odniesieniu do produktów trwałych
            (np. prezenty handmade), pod warunkiem że nie były używane i
            posiadają oryginalne opakowanie. Koszt odesłania ponosi klient, chyba
            że zwrot wynika z winy Partnera.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-semibold mb-2">4. Reklamacje jakościowe</h2>
          <p>Klient może zgłosić reklamację, jeśli:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>produkt jest niezgodny z opisem lub zdjęciem,</li>
            <li>dostarczono towar uszkodzony,</li>
            <li>jakość produktu nie spełnia standardów (np. zwiędłe kwiaty).</li>
          </ul>
          <p className="mt-2">
            Reklamacja musi zostać zgłoszona w ciągu 24 godzin od dostawy. Po
            tym terminie reklamacje mogą zostać odrzucone. Partner zobowiązuje
            się do ponownej realizacji lub pokrycia kosztu produktu. HappyDate
            zastrzega sobie prawo do odmowy zwrotu, jeśli reklamacja jest
            bezzasadna.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-semibold mb-2">5. Reklamacje logistyczne</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Opóźnienie z winy HappyDate Kurier – zwrot kosztu dostawy, bez
              zwrotu ceny produktu.
            </li>
            <li>
              Opóźnienie z winy Partnera – Partner może zostać obciążony kosztami
              rekompensaty dla klienta.
            </li>
            <li>
              Błąd klienta (np. zły adres, brak odbiorcy) – ponowna dostawa
              płatna w 100%, o ile klient wyrazi chęć ponownej realizacji.
            </li>
          </ul>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-semibold mb-2">6. Procedura reklamacyjna</h2>
          <p>
            Reklamacje należy zgłaszać w ciągu 24 godzin od doręczenia poprzez:
            aplikację HappyDate, adres e-mail reklamacje@happydate.pl lub
            infolinię. HappyDate rozpatruje reklamację w ciągu 48 godzin
            roboczych.
          </p>
          <p className="mt-2">
            Reklamacje muszą być udokumentowane (np. zdjęcie produktu). Brak
            dowodów może skutkować odrzuceniem reklamacji.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="font-semibold mb-2">7. Zwroty płatności</h2>
          <p>
            Zwroty realizowane są tą samą metodą płatności, w terminie do 14 dni
            roboczych od uznania reklamacji. Zwrot nie obejmuje kosztów usług
            dodatkowych (np. personalizacji, nocnej dostawy), chyba że wada
            dotyczy bezpośrednio tych usług.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="font-semibold mb-2">8. Wyłączenia odpowiedzialności</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              HappyDate nie ponosi odpowiedzialności za opóźnienia wynikające z
              działania siły wyższej (np. warunki pogodowe, awarie systemów).
            </li>
            <li>
              HappyDate nie odpowiada za indywidualne preferencje klienta (np.
              kolor, kształt, smak), jeśli produkt odpowiada ogólnemu opisowi.
            </li>
            <li>
              HappyDate nie odpowiada za usługi świadczone przez Partnera poza
              platformą.
            </li>
          </ul>
        </section>

        {/* 9 */}
        <section>
          <h2 className="font-semibold mb-2">9. Postanowienia końcowe</h2>
          <p>
            HappyDate zastrzega sobie prawo do modyfikacji niniejszego regulaminu.
            Aktualna wersja dostępna jest zawsze na stronie internetowej. W
            sprawach nieuregulowanych stosuje się przepisy prawa polskiego.
          </p>
        </section>
      </div>
    </main>
  );
}
