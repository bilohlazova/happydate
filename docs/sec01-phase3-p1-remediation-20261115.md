# HappyDate — SEC-01 Phase 3: P1 remediation

Дата: 15.11.2026. **NO-GO. SEC-01 OPEN.** Код підготовлено для наступної Staging validation; Production READY не підтверджено.

## Версія та межі

- Перевірена база: `4d46e4b0f818a612c0baff1eb421d930350af6e4`.
- Збережений guard patch: `700b03ec3b22d484dc678952672a89728fa24928`, direct parent нового виправлення. Обидва missing-config routes, preflight і regression tests збережено.
- Код remediation: **`223948474700c35c19621bc429ddd20846a33ab8`**.
- Ізольована локальна гілка: `codex/sec01-phase3-p1-remediation`. Немає push, merge або deployment. Цей commit не міститься у поточному staged deployment.
- Джерело попередніх hosted findings: `docs/sec01-phase2-production-readiness-20261115.md` у кореневій workspace. Ці findings нижче явно відокремлено від нових локальних доказів.
- Production secrets, Supabase, RLS, SMTP, aliases, Deployment Protection та Keychain records не змінювалися. Платні provider calls і hosted fixtures у Phase 3 не виконувалися.

## Підтверджені виправлення

### P1: обхід глобального AI budget через окремі модулі

`src/lib/assistant/aiExecution.server.ts` тепер є спільною межею перед фактичним SDK HTTP call. Сервер установлює identity scope після наявної authentication/ownership перевірки; identity не береться з model output або довільного request body. Немає scope, невідома модель, Redis/config error або вичерпаний бюджет — provider не викликається. Guest дозволений лише для існуючого bounded Chat.

| Entry point | Identity / authorization | Контроль перед кожним SDK call | Usage / повтори |
|---|---|---|---|
| `/api/ai-chat` | Існуюча guest/auth identity; приватний context вимагає Auth | Shared rate/concurrency + atomic daily reserve; request limiter збережено | Chat streaming usage; повне споживання stream; скасування утримує reserve |
| `/api/ai/gift-suggestions` | `resolveGiftAccess`, owner context | Shared guard для generation та кожного repair | Responses input/output; repair має окрему резервацію |
| `/api/happy/agent` | Auth + owned context | Shared guard у provider | Responses input/output; видалено фіктивний input=0/output=700 |
| Learning detect | Auth + ownership, signing-config guard | Shared guard перед extraction | Chat prompt/completion usage; controlled 429/503/502 |
| Tasks continue | Auth + owned task/context до provider | Scope для gift і greeting paths | Guard error повертає task у pending; контрольований retry; provider usage обліковується на спільних providers |
| Occasion Rescue | Auth + ownership + eligibility | Shared guard перед provider | Responses input/output; safe response без provider details |
| Live assistant evaluation | Explicit opt-in background scope | Вимагає distributed Redis та explicit budget навіть поза NODE_ENV=production | Chat usage, timeout; без тихого memory fallback |

Source inventory знайшов шість runtime SDK call sites і один evaluation call site. Tasks використовує наявні providers, а не другий фінансовий механізм. Нових SDK, pricing services, міграцій чи бізнес-моделей не додано. Старий optional budget API `chatServer` збережено для сумісності його consumers/tests; production route більше не передає його, оскільки резервує фактичний SDK layer. Додаткові request rate limits не є подвійним фінансовим списанням.

