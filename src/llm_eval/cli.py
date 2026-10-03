#CLI.PY
#Purpose: The command line entry point. Turns a typed command into a full evaluation run or a single test call.
#Primary Components:
#   A. Imports
#   B. Helpers: _load_env (reads .env), _client (picks a mock or Azure client)
#   C. Commands: cmd_ping (one live call), cmd_run (the full evaluation)
#   D. main: defines the commands and options, then runs the one typed
#Run flow (cmd_run): load models and cases > build agent and judge clients > run_eval > summarise >
#   check thresholds > write results.json and report.md > exit 0 (pass) or 1 (fail, CI only)
#Examples:
#   llm-eval run --provider mock                                    (free, offline)
#   llm-eval run --provider azure --agent agent-gpt-4.1-mini --judge judge-gpt-5-mini-2   (COST FLAG)
#   llm-eval ping --deployment agent-gpt-4.1-mini                   (COST FLAG: one tiny call)
#Used by: the llm-eval command, created by [project.scripts] in pyproject.toml
#Relationship to providers.py: cli.py decides WHICH client to build; providers.py defines HOW each client talks to a model.
#Authorship: drafted by Claude Opus 5.5 (Anthropic); reviewed and commented by Connor.

"""Command line entry point."""

# A. IMPORTS
from __future__ import annotations                      # allows modern type hints such as list[str] | None

import argparse                                         # reads commands and options typed in Terminal
import json                                             # reads an earlier run's results.json (baseline)
import sys                                              # sys.exit stops the program with a message
from datetime import datetime, timezone                 # timestamps each run in UTC
from pathlib import Path                                # file paths that work on any OS

import yaml                                             # reads thresholds.yaml

from .agent import RagAgent, load_chunks                # the agent under test and its knowledge base
from .cases import load_cases                           # the golden test set
from .pricing import load_models                        # deployment registry from models.yaml
from .providers import AzureOpenAIClient, MockClient, mock_agent_handler, mock_judge_handler
from .report import write_outputs                       # writes results.json and report.md
from .runner import check_thresholds, run_eval, summarise   # runs the cases, totals scores, compares to limits


# B. HELPERS
def _load_env() -> None:
    """Load .env into the environment, if python-dotenv is installed."""
    try:
        from dotenv import load_dotenv                  # optional: only in the [azure] extra
    except ImportError:
        return                                          # mock runs and CI work without it
    load_dotenv()                                       # endpoint and key now readable via os.environ


def _client(provider: str, deployment: str, models: dict, mock_handler, mock_name: str):
    """Return a mock client (free) or an Azure client (live) for one role: agent or judge."""
    if provider == "mock":
        return MockClient(mock_handler, model=mock_name)    # scripted answers, no network, no cost
    if deployment not in models:
        sys.exit(f"Deployment {deployment!r} is not in config/models.yaml")  # fail early on a typo
    return AzureOpenAIClient(deployment, reasoning=models[deployment].get("reasoning", False))
    # reasoning flag comes from models.yaml, so gpt-5 models are never sent temperature


# C. COMMANDS
def cmd_ping(args: argparse.Namespace) -> int:
    """One tiny live call to prove the endpoint, key and deployment work."""
    models = load_models(args.models)
    client = _client("azure", args.deployment, models, None, "")   # always live; no mock for ping
    r = client.complete("You are a test.", "Reply with the single word: pong", max_tokens=200)
    print(
        f"{args.deployment}: {r.text!r} | in={r.input_tokens} out={r.output_tokens} "
        f"reasoning={r.reasoning_tokens} latency={r.latency_s:.2f}s"
    )
    return 0                                            # 0 = success to the shell


def cmd_run(args: argparse.Namespace) -> int:
    """Run every case through the agent, score it, compare to thresholds and write the report."""
    models = load_models(args.models)
    cases = load_cases(args.cases)
    if args.limit:
        cases = cases[: args.limit]                     # --limit 3 runs only the first 3 (cheap test)

    agent_llm = _client(args.provider, args.agent, models, mock_agent_handler, "mock-agent")
    judge_llm = _client(args.provider, args.judge, models, mock_judge_handler, "mock-judge")
    agent = RagAgent(agent_llm, load_chunks(args.docs))     # agent = model + Strunk rules

    baseline = None
    if args.baseline:                                       # load first: a bad path fails before any paid calls
        baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8"))["summary"]

    results = run_eval(cases, agent, judge_llm, models)     # one scored result per case
    summary = summarise(results)                            # totals: accuracy, safety, cost, latency
    thresholds = yaml.safe_load(Path(args.thresholds).read_text(encoding="utf-8"))
    failures = check_thresholds(summary, thresholds)        # list of breaches; empty = pass

    meta = {                                                # recorded with every run for traceability
        "agent_model": agent_llm.model,
        "judge_model": judge_llm.model,
        "provider": args.provider,
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    json_path, md_path = write_outputs(args.out, summary, results, failures, meta, baseline)
    print(md_path.read_text(encoding="utf-8"))              # show the report in Terminal
    print(f"Wrote {json_path} and {md_path}")
    return 1 if (failures and args.fail_on_threshold) else 0    # 1 makes CI mark the build as failed


# D. MAIN: command and option definitions
def main(argv: list[str] | None = None) -> int:
    _load_env()
    p = argparse.ArgumentParser(prog="llm-eval")
    sub = p.add_subparsers(dest="command", required=True)  # sub-commands: run, ping

    # llm-eval run
    run = sub.add_parser("run", help="Run the evaluation")
    run.add_argument("--provider", choices=["mock", "azure"], default="mock")   # mock by default: safe and free
    run.add_argument("--agent", default="agent-gpt-4.1-mini", help="Agent deployment name")
    run.add_argument("--judge", default="judge-gpt-5-mini-2", help="Judge deployment name")
    run.add_argument("--cases", default="data/cases.yaml")
    run.add_argument("--docs", default="data/docs")
    run.add_argument("--models", default="config/models.yaml")
    run.add_argument("--thresholds", default="config/thresholds.yaml")
    run.add_argument("--out", default="results/latest")     # git-ignored folder
    run.add_argument("--baseline", help="results.json from an earlier run to compare against")
    run.add_argument("--limit", type=int, help="Only run the first N cases")
    run.add_argument(
        "--fail-on-threshold",
        action="store_true",                                # flag: present = True, absent = False
        help="Exit non-zero if any threshold is breached (for CI)",
    )
    run.set_defaults(func=cmd_run)                          # "run" calls cmd_run

    # llm-eval ping
    ping = sub.add_parser("ping", help="One live call to test a deployment")
    ping.add_argument("--deployment", required=True)
    ping.add_argument("--models", default="config/models.yaml")
    ping.set_defaults(func=cmd_ping)                        # "ping" calls cmd_ping

    args = p.parse_args(argv)                               # read what was typed
    return args.func(args)                                  # run the matching command


if __name__ == "__main__":                                  # only when run directly, not when imported
    raise SystemExit(main())                                # pass the exit code to the shell