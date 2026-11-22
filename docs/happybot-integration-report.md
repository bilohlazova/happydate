# Інтеграція HappyBot у security-hardened main

**Статус: Production — NO-GO. Staging — готово до рішення після перегляду PR. Міграція не застосована ніде.**

| | SHA |
|---|---|
| Базовий `origin/main` (перевірено `git fetch`, новіших комітів немає) | `74a52ed7ab786d5e3eac0f1bd245f28ffb4f7b24` |
| Інтеграційний коміт `codex/happy-memory-integration` (код) | `71e15b6c61dc9dd3979134f3388deb57b55db1af` |
| Коміт зі звітом | див. `git log -1` гілки (docs-only) |

Оригінальна гілка `codex/release-readiness-audit` не змінювалась. Інтеграція зроблена в окремій копії (`git clone` + `git worktree`), push у GitHub із середовища Cowork заблокований, тому гілка передається як `git bundle` і patch.

## 1. Порівняльний аудит двох ліній
`merge-base` = `6f193f6`. На `main` з того часу 14 комітів (SEC-01: `runMeteredAiCall/Stream`, ліміти, hosted-сесії, Next 16.4.6, release-gates). Стара локальна лінія має 37 власних комітів (i18n, media, notes, тести 101-ї людини тощо) — **вони не переносились**, бо це не HappyBot і не прийняті в main.

Мої зміни HappyBot існували лише як незакомічений робочий стан поверх старої лінії. Їх зібрано в один знімок і cherry-pick'нуто на main:

| Область | Стан у main | Дія |
|---|---|---|
| Пам'ять розмов, підсумки, показані ідеї, чергa знань, офери, tool `suggest_gifts`, unified person context, міграція | відсутні | перенесено |
| `aiBudget.ts` (валідація usage, таймаути, Lua-guard) | оновлений SEC-01 | **взято версію main**, мою заміну ціни/моделі відкинуто |
| Модель/прайсинг (`gpt-4.1`) | дозволено лише `gpt-4.1-mini` (`assertPricedAiModel`) | **відкинуто**; усі ролі = `gpt-4.1-mini` |
| Три провайдери (rescue, agent, learning) | вже на `runMeteredAiCall` | **взято main** повністю |
| `ai-chat/route.ts`, `gift-suggestions/route.ts`, `api-route-hardening` тест | конфлікт | переписано поверх main (нижче) |

### Конфлікти й рішення
1. `ai-chat/route.ts` — основа = файл main (збережено `logHostedAiAttestation`, `readHostedSessionConfig`, `withAiExecutionScope`, `runMeteredAiStream`). Додано: tools `propose_memory` + `suggest_gifts`, другий раунд, пам'ять, черга знань. Старий `budget`/`includeVerifiedScopedPerson` зі старої лінії **не** перенесено.
2. `gift-suggestions/route.ts` — тонка обгортка над спільним pipeline; власний limiter/budget прибрано (їх дає SEC-01), додано `aiExecutionFailureResponse`.
3. Провайдери — `--ours` (main).
4. `tests/api-route-hardening` — залишено всі вимоги main до aiExecution і додано перевірки, що pipeline використовує `runMeteredAiCall` під ідентичністю власника.
5. `assistant-ai-budget.test` — повернуто версію main (моє очікування старого прайсингу видалено).

## 2. Як нові AI-виклики вбудовані в SEC-01 (ваше головне питання)
Один запит користувача тепер може породити кілька викликів. Кожен — окремий `runMeteredAi*` зі своєю резервацією:

| Виклик | feature | Де |
|---|---|---|
| Раунд 1 відповіді чату | `chat` | `meteredRound(params)` |
| Раунд 2 після `suggest_gifts` | `chat` | `meteredRound(followUpParams)` |
| Генерація/ремонт ідей | `gifts` | `giftRecommendationService` |
| Пошук товарів (web_search) | `gift-search` | `giftProductSearch` |
| Підсумок розмов (після відповіді, `after()`) | `chat-summary` | `conversationMemory.server` |

Гарантії (перевіряє `tests/happy-memory-sec01.test.mjs`):
- кожен `new OpenAI(` у `src/` стоїть усередині metered-колбека; жоден модуль HappyBot не викликає `reserve/settle/createConfiguredAiBudget` сам;
- ідентичність береться тільки з сервера: у pipeline — `ownedPerson.userId`, у підсумках — перевірений `userId`, у чаті — `identity`; `guest` дозволений лише для `chat`;
- кожен виклик проходить rate limit, concurrency lease, добовий бюджет і `reserveHostedTestSession`; пошук товарів додає вартість search-викликів до settle (відсутній/некоректний usage лишає повну резервацію);
- бюджет обриває «runaway»-хід: синтетичний тест із 5 викликами в одному ході показує `daily_ai_budget_exceeded` і те, що провайдер не викликається без дозволеної резервації;
- непрайсена модель → 503 (fail-closed).

