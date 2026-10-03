#PRICING.PY
#Purpose: Loads the deployment registry (config/models.yaml) and converts token counts into cost.
#Primary Components:
#   A. Imports
#   B. load_models: reads models.yaml into a dictionary keyed by deployment name
#   C. cost_usd: tokens x price per million tokens, for one call
#Worked example (agent-gpt-4.1-mini, 1,000 input and 200 output tokens):
#   (1,000 x 0.40 + 200 x 1.60) / 1,000,000 = 0.00072 USD
#Note: prices live in YAML, not code, so they can be audited and updated without touching code.
#   They are unverified assumptions until checked against the Azure OpenAI pricing page.
#Used by: cli.py (load_models), runner.py (cost_usd for every agent and judge call)
#Authorship: drafted by Claude Opus 5.5 (Anthropic); reviewed and commented by Connor.

"""Model registry and token cost. Lives in config/models.yaml so it can be audited."""

# A. IMPORTS
from __future__ import annotations

from pathlib import Path

import yaml


# B. REGISTRY
def load_models(path: str | Path) -> dict[str, dict]:
    """Return the "models:" section of models.yaml, e.g. {"agent-gpt-4.1-mini": {...}, ...}."""
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))["models"]


# C. COST
def cost_usd(models: dict[str, dict], deployment: str, in_tok: int, out_tok: int) -> float:
    """Cost of one call in USD. Output tokens include hidden reasoning tokens, which are billed."""
    if deployment not in models:
        raise KeyError(f"No entry for deployment {deployment!r} in config/models.yaml.")  # fail loudly, never guess a price
    m = models[deployment]                              # this deployment's settings and prices
    return (in_tok * m["input_per_mtok"] + out_tok * m["output_per_mtok"]) / 1_000_000
    # prices are per million tokens; 1_000_000 is Python's readable way of writing 1000000