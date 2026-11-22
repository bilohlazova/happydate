# Перевірка HappyBot на телефоні (без production)

**Production — NO-GO.** Мобільний застосунок (Capacitor) завантажує `https://happydate.vercel.app`, тобто production, тому «просто відкрити застосунок» означало б публікацію. Безпечний шлях — запустити цю гілку **локально на вашому Mac проти staging Supabase** і відкрити її з телефону.

Чому не Vercel Preview: на Preview AI дозволено лише в «hosted smoke session» (ліміт 8 викликів, власний Redis, owner-налаштування). Один хід HappyBot з підбором подарунків — це 3–5 викликів, тож preview не підходить для повної перевірки. Локальний запуск (не Vercel) використовує звичайні SEC-01 ліміти з in-memory бюджетом.

## 0. Одноразово: міграція на staging
Застосувати `supabase/migrations/20261122120000_create_happy_conversation_memory.sql` до **staging** (`happydate-staging`, ref `xgelazzdgluuenqkymox`), НЕ до prod. Без неї пам'ять розмов і «показані ідеї» мовчки не працюють (чат при цьому відповідає).

## Xcode одним скриптом (рекомендовано)
Після кроку 0 (міграція на staging) достатньо:
```bash
bash ~/Desktop/toto/_happybot-integration/xcode-test.sh                      # iOS Simulator
bash ~/Desktop/toto/_happybot-integration/xcode-test.sh http://<IP Mac>:3000  # фізичний iPhone
```
Скрипт сам бере гілку з bundle в окремий worktree `../toto-happybot`, ставить залежності, створює `.env.local` для STAGING (просить вставити 2 ключі), тимчасово патчить `capacitor.config.ts` (і `next.config.ts` для iPhone по Wi-Fi) **лише в цьому worktree**, робить `cap sync ios` і відкриває Xcode. Production-конфіг у репозиторії лишається незмінним (його стереже тест `native-release-hardening`). Прибрати патчі: `xcode-test.sh --revert`.
iOS: HTTP до `localhost` та IP-адрес дозволений ATS без змін Info.plist.

## 1. Отримати гілку
```bash
cd ~/Desktop/toto
git fetch ./_happybot-integration/happy-memory-integration.bundle codex/happy-memory-integration:codex/happy-memory-integration
git worktree add ../toto-happybot codex/happy-memory-integration   # окрема папка, ваша гілка не чіпається
cd ../toto-happybot && npm ci
```

## 2. `.env.local` у `toto-happybot` (STAGING)
```
NEXT_PUBLIC_SUPABASE_URL=https://xgelazzdgluuenqkymox.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qwo_FImiLzCpE9f-iGYzrQ_0m4pntJk
SUPABASE_SERVICE_ROLE_KEY=<staging service_role з Supabase Dashboard → staging project; НЕ prod>
OPENAI_API_KEY=<ваш ключ>
OPENAI_DAILY_BUDGET_USD=2
HAPPY_LEARNING_TOKEN_SECRET=<будь-який довгий випадковий рядок>
# GIFT_PRODUCT_SEARCH=0   # розкоментуйте, щоб перший прогін був без веб-пошуку
```
Не додавайте Upstash-змінні (тоді бюджет in-memory, $2/день). Не використовуйте prod-ключі.

## 3. Запуск для телефону
Дізнайтесь IP Mac у Wi-Fi (`ipconfig getifaddr en0`), телефон у тій самій мережі.
У `next.config.ts` **тимчасово** (не комітити) додайте в `nextConfig`: `allowedDevOrigins: ["<IP Mac>"],`
```bash
npx next dev -H 0.0.0.0 -p 3000
```
- Браузер телефону: `http://<IP Mac>:3000` — повний мобільний вигляд.
- Нативний застосунок: `npx cap run ios --live-reload --host <IP Mac> --port 3000` (або `android`). Production-конфіг `capacitor.config.ts` не змінюється.
У staging Supabase (Auth → URL Configuration) має бути дозволений `http://<IP Mac>:3000`; користувач — тестовий акаунт на staging.

## 4. Сценарії перевірки
1. Чат у особи: «Підкажи подарунок для <ім'я>» → має викликатись підбір, відповідь своїми словами; ідеї з посиланням і ціною (якщо пошук увімкнено) + підказка «перевірте ціну й наявність».
2. Повторіть те саме питання → Happy визнає, що вже радив, і пропонує інше.
3. Закрийте чат, відкрийте знову / інший пристрій → пам'ять попередніх розмов збережена.
4. «Дай ще ідеї» → ідеї не повторюють показані.
5. Скажіть стабільний факт про людину («Наталя любить чай») → з'являється пропозиція зберегти в пам'ять (потрібне підтвердження), без самовільного запису.
6. Сторінка подарунків (`/gift/start`) — картка з кнопкою «Переглянути в …».
7. Ліміти: 21-й запит чату за 10 хв → `rate_limited`; бюджет — повідомлення про добовий ліміт.
8. Відмова пошуку (`GIFT_PRODUCT_SEARCH=0`) → ідеї без офера, без помилок.

## 5. Як зупинити
Ctrl+C. Дані тестові (staging). Production-база, секрети й Vercel не змінюються.
