<!-- Fixture: a trimmed capture of https://aistudio.google.com/docs/pricing.md (Google's pricing page as Markdoc source, which ai.google.dev/gemini-api/docs/pricing now redirects to) taken 2026-11-09, for tools/pricing-worker/test-prices.mjs. -->
## Gemini 4 Argon  {% id="gemini-4-argon" %}

{% two-column-layout %}
  {% left-column class="center-vertically" %}
  *[`gemini-4-argon`](/docs/models/gemini-4-argon)*

  {% /left-column %}

  {% right-column class="center-vertically right-align" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-argon" variant="ais" %}
  Try it in Google AI Studio

  {% /button %}

  {% /right-column %}

{% /two-column-layout %}

{% hr /%}

Our flagship reasoning model, built for complex software engineering, deep
mathematical and scientific problem solving, autonomous multi-step agents, and
long-decode generation up to 1M tokens.

{% callout type="note" %}
  Gemini 4 Argon is not available on the Free tier. Every token the model processes is counted and billed, including thinking tokens and internal tool system instructions and function declarations when using grounding.

{% /callout %}

{% tabs %}
  {% tab title="Standard" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $2.00 through November 30, 2026.   
  $4.00 starting December 1, 2026.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $10.00 through November 30, 2026.   
  $20.00 starting December 1, 2026.

  ---

  * Context caching price
  * Not available
  * $0.10 through November 30, 2026.   
  $0.20 starting December 1, 2026.   
  Implicit caching only (explicit caching is not supported).

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.
    

  {% /tab %}

  {% tab title="Batch" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $1.00 through November 30, 2026.   
  $2.00 starting December 1, 2026.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $5.00 through November 30, 2026.   
  $10.00 starting December 1, 2026.

  ---

  * Context caching price
  * Not available
  * $0.05 through November 30, 2026.   
  $0.10 starting December 1, 2026.   
  Implicit caching only (explicit caching is not supported).

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.
    

  {% /tab %}

  {% tab title="Flex" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $1.00 through November 30, 2026.   
  $2.00 starting December 1, 2026.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $5.00 through November 30, 2026.   
  $10.00 starting December 1, 2026.

  ---

  * Context caching price
  * Not available
  * $0.05 through November 30, 2026.   
  $0.10 starting December 1, 2026.   
  Implicit caching only (explicit caching is not supported).

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.
    

  {% /tab %}

  {% tab title="Priority" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $3.60 through November 30, 2026.   
  $7.20 starting December 1, 2026.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $18.00 through November 30, 2026.   
  $36.00 starting December 1, 2026.

  ---

  * Context caching price
  * Not available
  * $0.18 through November 30, 2026.   
  $0.36 starting December 1, 2026.   
  Implicit caching only (explicit caching is not supported).

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.
    

  {% /tab %}

  {% tab title="Contributor" %}
  {% callout type="note" %}
  The Gemini API Contributor Tier is offered as a private preview on an
      invite-only basis. Speed and reliability are equivalent to
      [Standard Tier inference](/docs/optimization). Eligible users will be invited by
      email and see a callout in AI Studio.

  {% /callout %}

  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD{% sup %}*{% /sup %}

  ---

  * Input price
  * Not available
  * $1.00

  ---

  * Output price (including thinking tokens)
  * Not available
  * $5.00

  ---

  * Context caching price
  * Not available
  * $0.05   
  Implicit caching only (explicit caching is not supported).

  ---

  * Used to improve our products
  * Not available
  * [Yes](/docs/logs-policy#contributor-tier)
  {% /table %}

  {% sup %}*{% /sup %} Discounts and model availability are subject to change.
    

  {% /tab %}

{% /tabs %}

## Gemini 3.8 Flash  {% id="gemini-3.8-flash" %}

{% two-column-layout %}
  {% left-column class="center-vertically" %}
  *[`gemini-3.8-flash`](/docs/models/gemini-3.8-flash)*

  {% /left-column %}

  {% right-column class="center-vertically right-align" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.8-flash" variant="ais" %}
  Try it in Google AI Studio

  {% /button %}

  {% /right-column %}

{% /two-column-layout %}

{% hr /%}

Our most intelligent Flash model, engineered for long-horizon software
engineering, autonomous agents, and complex enterprise workflows.

{% tabs %}
  {% tab title="Standard" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $0.75 through December 31, 2026.   
  $1.50 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $3.75 through December 31, 2026.   
  $7.50 starting January 1, 2027.

  ---

  * Context caching price
  * Free of charge
  * $0.075 through December 31, 2026.   
  $0.15 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Grounding with Google Search
  * Not available
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Batch" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $0.375 through December 31, 2026.   
  $0.75 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $1.875 through December 31, 2026.   
  $3.75 starting January 1, 2027.

  ---

  * Context caching price
  * Not available
  * $0.0375 through December 31, 2026.   
  $0.075 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Flex" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $0.375 through December 31, 2026.   
  $0.75 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $1.875 through December 31, 2026.   
  $3.75 starting January 1, 2027.

  ---

  * Context caching price
  * Not available
  * $0.0375 through December 31, 2026.   
  $0.075 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Priority" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $1.35 through December 31, 2026.   
  $2.70 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $6.75 through December 31, 2026.   
  $13.50 starting January 1, 2027.

  ---

  * Context caching price
  * Free of charge
  * $0.135 through December 31, 2026.   
  $0.27 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Contributor" %}
  {% callout type="note" %}
  The Gemini API Contributor Tier is offered as a private preview on an
      invite-only basis. Speed and reliability are equivalent to
      [Standard Tier inference](/docs/optimization). Eligible users will be invited by
      email and see a callout in AI Studio.

  {% /callout %}

  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD{% sup %}*{% /sup %}

  ---

  * Input price
  * Free of charge
  * $0.375

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $1.875

  ---

  * Context caching price
  * Free of charge
  * $0.0375   
  $0.50 / 1,000,000 tokens per hour (storage price)

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [Yes](/docs/logs-policy#contributor-tier)
  {% /table %}

  {% sup %}*{% /sup %} Discounts and model availability are subject to change.
    

  {% /tab %}

{% /tabs %}

## Gemini 3.6 Flash  {% id="gemini-3.6-flash" %}

{% two-column-layout %}
  {% left-column %}
  *[`gemini-3.6-flash`](/docs/models/gemini-3.6-flash)*

  {% /left-column %}

  {% right-column class="center-vertically right-align" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.6-flash" variant="ais" %}
  Try it in Google AI Studio

  {% /button %}

  {% /right-column %}

{% /two-column-layout %}

{% hr /%}

Our previous generation Flash model, balancing speed and multimodal capabilities
across general agentic and everyday tasks.

{% tabs %}
  {% tab title="Standard" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $0.75 through December 31, 2026.   
  $1.50 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $3.75 through December 31, 2026.   
  $7.50 starting January 1, 2027.

  ---

  * Context caching price
  * Free of charge
  * $0.075 through December 31, 2026.   
  $0.15 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Batch" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $0.375 through December 31, 2026.   
  $0.75 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $1.875 through December 31, 2026.   
  $3.75 starting January 1, 2027.

  ---

  * Context caching price
  * Not available
  * $0.0375 through December 31, 2026.   
  $0.075 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Flex" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $0.375 through December 31, 2026.   
  $0.75 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Not available
  * $1.875 through December 31, 2026.   
  $3.75 starting January 1, 2027.

  ---

  * Context caching price
  * Not available
  * $0.0375 through December 31, 2026.   
  $0.075 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Priority" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $1.35 through December 31, 2026.   
  $2.70 starting January 1, 2027.

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $6.75 through December 31, 2026.   
  $13.50 starting January 1, 2027.

  ---

  * Context caching price
  * Free of charge
  * $0.135 through December 31, 2026.   
  $0.27 starting January 1, 2027.   
  $0.50 / 1,000,000 tokens per hour (storage price) through December 31, 2026.   
  $1.00 / 1,000,000 tokens per hour (storage price) starting January 1, 2027.

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

{% /tabs %}

{% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
more queries to Google Search. You will be charged for each individual search
query performed.

{% sup %}**{% /sup %} Can be tested in Google AI Studio.

## Gemini 3.1 Flash-Lite  {% id="gemini-3.1-flash-lite" %}

{% two-column-layout %}
  {% left-column class="center-vertically" %}
  *[`gemini-3.1-flash-lite`](/docs/models/gemini-3.1-flash-lite)*

  {% /left-column %}

  {% right-column class="center-vertically right-align" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.1-flash-lite" variant="ais" %}
  Try it in Google AI Studio

  {% /button %}

  {% /right-column %}

{% /two-column-layout %}

{% hr /%}

A cost-efficient model, optimized for high-volume agentic tasks, translation,
and simple data processing.

{% tabs %}
  {% tab title="Standard" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $0.25 (text / image / video)    
  $0.50 (audio)

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $1.50

  ---

  * Context caching price
  * Not available
  * $0.025 (text / image / video)    
  $0.05 (audio)    
  $1.00 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Batch" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $0.125 (text / image / video)    
  $0.25 (audio)

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $0.75

  ---

  * Context caching price
  * Not available
  * $0.0125 (text / image / video)    
  $0.025 (audio)    
  $0.50 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Flex" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $0.125 (text / image / video)    
  $0.25 (audio)

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $0.75

  ---

  * Context caching price
  * Not available
  * $0.0125 (text / image / video)    
  $0.025 (audio)    
  $0.50 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

  {% tab title="Priority" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Free of charge
  * $0.45 (text / image / video)    
  $0.90 (audio)

  ---

  * Output price (including thinking tokens)
  * Free of charge
  * $2.70

  ---

  * Context caching price
  * Not available
  * $0.045 (text / image / video)    
  $0.09 (audio)    
  $1.80 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

{% /tabs %}

{% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
more queries to Google Search. You will be charged for each individual search
query performed.

{% sup %}**{% /sup %} Can be tested in Google AI Studio.

## Gemini 3.1 Pro Preview  {% id="gemini-3.1-pro-preview" %}

{% two-column-layout %}
  {% left-column class="center-vertically" %}
  *[`gemini-3.1-pro-preview`](/docs/models/gemini-3.1-pro-preview) and
    [`gemini-3.1-pro-preview-customtools`](/docs/models/gemini-3.1-pro-preview#gemini-31-pro-preview-customtools)*

  {% /left-column %}

  {% right-column class="center-vertically right-align" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.1-pro-preview" variant="ais" %}
  Try it in Google AI Studio

  {% /button %}

  {% /right-column %}

{% /two-column-layout %}

{% hr /%}

Our 3rd generation Pro model, built for multimodal understanding, agentic
capabilities, and vibe-coding.

{% tabs %}
  {% tab title="Standard" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $2.00, prompts <= 200k tokens    
  $4.00, prompts > 200k tokens

  ---

  * Output price (including thinking tokens)
  * Not available
  * $12.00, prompts <= 200k tokens    
  $18.00, prompts > 200k

  ---

  * Context caching price
  * Not available
  * $0.20, prompts <= 200k tokens    
  $0.40, prompts > 200k    
  $4.50 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.

  {% sup %}**{% /sup %} Can be tested in Google AI Studio.
    

  {% /tab %}

  {% tab title="Batch" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $1.00, prompts <= 200k tokens    
  $2.00, prompts > 200k tokens

  ---

  * Output price (including thinking tokens)
  * Not available
  * $6.00, prompts <= 200k tokens    
  $9.00, prompts > 200k

  ---

  * Context caching price
  * Not available
  * *Same as Standard*    
  $0.20, prompts <= 200k tokens    
  $0.40, prompts > 200k    
  $4.50 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.

  {% sup %}**{% /sup %} Can be tested in Google AI Studio.
    

  {% /tab %}

  {% tab title="Flex" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $1.00, prompts <= 200k tokens    
  $2.00, prompts > 200k tokens

  ---

  * Output price (including thinking tokens)
  * Not available
  * $6.00, prompts <= 200k tokens    
  $9.00, prompts > 200k

  ---

  * Context caching price
  * Not available
  * *Same as Standard*    
  $0.20, prompts <= 200k tokens    
  $0.40, prompts > 200k    
  $4.50 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.

  {% sup %}**{% /sup %} Can be tested in Google AI Studio.
    

  {% /tab %}

  {% tab title="Priority" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $3.60, prompts <= 200k tokens    
  $7.20, prompts > 200k tokens

  ---

  * Output price (including thinking tokens)
  * Not available
  * $21.60, prompts <= 200k tokens    
  $32.40, prompts > 200k

  ---

  * Context caching price
  * Not available
  * $0.36, prompts <= 200k tokens    
  $0.72, prompts > 200k    
  $8.10 / 1,000,000 tokens per hour (storage price)

  ---

  * Grounding with Google Search{% sup %}*{% /sup %}
  * Not available{% sup %}**{% /sup %}
  * 5,000 free search requests per month (shared across all Gemini 3 and newer models),
  then $14 per 1,000 requests (subject to a [daily cap](/docs/pricing#pricing-for-tools) of 1,500 requests per day).

  ---

  * Grounding with Google Maps
  * Not available{% sup %}**{% /sup %}
  * 5,000 requests per month (free, shared across all Gemini 3 and newer models), then $14 / 1,000
  search queries.

  ---

  * Used to improve our products
  * Not available
  * [No](/docs/terms)
  {% /table %}

  {% sup %}*{% /sup %} A customer-submitted request to Gemini may result in one or
    more queries to Google Search. You will be charged for each individual search
    query performed.

  {% sup %}**{% /sup %} Can be tested in Google AI Studio.
    

  {% /tab %}

  {% tab title="Contributor" %}
  {% callout type="note" %}
  The Gemini API Contributor Tier is offered as a private preview on an
      invite-only basis. Speed and reliability are equivalent to
      [Standard Tier inference](/docs/optimization). Eligible users will be invited by
      email and see a callout in AI Studio.

  {% /callout %}

  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD{% sup %}*{% /sup %}

  ---

  * Input price
  * Not available
  * $1.00, prompts <= 200k tokens    
  $2.00, prompts > 200k tokens

  ---

  * Output price (including thinking tokens)
  * Not available
  * $6.00, prompts <= 200k tokens    
  $9.00, prompts > 200k tokens

  ---

  * Context caching price
  * Not available
  * $0.10, prompts <= 200k tokens    
  $0.20, prompts > 200k tokens    
  $4.50 / 1,000,000 tokens per hour (storage price)

  ---

  * Used to improve our products
  * Not available
  * [Yes](/docs/logs-policy#contributor-tier)
  {% /table %}

  {% sup %}*{% /sup %} Discounts and model availability are subject to change.
    

  {% /tab %}

{% /tabs %}

