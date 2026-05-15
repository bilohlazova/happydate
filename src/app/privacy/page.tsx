// src/app/privacy/page.tsx
"use client";

export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold mb-6">Polityka Prywatności – HappyDate</h1>
      <p className="text-sm text-slate-500 mb-8">Obowiązuje od: 26.10.2025</p>

      <div className="space-y-8 text-sm leading-relaxed">
        {/* 1 */}
        <section>
          <h2 className="font-semibold mb-2">1. Administrator danych</h2>
          <p>
            Administratorem danych osobowych jest <strong>HappyDate</strong>, 
            prowadzony przez [pełna nazwa firmy, adres, NIP]. 
            Z administratorem można się skontaktować poprzez adres e-mail: 
            <a href="mailto:privacy@happydate.pl" className="text-sky-600 underline"> privacy@happydate.pl</a>.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-semibold mb-2">2. Jakie dane przetwarzamy</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Dane identyfikacyjne: imię, nazwisko, nazwa firmy.</li>
            <li>Dane kontaktowe: adres e-mail, numer telefonu, adres dostawy.</li>
            <li>Dane płatnicze: numer transakcji, metoda płatności (bez danych kart).</li>
            <li>Dane techniczne: adres IP, pliki cookies, dane o urządzeniu.</li>
          </ul>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-semibold mb-2">3. Cele i podstawy prawne przetwarzania</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Realizacja zamówień – art. 6 ust. 1 lit. b RODO (umowa).</li>
            <li>Rozliczenia i podatki – art. 6 ust. 1 lit. c RODO (obowiązek prawny).</li>
            <li>Marketing i personalizacja ofert – art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes).</li>
            <li>Wysyłka newslettera – art. 6 ust. 1 lit. a RODO (zgoda).</li>
          </ul>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-semibold mb-2">4. Odbiorcy danych</h2>
          <p>Dane mogą być przekazywane:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Partnerom realizującym zamówienia (np. kwiaciarnie, cukiernie).</li>
            <li>Firmom kurierskim i dostawczym.</li>
            <li>Operatorom płatności (np. Stripe, PayU).</li>
            <li>Dostawcom usług IT (hosting, e-mail, analityka).</li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-semibold mb-2">5. Okres przechowywania danych</h2>
          <p>
            Dane przechowywane są przez okres niezbędny do realizacji celów:  
            <br />– dane transakcyjne – do 6 lat (wymogi podatkowe),  
            <br />– dane marketingowe – do czasu wycofania zgody,  
            <br />– dane techniczne (cookies) – zgodnie z ustawieniami przeglądarki.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-semibold mb-2">6. Prawa użytkownika</h2>
          <p>Każdy użytkownik ma prawo do:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>dostępu do swoich danych,</li>
            <li>sprostowania danych,</li>
            <li>usunięcia danych („prawo do bycia zapomnianym”),</li>
            <li>ograniczenia przetwarzania,</li>
            <li>przenoszenia danych,</li>
            <li>wniesienia sprzeciwu wobec przetwarzania danych,</li>
            <li>złożenia skargi do Prezesa UODO.</li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="font-semibold mb-2">7. Pliki cookies</h2>
          <p>
            Serwis wykorzystuje pliki cookies w celu zapewnienia prawidłowego działania,
            analizy ruchu oraz marketingu. Użytkownik może zmienić ustawienia cookies 
            w swojej przeglądarce.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="font-semibold mb-2">8. Bezpieczeństwo danych</h2>
          <p>
            HappyDate stosuje środki techniczne i organizacyjne zapewniające ochronę danych,
            w tym szyfrowanie SSL, zabezpieczenia serwerów oraz ograniczony dostęp do danych.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="font-semibold mb-2">9. Postanowienia końcowe</h2>
          <p>
            HappyDate zastrzega sobie prawo do wprowadzania zmian w Polityce Prywatności. 
            Aktualna wersja dokumentu jest dostępna na stronie internetowej. 
            W sprawach nieuregulowanych zastosowanie mają przepisy prawa polskiego oraz RODO.
          </p>
        </section>
      </div>
    </main>
  );
}
