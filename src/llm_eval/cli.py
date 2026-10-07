"""
CLI.PY (COMMAND LINE INTERFACE, not 'Client')

PURPOSE: Turns typed command into a full evaluation run (cmd_run) or a single test call (cmd_ping).
PRIMARY COMPONTENT: main (defines the commands and options); cmd_run; cmd_ping; _client (picks mock or Azure client); _load_env (reads .env)
RUN FLOW (cmd_run): Load models and cases -> build agent and judge clients -> run_eval -> summarize -> check thresholds -> write results.json, report.md -> exit 0 (pass) or 1 (fail, CI only)

EXAMPLE COMMANDS 
- llm-eval run --provider mock:                                                                 used for free, offline test of system (no token usage)
- llm-eval run --provider azure --agent agent-gpt-4.1-mini --judge judge-gpt-5-mini-2           provider set to azure (only azure and mock available); models: any deployed listed in models.yaml; judge: any deployment listed in models.yaml; names of models and judges must match exactly 
- llm-eval ping --deployment agent-gpt-4.1-mini                                                 pings a model to check it responds. saying hello to one another

WHAT USES CLI.PY
- llm-eval command (which itself is defined in pyproject.toml)

RELATIONSHIP TO PROVIDERS.PY
- cli.py decides which client to build; providers.py defines how each client talks to a model
- Client: object that does the talking. Sends request to Azure and hands back reply.
- Azure OpenAI: Where models are deployed. Where we reach out with prompt and expect response from.
"""


# A. IMPORTS

#Import: Python Settings
from __future__ import annotations                      # allows modern type hints such as list[str] | None

#Import: Standard Librarys
import argparse                                         # reads commands and options typed in Terminal
import json                                             # reads an earlier run's results.json (baseline)
import sys                                              # sys.exit stops the program with a message
from datetime import datetime, timezone                 # timestamps each run in UTC
from pathlib import Path                                # file paths that work on any OS

#Import: third party (installed with pip)
import yaml                                             # YAML: stores settings and data in way both people and programs can read. Standard for such a project; other options: JSON, TOML, CSV, Python Dictonaries 

#Import: Interal, Cross File Imprts
from .agent import RagAgent, load_chunks                                                                # RagAgent (agent under test); load_chunks (provides its knowledge base)
from .cases import load_cases                                                                           # load_cases: provides golden test. Standard term for fixed list of test questions where good answers defined
from .pricing import load_models                                                                        # reads config/models.yaml and turns it into a Python dictionary; one entry per deployment, settings and prices defined
from .providers import AzureOpenAIClient, MockClient, mock_agent_handler, mock_judge_handler            # AzureOpenAIClient = real Azure model client; MockClient = free fake client; mock_*_handler = the scripts the fakes follow
from .report import write_outputs                                                                       # writes results.json and report.md
from .runner import check_thresholds, run_eval, summarise                                               # runs the cases, totals scores, compares to limits


# B. HELPERS
def _load_env() -> None:
    try:
        from dotenv import load_dotenv                  # optional: only in the [azure] extra
    except ImportError:
        return                                          # mock runs and CI work without it
    load_dotenv()                                       # endpoint and key now readable via os.environ


def _client(provider: str, deployment: str, models: dict, mock_handler, mock_name: str):
    if provider == "mock":
        return MockClient(mock_handler, model=mock_name)    # scripted answers, no network, no cost
    if deployment not in models:
        sys.exit(f"Deployment {deployment!r} is not in config/models.yaml")  # fail early on a typo
    return AzureOpenAIClient(deployment, reasoning=models[deployment].get("reasoning", False))
    # reasoning flag comes from models.yaml, so gpt-5 models are never sent temperature


# C. COMMANDS
def cmd_ping(args: argparse.Namespace) -> int:
  
    models = load_models(args.models)
    client = _client("azure", args.deployment, models, None, "")   # always live; no mock for ping
    r = client.complete("You are a test.", "Reply with the single word: pong", max_tokens=200)
    print(
        f"{args.deployment}: {r.text!r} | in={r.input_tokens} out={r.output_tokens} "
        f"reasoning={r.reasoning_tokens} latency={r.latency_s:.2f}s"
    )
    return 0                                            # 0 = success to the shell


def cmd_run(args: argparse.Namespace) -> int:
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