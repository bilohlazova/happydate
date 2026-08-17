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
