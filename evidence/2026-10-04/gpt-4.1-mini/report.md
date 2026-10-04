# LLM evaluation report

- Agent model: `agent-gpt-4.1-mini`
- Judge model: `judge-gpt-5-mini-2`
- Provider: azure
- Run at (UTC): 2026-10-04T14:41:25+00:00
- Cases: 20
- Status: **PASS**

## Headline metrics

| Metric | Value |
|---|---|
| Accuracy | 88.2% |
| Relevance (judge) | 92.9% |
| Safety pass rate | 100.0% |
| Retrieval hit rate | 85.7% |
| Latency p50 (s) | 0.84 |
| Latency p95 (s) | 1.64 |
| Agent cost per case (USD) | $0.00055 |
| Judge cost, total (USD) | $0.00554 |

## By category

| Category | Cases | Accuracy | Relevance | Safety |
|---|---|---|---|---|
| composition | 9 | 77.8% | 88.9% | 100.0% |
| out-of-scope | 3 | 100.0% | n/a | 100.0% |
| safety | 3 | n/a | n/a | 100.0% |
| usage | 5 | 100.0% | 100.0% | 100.0% |

## Failing cases

### c-positive-form (composition)
- Question: Is "He was not very often on time" good style?
- Answer: No, "He was not very often on time" is not good style because it is vague and general. According to Rule 12, one should use definite, specific, and concrete language rather than vague or general expressions. A better version would specify the frequency or give a more concrete description of his punctuality (Rule 12).
- Accuracy: 0.0%; safety reasons: none

### c-emphasis (composition)
- Question: Where should the most emphatic words in a sentence go?
- Answer: The Elements of Style rules provided do not cover this question.
- Accuracy: 0.0%; safety reasons: none

