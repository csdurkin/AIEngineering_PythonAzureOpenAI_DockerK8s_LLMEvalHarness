#REPORT.PY
#Purpose: Turns a run's scores into two files: results.json (full data, machine-readable)
#   and report.md (human-readable summary), with optional comparison against an earlier run.
#Primary Components:
#   A. Imports and HEADLINE (which metrics appear in the summary table, and how to format each)
#   B. Formatting helpers: _fmt (one value), _delta (change against baseline)
#   C. to_markdown: builds report.md section by section
#   D. write_outputs: writes both files to results/<run>/
#report.md sections: run details and PASS/FAIL > threshold breaches > headline metrics
#   (with baseline and change, if given) > by category > failing cases with question and answer
#Used by: cli.py (cmd_run), after runner.py has scored every case
#Authorship: drafted by Claude Opus 5.5 (Anthropic); reviewed and commented by Connor.

"""Markdown and JSON reporting, with optional comparison against a baseline run."""

# A. IMPORTS AND HEADLINE METRICS
from __future__ import annotations

import json
from pathlib import Path

from .runner import CaseResult                          # one scored case; defined in runner.py

# (key in summary, label in report, format kind)
HEADLINE = [
    ("accuracy", "Accuracy", "pct"),
    ("relevance", "Relevance (judge)", "pct"),
    ("safety_pass_rate", "Safety pass rate", "pct"),
    ("retrieval_hit_rate", "Retrieval hit rate", "pct"),
    ("latency_p50_s", "Latency p50 (s)", "sec"),        # median: half of calls were faster
    ("latency_p95_s", "Latency p95 (s)", "sec"),        # 95% were faster; shows the slow tail
    ("cost_per_case_usd", "Agent cost per case (USD)", "usd"),
    ("judge_cost_usd", "Judge cost, total (USD)", "usd"),   # cost of evaluating, kept separate from the agent's
]


# B. FORMATTING HELPERS
def _fmt(value: float | None, kind: str) -> str:
    """Format one value: 0.85 > 85.0%, 1.234 > 1.23, 0.0007 > $0.00070."""
    if value is None:
        return "n/a"                                    # e.g. no answer cases in a category
    return {"pct": f"{value:.1%}", "sec": f"{value:.2f}", "usd": f"${value:.5f}"}[kind]
    # a dictionary used as a lookup: pick the format string by kind


def _delta(cur: float | None, base: float | None, kind: str) -> str:
    """Change against the baseline run, with a + or - sign."""
    if cur is None or base is None:
        return ""
    d = cur - base
    if kind == "pct":
        return f"{d * 100:+.1f} pts"                    # percentage points, e.g. 80% to 85% = +5.0 pts
    return f"{d:+.5f}" if kind == "usd" else f"{d:+.2f}"


# C. MARKDOWN REPORT
def to_markdown(
    summary: dict,
    results: list[CaseResult],
    failures: list[str],
    meta: dict,
    baseline: dict | None = None,
) -> str:
    """Build report.md as a list of lines, then join them."""
    # Run details and overall status
    out = ["# LLM evaluation report", ""]
    out += [f"- Agent model: `{meta['agent_model']}`", f"- Judge model: `{meta['judge_model']}`"]
    out += [f"- Provider: {meta['provider']}", f"- Run at (UTC): {meta['run_at']}"]   # ADDED by Connor: traceability
    out += [f"- Cases: {summary['n']}", f"- Status: **{'FAIL' if failures else 'PASS'}**", ""]
    if failures:
        out += ["## Threshold breaches", ""] + [f"- {f}" for f in failures] + [""]

    # Headline table; two extra columns only when a baseline is given
    head = "| Metric | Value |" + (" Baseline | Change |" if baseline else "")
    sep = "|---|---|" + ("---|---|" if baseline else "")
    out += ["## Headline metrics", "", head, sep]
    for key, label, kind in HEADLINE:
        row = f"| {label} | {_fmt(summary.get(key), kind)} |"   # .get returns None if missing
        if baseline:
            b = baseline.get(key)
            row += f" {_fmt(b, kind)} | {_delta(summary.get(key), b, kind)} |"
        out.append(row)

    # By category: usage, composition, out-of-scope, safety
    out += [
        "",
        "## By category",
        "",
        "| Category | Cases | Accuracy | Relevance | Safety |",
        "|---|---|---|---|---|",
    ]
    for cat, g in summary["by_category"].items():
        out.append(
            f"| {cat} | {g['n']} | {_fmt(g['accuracy'], 'pct')} | "
            f"{_fmt(g['relevance'], 'pct')} | {_fmt(g['safety_pass_rate'], 'pct')} |"
        )

    # Failing cases: anything below full accuracy or failing safety, with the actual answer
    bad = [r for r in results if (r.accuracy is not None and r.accuracy < 1) or not r.safety_passed]
    out += ["", "## Failing cases", ""]
    if not bad:
        out.append("None.")
    for r in bad:
        out += [
            f"### {r.id} ({r.category})",
            f"- Question: {r.question}",
            f"- Answer: {r.answer}",
            f"- Accuracy: {_fmt(r.accuracy, 'pct')}; safety reasons: {r.safety_reasons or 'none'}",
            "",
        ]
    return "\n".join(out) + "\n"                        # one string, one line per item


# D. WRITE FILES
def write_outputs(
    out_dir: str | Path,
    summary: dict,
    results: list[CaseResult],
    failures: list[str],
    meta: dict,
    baseline: dict | None = None,
) -> tuple[Path, Path]:
    """Write results.json and report.md; return both paths."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)              # create results/latest/ if missing; no error if it exists
    json_path, md_path = out / "results.json", out / "report.md"   # / joins paths
    payload = {
        "meta": meta,
        "summary": summary,                             # a later run reads this back as its --baseline
        "failures": failures,
        "cases": [r.to_dict() for r in results],        # every case: answer, scores, tokens, cost
    }
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    md_path.write_text(to_markdown(summary, results, failures, meta, baseline), encoding="utf-8")
    return json_path, md_path