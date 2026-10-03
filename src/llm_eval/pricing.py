"""Model registry and token cost. Lives in config/models.yaml so it can be audited."""

from __future__ import annotations

from pathlib import Path

import yaml


def load_models(path: str | Path) -> dict[str, dict]:
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))["models"]


def cost_usd(models: dict[str, dict], deployment: str, in_tok: int, out_tok: int) -> float:
    if deployment not in models:
        raise KeyError(f"No entry for deployment {deployment!r} in config/models.yaml.")
    m = models[deployment]
    return (in_tok * m["input_per_mtok"] + out_tok * m["output_per_mtok"]) / 1_000_000