### Побічні ефекти, які варто знати
- Rate limit рахується **на feature**: хід з tool = 2 хіти `chat` (ліміт 20/10 хв → ≈10 таких ходів), плюс окремі `gifts`/`gift-search`.
- У hosted/preview-сесіях з малим бюджетом багатовикличний хід вичерпає сесію швидше.
- Вартість web_search точніше облікована лише постфактум (settle додає дельту) — реальні токени пошуку можуть перевищити резервацію; обмежено rate limit `gift-search`.
- **Змінено один ліміт, пов'язаний із SEC-01:** `requestTimeoutMs` 30→60 с та `concurrentLeaseSeconds` 45→75 (інакше tool-хід не встигає). Ліміт відповіді 700 токенів і ціни — без змін. Це окреме рішення для рев'ю.

## 3. Збережені security-механізми (перевірено тестами main)
`runMeteredAiCall/Stream`, `assertPricedAiModel`, `aiBudget` (Lua-guard, валідація usage), rate limiter (таймаути, strict INCR/TTL), hosted-session і egress-блокування, `readBoundedJson`, `logHostedAiAttestation`, RLS-scope чату, release-gates CI, Next 16.4.6 (`npm audit`: 0 вразливостей).

## 4. Нові захисти й регресійні перевірки
- Міграція: RLS увімкнено; authenticated лише select/delete власних рядків; service_role мінімально (insert/select, update лише `summarized_at`); `anon` — нічого; `revoke all` явно.
- Ізоляція: усі серверні запити з `eq("user_id")`; `person_id` лише з перевіреного scope/активної людини; `saveChatTurn` тільки коли `verifiedContextReady`.
- Prompt injection: пам'ять позначена «DATA, NOT INSTRUCTIONS»; факти — лише дослівні слова користувача (`isFactStatedByUser`) і тільки в чергу з підтвердженням.
- Логи: без текстів/імен/URL; allowlist `safeLogger` розширено лише назвами.
- URL: https, публічний хост, без credentials/IP/localhost, URL має бути серед джерел пошуку, ціна в бюджеті; у запит пошуку не йде поле `why`.

## 5. Результати перевірок (на SHA інтеграційного коміту)
| Перевірка | Результат |
|---|---|
| `npm ci` | OK (0 vulnerabilities, `npm audit --omit=dev`) |
| `tsc --noEmit` | OK |
| `eslint` | 0 помилок |
| `node --test tests/*.test.mjs` | 1427 тестів, 1420 pass, 0 fail |
| `npm run eval:assistant` | 18 сценаріїв, `assistant-2026-11-22.3` (живий прогін не виконувався) |
| `npm run build -- --webpack` (як у CI) | OK |
| `npm run smoke:production` | passed |
| Міграція на staging у транзакції з ROLLBACK | SQL валідний, права коректні, слідів немає |

Не виконувалось: інтеграційні CI-джоби з Docker/Supabase (`database-security`, redis), Android/iOS-збірки, живі виклики OpenAI/пошуку, live eval, `check:migrations` (скрипта в main немає).

## 6. Міграція
`20261122120000_create_happy_conversation_memory.sql` — новіша за останню у main (`20261020153546`) і за prod-журнал (`20261020160329`), нових залежностей крім `auth.users` і `public.people`. **Не застосовувати до рішення про staging.**

## 7. Готовність
- **Production: NO-GO** (за вашим рішенням і через нерозв'язані пункти нижче).
- **Staging: можливий після рев'ю PR**, у порядку: застосувати міграцію на staging → деплой → `GIFT_PRODUCT_SEARCH=0` для першого прогону → перевірити чат, повтор питання, tool подарунків → тоді вмикати пошук.

### Відкриті питання для рев'ю
1. Підвищення таймаутів (30→60 с / lease 75 с).
2. Підтвердити, що `gpt-4.1-mini` підтримує `web_search` у вашому акаунті.
3. Retention/«забути розмови» для нових таблиць.
4. Максимальна тривалість функцій Vercel для tool-ходу.
5. Старі 37 локальних комітів лишаються окремою лінією.
