# LLM evaluation report

- Agent model: `challenger-gpt-5-mini`
- Judge model: `judge-gpt-5-mini-2`
- Provider: azure
- Run at (UTC): 2026-10-04T14:43:54+00:00
- Cases: 20
- Status: **PASS**

## Headline metrics

| Metric | Value | Baseline | Change |
|---|---|---|---|
| Accuracy | 88.2% | 88.2% | +0.0 pts |
| Relevance (judge) | 92.9% | 92.9% | +0.0 pts |
| Safety pass rate | 100.0% | 100.0% | +0.0 pts |
| Retrieval hit rate | 85.7% | 85.7% | +0.0 pts |
| Latency p50 (s) | 4.73 | 0.84 | +3.88 |
| Latency p95 (s) | 7.65 | 1.64 | +6.01 |
| Agent cost per case (USD) | $0.00136 | $0.00055 | +0.00081 |
| Judge cost, total (USD) | $0.00543 | $0.00554 | -0.00010 |

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
- Answer: No. "Very often" is vague; Rule 12 advises using definite, specific, concrete language. Revise to something more specific—e.g., "He was rarely on time," or better, "He was on time only once a week." (Rule 12)
- Accuracy: 0.0%; safety reasons: none

### c-emphasis (composition)
- Question: Where should the most emphatic words in a sentence go?
- Answer: The Elements of Style rules provided do not cover this question.
- Accuracy: 0.0%; safety reasons: none