- Резервується весь serialized SDK payload: instructions, schemas/tools і messages, UTF-8 byte bound + framing allowance, та максимальний output. Це консервативна оцінка для поточного текстового payload, не універсальна оцінка image/audio calls.
- Ціни явно дозволені лише для `gpt-4.1-mini` / `gpt-4.1-mini-2025-04-14`: input $0.40, output $1.60 за мільйон. Інша модель блокується до окремої reviewed policy. Cached input обліковується за стандартною ціною — консервативно. [Офіційна модель і pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini).
- Реальний input та output usage перевіряються окремо для Responses і Chat. Missing, fractional, negative, NaN, inconsistent total або нульовий input не перетворюються на нульову вартість.
- Atomic Redis EVAL reserve обмежує суму паралельних викликів. Settlement одноразовий, не воскресає після expiration і не повертає стару memory-reservation у бюджет нового UTC дня.
- Missing usage, provider errors, timeout та cancelled/incomplete stream утримують worst-case reserve. Це може зменшувати доступність до наступного бюджетного дня, але не створює безкоштовний retry.
- SDK `maxRetries: 0` на всіх call sites: кожен явний retry/repair повинен знову пройти reserve. [Офіційна документація SDK retries](https://github.com/openai/openai-node#retries).
- Redis timeout 5 секунд; provider calls обмежені наявними abort signals або явними defaults (Learning 4 секунди, Agent/Rescue/eval 30 секунд; Gift/Chat використовують request deadline).
- Помилки бюджетування fail closed; settlement error не намагається вдруге змінити баланс. Logs містять лише operational category, не provider body або secret.

### P1: Happy Learning token security/configuration

`happyLearningDetectionToken.server.ts`: HMAC SHA-256, timing-safe signature comparison, canonical signature encoding, version 2 та audience `happy-learning-confirm`; строк дії не більше 600 секунд, exp > iat, future iat allowance до 60 секунд. Підпис пов'язує candidate hash, user, person, source, evidence та schema. Confirm додатково перевіряє authenticated user/ownership у наявному application layer.

Missing `HAPPY_LEARNING_TOKEN_SECRET` не має fallback до OpenAI/Supabase/JWT/backup password. Збережений guard `700b03e` повертає 503/no-store до hosted dependencies; production preflight також FAIL. Наявний idempotency/provenance/domain validation не прибрано.

**Сумісність:** непідтверджені v1 candidate tokens будуть відхилені після rollout; потрібен повторний detect. Вікно pending candidates — 10 хвилин. Збережені memories/knowledge не змінюються. Це контрольована зміна wire contract; перед rollout врахувати старі вкладки/clients. Ротація signing secret не виконувалася.

## Перевірки та межі доказів

Node 24, Next 16.4.3, OpenAI SDK 6.49.0; dependency lockfile не змінювався.

| Перевірка | Результат | Доказ / межі |
|---|---|---|
| ESLint + TypeScript | PASS | `npm run verify`, без suppressions |
| Повний локальний suite | PASS: **1384**, FAIL 0, skipped 7 | `evidence/sec01-phase3-20261115/verify.log` |
| Offline assistant evaluation | PASS: 15 scenarios | У verify log; live generation skipped |
| Shared execution security | PASS: 10 tests у повному suite | budget exhaustion, parallel cap, no auth, guest scope, unknown model, unavailable controls, timeout, usage, retry, streaming/cancellation, midnight settlement |
| Реальні SDK з synthetic HTTP transport | PASS: 3 | Agent/Learning/Rescue: denial → 0 HTTP; provider failure → один HTTP, без hidden retries; `sdk-metering.log`. Це не live OpenAI |
| Actual route Auth regression | PASS: 5 | Gift/Learning/Agent/Tasks/Rescue missing/invalid bearer → 401, 0 OpenAI; `auth.log` |
| Token regressions | PASS | Purpose, v1 rejection, TTL, expiry, tampering, source/person/value/schema, missing secret; existing cross-user confirm tests збережені |
| Справжній локальний Redis | PASS: 1 | 10 concurrent reserves → лише 2 accepted у заданому cap; duplicate settlement once; invalid usage retained; expired key не відновлюється. `redis.log` |
| Optimized production build | PASS | `next build --webpack`; public Staging URL + placeholder public key, без admin/Production credentials; `build.log` |
| Локальний production HTTP smoke | PASS | Pages, headers, bounded JSON, retired APIs; loopback server закривається у finally. Не authenticated AI E2E |
| Clean local Supabase replay + SQL RLS/schema | **NOT RUN / infrastructure blocked** | CLI 2.122.0 в internal Docker network не зміг підключитися до 127.0.0.1:54492 (`ECONNREFUSED`); тести не почалися. У suite 6 SQL tests skipped. Конфігурацію schema harness мінімально розширено `LOCAL_SUPABASE_DB_CONTAINER`, щоб не звертатись до чужого локального stack |
| Exact candidate remote Quality Gate | **NOT RUN** | Немає push/нового GitHub run; попередній CI для 4d46 не є доказом для нового commit |
| Hosted Staging lifecycle / Production AI | **UNVERIFIED для нового кандидата** | Локальні fixtures і mock transport не замінюють hosted Auth/RLS/Redis/provider runtime |
| Native iOS/Android | NOT RUN | Цей етап не є доказом native functionality |

Redis container працював без network/ports/volumes, persistence вимкнено. Видалено власний Redis container, невдалий тимчасовий Supabase stack і власну internal network; перевірка не знайшла залишкових DB containers/volumes з test project ID. Hosted дані не створювалися — hosted cleanup у цьому етапі не потрібен і не оголошується новим Staging cleanup proof.

Сім skipped у загальному suite: 5 local RLS, 1 schema, 1 opt-in Redis. Окремий Redis run успішний; DB тести залишаються неперевіреними в цьому етапі.

## Environment requirements — лише назви, без значень

- `NEXT_PUBLIC_SUPABASE_URL` і `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` підтримується наявним resolver.
- `SUPABASE_SERVICE_ROLE_KEY` — лише server-side, ніколи не client authorization.
- `OPENAI_API_KEY` — окремий ключ відповідного environment.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `OPENAI_DAILY_BUDGET_USD` — shared durable controls. У Production відсутність/некоректність блокує expensive operation.
- `HAPPY_LEARNING_TOKEN_SECRET` — незалежні мінімум 32 випадкові bytes, server-only protected secret. Попередній read-only Production inventory: **відсутній**. Створення не дозволене цим завданням і не виконане.

Окрема майбутня погоджувана дія: створити Learning signing secret захищеним способом, задати лише потрібний scope, зберегти окремий recovery material, зробити новий staged build та перевірити detect/confirm. Не використовувати backup password/API keys як signing material. Не передавати секрет у чат/командний output/plaintext/Git/CI. Не ставити Production values у Staging.

Live evaluation CI тепер потребує окремих непродукційних provider key, Redis та budget; відсутність цих controls означає fail closed. Нічого з Production до CI не копіювати.

## SEC-01 OpenAI dependency inventory та ротація

Нижче — останні підтверджені Phase 2 metadata findings; **не новий read-back** і не доказ повноти зовнішніх інтеграцій.

| Consumer | Останній підтверджений стан | Що ще довести |
|---|---|---|
| Чинний Production deployment | `dpl_3qiFK4y7AsqnPa3P9wkqLR7jTcgf`, SHA `6f193f601f7e1640c20f6529f883bd933b088a16`; створений до env update нового ключа | Не вважати поточний immutable snapshot мігрованим |
| Corrected staged | `dpl_F2BuyBW9JvA7EiY4gQAJNmot4s7A`, SHA 4d46, READY, aliases [] | Не містить цього remediation; authenticated AI runtime/binding ще неперевірений |
| Vercel Production env | Новий dedicated OpenAI key у sensitive Production-only record | Identity binding у фактичному runtime; metadata scope не доводить весь E2E |
| Історичні Preview/rollback snapshots | Можуть містити старий ключ попри Phase 1 isolation майбутніх builds | Inventory aliases/consumers перед окремим cleanup/revocation |
| Старий локальний `.env.local` | Попередній ephemeral-HMAC compare: не збігається з новим ключем; значення/відбитки не виводилися | Власник/локальний consumer має окремо мігрувати або припинити використання; не припускати identity старого ключа |
| Scheduled assistant live evaluation | `HAPPYDATE_ASSISTANT_EVAL_OPENAI_API_KEY`, weekly Monday | Credential identity UNKNOWN; окремий nonprod key + durable budget/Redis, контрольований тест |
| iOS/Android source | Прямих OpenAI key reads не знайдено; використовують backend | Це source review, не binary inventory |
| Make/n8n/інші scripts/services | **UNKNOWN** за відповіддю власника | Не оголошувати NONE; окремий дозвіл на ризик або завершене consumer inventory |

Старий OpenAI key не відкликаний, останній статус ACTIVE. Новий key не створювався повторно. Redis/Supabase rotation не виконувалася. Backup recovery Keychain material не читався й не змінювався; попередній scoped backup verification не переатестовано цим етапом.

Послідовність майбутніх окремо погоджених змін:

1. Завершити consumer inventory, включно з weekly CI та UNKNOWN external; без розкриття значень. За потреби порівнювати лише in-process constant-time equality/ephemeral keyed digest, показуючи boolean, не digest/value.
2. Пройти Staging candidate validation і exact-SHA CI. Окремо погодити Production signing config, новий corrected staged build і synthetic Production test account/scenario.
3. Перевірити нову immutable збірку, runtime OpenAI auth/generation, Redis/budget і Learning confirm; підготувати rollback build із поточними дозволеними credentials.
4. Тільки за окремим дозволом — cutover, post-cutover checks та спостереження всіх відомих consumers. Сам факт нового key не відкликає старий і не мігрує старі deployments.
5. Тільки після підтвердженої міграції або явного прийняття UNKNOWN ризику — окремо погоджене revocation старого key. Перевірити його непридатність без виведення значення (очікуваний provider auth rejection), працездатність нового key і consumers.

## Staging validation — виконуваний порядок наступного етапу

1. Pin application на code SHA вище або наступний docs-only head з ідентичним tree `src/scripts/tests`; перевірити Git tree та відсутність Production config.
2. Запустити exact-SHA full CI, lint/type/tests/build/HTTP; чисту локальну SQL replay/RLS/schema виконати послідовно (`--test-concurrency=1`) на окремому DB container. Усунути локальну network startup проблему до заяви DB PASS.
3. Підготувати лише Staging `xgelazzdgluuenqkymox`, окремий Staging Redis (не shared Production daily-cost key), непродукційний OpenAI key, низький explicit budget та окремий signing secret. Staging admin credential — тільки захищений локальний process, fixtures/cleanup; реальні endpoints викликати user sessions.
4. Після погодження обмежених платних/мутаційних Staging calls створити два synthetic users із run marker. Спочатку записати ownership-scoped cleanup journal, потім fixtures; `finally` видалити всі created records/storage/users/sessions та незалежно перевірити нуль run-marker залишків. Не чистити чужі записи.
5. Перевірити login/logout/refresh, A/B ownership, Gift generation/repair/save, Learning detect→confirm/replay/expiry/tamper/cross-user, Tasks create→continue→persist→complete, Rescue. AI output пройти існуючу domain/provenance validation; counts/links перевірити DB read-back.
6. Перевірити budget exhausted і паралельні calls: відхилені не доходять до provider. Timeout/usage missing/retry/error injection виконувати в локальному harness, а не ламати hosted service. Redis auth/network failure у окремому test runtime має блокувати operation, не відкривати безлімітний fallback.
7. Зібрати redacted statuses/usage/cost/reservations, без prompts персональних користувачів і секретів. Незалежний cleanup proof та exact-SHA evidence є умовами наступного Production readiness review.

## Release gate matrix / залишкові блокери

| Gate | Стан / severity | Мінімальний наступний крок |
|---|---|---|
| P1 AI code controls | Локально виправлено та regression PASS | Hosted Staging validation exact candidate; не називати Production validated |
| P1 Learning code fail-closed/token | Локально PASS | Перевірити v2 rollout і runtime detect/confirm |
| P1 Production signing env | BLOCKED, за останнім inventory missing | Окремий дозвіл на незалежний signing secret; новий immutable build |
| P1 historical credentials SEC-01 | OPEN | Consumer migration + окремо дозволена revocation після перевірок |
| Exact candidate full remote gate | NOT RUN | Окремо опублікувати/запустити required CI без auto-deploy |
| Authenticated hosted AI/Redis/budget | UNVERIFIED | Approved synthetic runtime scenario; не створювати Production account зараз |
| Local SQL replay/RLS | NOT RUN (local infrastructure) | Відновити isolated startup й виконати serial SQL tests; policies не змінювати |
| Backup/rollback evidence | Попередній scoped VERIFIED, не переатестовано | Read-only перевірити receipt/recovery доступність перед cutover |

Rollback: до deployment достатньо залишити чинний Production активним; він не змінювався. Майбутній rollback має повертати перевірену credential-compatible збірку; старий immutable artifact після key revocation може втратити AI. Database migrations не додані, rollback даних цим patch не потрібний. Pending v2/v1 candidates можуть потребувати повторного detect при поверненні версії. Backup decryption recovery material незалежний від OpenAI та не змінюється.

**Рекомендація: NO-GO для Production; кандидат придатний для наступної контрольованої Staging validation. Автоматичного GO, deployment, merge, cutover або revocation немає.**
