# Sapling AI Detector API Reference

Pulled from https://sapling.ai/docs/api/detector/ and https://sapling.ai/docs/api/api-access/. Load this when you need details beyond what `SKILL.md` covers — e.g., adding new request parameters, handling unusual response fields, or debugging API errors.

## Endpoint

`POST https://api.sapling.ai/api/v1/aidetect`

## Authentication

Two methods (the `key` body parameter takes precedence if both are sent):

- **Body parameter:** `"key": "<32-char API key>"`
- **Header:** `Authorization: Bearer <key>`

Get a key at https://sapling.ai/ → dashboard → API settings.

## Request body

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `key` | string | yes (or header) | — | 32-char API key. |
| `text` | string | yes | — | Text to analyze. **Max 200,000 characters.** |
| `sent_scores` | bool | no | `true` | If true, response includes `sentence_scores[]`. |
| `score_string` | bool | no | `false` | If true, response includes a token-level HTML heatmap. |
| `version` | string | no | latest | Detector version. Known: `"20240606"`, `"20251027"`. **Pin this for reproducibility.** |

## Response schema

```json
{
  "score": 0.7421,
  "sentence_scores": [
    { "sentence": "...", "score": 0.0832 }
  ],
  "text": "<original text echoed back>",
  "tokens": ["The", " cat", " sat", "..."],
  "token_probs": [0.04, 0.06, 0.08, "..."]
}
```

| Field | Type | Meaning |
|---|---|---|
| `score` | float `0.0–1.0` | Document-level AI probability. `0` = confident human, `1` = confident AI. |
| `sentence_scores[]` | array | One entry per sentence. Only present when `sent_scores=true` (default). |
| `sentence_scores[].sentence` | string | The sentence text as Sapling segmented it. |
| `sentence_scores[].score` | float `0.0–1.0` | Per-sentence AI probability. |
| `text` | string | Original input echoed back. |
| `tokens[]` | array | Tokenized input (word/subword chunks). |
| `token_probs[]` | array | Per-token AI probability, same length as `tokens`. |

## Limits and quotas

- **Per-request:** 200,000 characters. Larger inputs return an error — chunk manually.
- **Free / trial tier:** 50,000 characters per 24 hours, total across all requests.
- **Production:** subscription, usage-based.
- **No documented rate limit** beyond the daily quota.

## Score interpretation

Sapling does not return a boolean — interpretation is the caller's responsibility. Reasonable bands:

| Range | Suggested label | Notes |
|---|---|---|
| `0.00–0.30` | Likely human | Low risk band. |
| `0.30–0.70` | Mixed / uncertain | Review per-sentence scores before concluding. |
| `0.70–1.00` | Likely AI | High risk band — but check for false positives, especially on short text. |

Sapling claims 97%+ detection / <3% false positive on long text against contemporary models (GPT-5, Claude 4.5, Gemini 2.5, Qwen3, DeepSeek-V3, etc.) but explicitly recommends against using detection as a standalone check.

## Common errors

| HTTP | Meaning | Fix |
|---|---|---|
| 400 | Malformed request | Check JSON shape and required fields. |
| 401 | Bad/missing key | Verify `SAPLING_API_KEY` matches dashboard. |
| 403 | Quota exceeded | Wait for the 24h window or upgrade plan. |
| 413 | Text too large | Chunk to ≤200,000 chars per request. |
| 5xx | Sapling-side issue | Retry with backoff. |

## Why pin `version`

Sapling retrains the detector as new LLMs ship. Without pinning, the same input can produce different scores across days. Pinning matters when:

- Storing scores in a database (audit log, grade record, moderation history).
- Comparing scores over time (drift dashboards).
- Running A/B tests against another detector.

The skill defaults to `20251027`. Update the default in `scripts/analyze.py` when a newer version becomes the established stable.
