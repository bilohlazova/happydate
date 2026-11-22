# AI cost controls

HappyDate applies one global UTC-day budget to paid `gpt-4.1-mini` calls from
Conversation Brain and Gift Intelligence. Production requires the server-only
`OPENAI_DAILY_BUDGET_USD` value plus the existing Upstash REST configuration.
Missing, malformed, below `$0.10`, or above `$1000` values fail closed.

Before each provider call, HappyDate estimates input tokens conservatively from
the full UTF-8 byte length plus message-framing overhead and
reserves the estimated input plus the full configured output allowance in an
atomic Redis operation. A request that would exceed the daily ceiling receives
`429 daily_ai_budget_exceeded` before OpenAI is called. The budget resets on the
next UTC day.

OpenAI streaming usage is requested for Assistant, while the Responses usage is
read for Gift Intelligence. When actual usage arrives, the reservation is
settled once. If the process ends before usage arrives or settlement fails, the
larger reservation remains. This may temporarily under-use the daily budget but
cannot silently increase spend.

The pricing policy is versioned for standard GPT-4.1 mini at `$0.40` per million
input tokens and `$1.60` per million output tokens, verified against OpenAI's
official GPT-4.1 pricing on 2026-08-16. Pricing is used for operational estimates;
the OpenAI billing dashboard remains authoritative for invoices.

Cost telemetry contains only feature, coarse input/output buckets, a cost band,
and allowlisted behavior/pricing versions. It contains no prompt, response,
person, user, event or memory identifiers.

## HappyBot memory, gift tool and product search

All HappyBot model calls use the shared SEC-01 boundary (`runMeteredAiCall` /
`runMeteredAiStream`) with the server-verified identity, so each call is
rate-limited, concurrency-leased, reserved against the daily budget and
attributed to the hosted test session. A single chat turn can use several
calls, each metered under its own feature: `chat` (up to two rounds when the
`suggest_gifts` tool runs), `gifts` (ideas and repair), `gift-search` (live web
search for product pages) and `chat-summary` (rolling conversation summaries,
run after the reply). Web search is billed per search call, so the number of
search calls is added to the settled usage as input-token units; missing or
malformed usage keeps the full reservation. Every role uses the single priced
model (`gpt-4.1-mini`); moving a role to another model needs its own reviewed
pricing policy, otherwise the call fails closed with 503.

Live product search is opt-in: it runs only when `GIFT_PRODUCT_SEARCH=1`. Setting it to anything else (or unsetting it) disables it without a deploy. Each search request is capped at 3 search calls (`max_tool_calls`) and the full fee for all 3 is reserved against the daily budget before the call.
