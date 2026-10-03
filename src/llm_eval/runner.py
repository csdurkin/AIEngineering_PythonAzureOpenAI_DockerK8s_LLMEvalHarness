#RUNNER.PY
#Purpose: The engine. Sends every case to the agent, scores each answer with metrics.py,
#   then totals the scores and compares them with the pass/fail thresholds.
#Primary Components:
#   A. Imports
#   B. CaseResult: the scored record for one case (one row in results.json)
#   C. run_eval: the main loop, case by case
#   D. Aggregation helpers: percentile, _mean, _group
#   E. summarise: totals for the whole run and per category
#   F. check_thresholds: compares totals with thresholds.yaml; returns breaches
#Per case: agent.answer > judge relevance (answer cases only) > safety > accuracy > retrieval > cost
#Used by: cli.py (cmd_run); report.py reads CaseResult
#Authorship: drafted by Claude Opus 5.5 (Anthropic); reviewed and commented by Connor.

"""Runs cases through the agent, scores them, and aggregates."""

# A. IMPORTS
from __future__ import annotations

from dataclasses import asdict, dataclass               # asdict turns a dataclass into a plain dictionary

from . import metrics                                   # import the module; call as metrics.accuracy(...)
from .agent import RagAgent
from .cases import Case
from .pricing import cost_usd
from .providers import LLMClient


# B. ONE SCORED CASE
@dataclass
class CaseResult:
    # What was asked and answered
    id: str
    category: str
    behaviour: str
    question: str
    answer: str
    sources: list[str]                                  # rule files retrieval passed to the model
    # Scores (None = metric does not apply to this case)
    accuracy: float | None
    relevance: float | None
    safety_passed: bool
    safety_reasons: list[str]
    retrieval_hit: bool | None
    # Agent call: speed, size and cost
    latency_s: float
    input_tokens: int
    output_tokens: int
    agent_cost_usd: float
    judge_cost_usd: float                               # kept separate: the cost of evaluating, not of answering

    def to_dict(self) -> dict:
        return asdict(self)                             # for json.dumps in report.py


# C. MAIN LOOP
def run_eval(
    cases: list[Case], agent: RagAgent, judge: LLMClient, pricing: dict
) -> list[CaseResult]:
    """Answer and score every case. pricing = the models.yaml registry."""
    results = []
    for case in cases:
        resp = agent.answer(case.question)              # retrieval + one agent call (COST FLAG when live)
        llm = resp.llm                                  # the LLMResult: text, tokens, latency
        rel, judge_cost = None, 0.0                     # defaults for abstain and refuse cases
        if case.behaviour == "answer":                  # relevance only makes sense for a real answer
            try:
                rel, jr = metrics.relevance(judge, case.question, resp.text)   # second call (COST FLAG)
                judge_cost = cost_usd(pricing, jr.model, jr.input_tokens, jr.output_tokens)
            except ValueError:
                rel = None                              # FIX: unparseable judge reply is n/a, not a crashed paid run
        sf = metrics.safety(case, resp.text)
        results.append(
            CaseResult(
                id=case.id,
                category=case.category,
                behaviour=case.behaviour,
                question=case.question,
                answer=resp.text,
                sources=resp.sources,
                accuracy=metrics.accuracy(case, resp.text),
                relevance=rel,
                safety_passed=sf.passed,
                safety_reasons=sf.reasons,
                retrieval_hit=metrics.retrieval_hit(case, resp.sources),
                latency_s=llm.latency_s,
                input_tokens=llm.input_tokens,
                output_tokens=llm.output_tokens,
                agent_cost_usd=cost_usd(pricing, llm.model, llm.input_tokens, llm.output_tokens),
                judge_cost_usd=judge_cost,
            )
        )
    return results


# D. AGGREGATION HELPERS
def percentile(values: list[float], p: float) -> float:
    """Linear interpolation between closest ranks. p=50 is the median; p=95 the slow tail."""
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * p / 100                          # position in the sorted list, may fall between two items
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)        # the items either side
    return s[lo] + (s[hi] - s[lo]) * (k - lo)           # weighted between them


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None   # None, not 0, when nothing to average


def _group(results: list[CaseResult]) -> dict:
    """Core scores for any set of results: the whole run or one category."""
    return {
        "n": len(results),
        "accuracy": _mean([r.accuracy for r in results if r.accuracy is not None]),     # skips refuse cases
        "relevance": _mean([r.relevance for r in results if r.relevance is not None]),  # answer cases only
        "safety_pass_rate": _mean([float(r.safety_passed) for r in results]),           # True=1.0, False=0.0
    }


# E. RUN SUMMARY
def summarise(results: list[CaseResult]) -> dict:
    """Totals for the whole run, plus the same core scores per category."""
    hits = [float(r.retrieval_hit) for r in results if r.retrieval_hit is not None]
    latencies = [r.latency_s for r in results]
    agent_cost = sum(r.agent_cost_usd for r in results)
    summary = _group(results)                           # start with the core scores
    summary.update(                                     # then add run-level figures
        {
            "retrieval_hit_rate": _mean(hits),
            "latency_p50_s": percentile(latencies, 50),
            "latency_p95_s": percentile(latencies, 95),
            "input_tokens": sum(r.input_tokens for r in results),
            "output_tokens": sum(r.output_tokens for r in results),
            "agent_cost_usd": agent_cost,
            "judge_cost_usd": sum(r.judge_cost_usd for r in results),
            "cost_per_case_usd": agent_cost / len(results) if results else 0.0,
        }
    )
    cats = sorted({r.category for r in results})        # set removes duplicates; sorted for stable order
    summary["by_category"] = {c: _group([r for r in results if r.category == c]) for c in cats}
    return summary


# F. PASS/FAIL
def check_thresholds(summary: dict, t: dict) -> list[str]:
    """Return a list of human-readable threshold failures. Empty means pass."""
    failures = []
    checks = [                                          # (summary key, thresholds.yaml key, pass test)
        ("accuracy", "min_accuracy", lambda v, lim: v >= lim),          # lambda = small unnamed function
        ("relevance", "min_relevance", lambda v, lim: v >= lim),
        ("safety_pass_rate", "min_safety_pass_rate", lambda v, lim: v >= lim),
        ("latency_p95_s", "max_latency_p95_s", lambda v, lim: v <= lim),
        ("cost_per_case_usd", "max_cost_per_case_usd", lambda v, lim: v <= lim),
    ]
    for metric, key, ok in checks:
        value = summary.get(metric)
        if key in t and value is not None and not ok(value, t[key]):   # skip unset thresholds and n/a values
            failures.append(f"{metric}={value:.4f} breaches {key}={t[key]}")
    return failures