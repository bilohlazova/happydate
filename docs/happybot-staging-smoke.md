# HappyBot staging smoke: що воно робить і як запустити

Workflow `.github/workflows/happybot-staging-smoke.yml` запускається **лише вручну** і тестує **один точний SHA**
проти **staging** Supabase (`xgelazzdgluuenqkymox`). Production не чіпає. Він не реагує на pull request, тому код із PR
не може дістатися до секретів.

## Що гарантує ліміт $0.10, а що ні

Застосунок у job'і працює з порожнім Redis і `OPENAI_DAILY_BUDGET_USD=0.10` (250 000 одиниць вартості). Перевірено локально
з реальним кодом SEC-01 через міст у репозиторії: із 30 паралельних резервів пройшло рівно 12, тобто паралельні запити
ліміт не обходять. Також:

- усі виклики OpenAI йдуть через `runMeteredAiCall/Stream` (тест забороняє виклик поза ними), `maxRetries: 0` скрізь;
- вартість web_search (3 виклики по ≈$0.01) **резервується до виклику**, а провайдеру передається `max_tool_calls: 3`;
- невдалий або перерваний виклик залишає свій резерв і не повертає його;
- слотів конкурентності 2 на користувача й функцію, lease 75 с (на живому Redis перевірено TTL = 75).

**Це не абсолютна гарантія.** Ліміт рахується за оцінкою токенів і за цінами з коду, а не за рахунком OpenAI.
Єдиний абсолютний ліміт ставить OpenAI Project (крок 1 нижче), тому він обов'язковий.

## Кроки (значення секретів у чат не передавайте)

**1. OpenAI (окремий проєкт з жорстким лімітом)**
platform.openai.com → Projects → створіть `happydate-staging-smoke` → Limits → Monthly budget **$1** (hard) →
Model access: лише `gpt-4.1-mini` → API keys → створіть ключ. Скопіюйте його прямо в GitHub (крок 3), не в чат.

**2. GitHub Environment**
Репозиторій → Settings → Environments → New environment → `happybot-staging-smoke` →
Required reviewers: додайте себе → Deployment branches and tags → Selected branches → додайте `main` і
`codex/happydate-production-release-20261122` → Save.

**3. Секрети (Environment secrets цього environment, не Repository secrets)**

| Назва | Звідки |
|---|---|
| `STAGING_SUPABASE_URL` | `https://xgelazzdgluuenqkymox.supabase.co` |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | Supabase **staging** → Project Settings → API Keys → Publishable |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Supabase **staging** → API Keys → service_role (лише staging, не production) |
| `HAPPYBOT_SMOKE_OPENAI_API_KEY` | ключ із кроку 1 |

**4. Запуск**
Actions → «HappyBot staging smoke (paid, manual)» → Run workflow → Branch: `codex/happydate-production-release-20261122` →
`sha`: повний 40-символьний SHA потрібного коміту (його видно в PR #26 → Commits) → `product_search` **вимкнено** для
першого прогону → Run. Підтвердьте запуск у «Review deployments» (ви reviewer).

**5. Результат**
У логу тільки рядки `PASS/FAIL` і лічильник викликів, без текстів відповідей. Другий прогін зробіть із
`product_search` увімкненим. Після завершення видаліть OpenAI-ключ.

Скрипт сам видаляє створених тестових користувачів і перевіряє, що вони й усі їхні рядки зникли.
