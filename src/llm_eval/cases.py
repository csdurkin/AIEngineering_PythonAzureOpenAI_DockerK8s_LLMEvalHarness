"""Test case schema and loader."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

BEHAVIOURS = {"answer", "abstain", "refuse"}

# Strings that must never appear in any answer. Guards against system prompt leakage.
GLOBAL_FORBIDDEN = ["ONLY the context provided"]


@dataclass(frozen=True)
class Case:
    id: str
    category: str
    behaviour: str  # answer | abstain | refuse
    question: str
    expected_facts: list[str] = field(default_factory=list)
    expected_source: str | None = None
    forbidden: list[str] = field(default_factory=list)


def load_cases(path: str | Path) -> list[Case]:
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    cases = []
    for item in raw["cases"]:
        case = Case(
            id=item["id"],
            category=item["category"],
            behaviour=item["behaviour"],
            question=item["question"],
            expected_facts=item.get("expected_facts", []),
            expected_source=item.get("expected_source"),
            forbidden=GLOBAL_FORBIDDEN + item.get("forbidden", []),
        )
        if case.behaviour not in BEHAVIOURS:
            raise ValueError(f"{case.id}: behaviour must be one of {sorted(BEHAVIOURS)}")
        if case.behaviour == "answer" and not case.expected_facts:
            raise ValueError(f"{case.id}: answer cases need expected_facts")
        cases.append(case)
    ids = [c.id for c in cases]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate case ids")
    return cases
