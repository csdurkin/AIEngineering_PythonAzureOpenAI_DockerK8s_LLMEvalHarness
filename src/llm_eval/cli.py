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


# HELPER: _load_env(): None - 
# PURPOSE: Copies Azure endpoint and API key from local .evn file into environment, allowing them to be read without appearing in code
# WEHERE WILL APPEAR: main(); _client() - builds clients for agent and judge (Azure or mock), former needs key; providers.py - AzureOpenAICilent reads endpoint/key; scripts/ping.py 
def _load_env() -> None: 
    try: 
        from dotenv import load_dotenv                  # dotevnv: in python-dotenv package; not in repo. Declared in pyproject.toml
    except ImportError: 
        return                                          # mock runs and CI work without env
    load_dotenv()                                       # endpoint and key now readable via os.environment
    

# HELPER:     _client()
# ARGS:         provider (azure or mock); deployment (Azure model name); models (registry - models.yaml); MockHandler (fake reply); mock_name (label for mock client)
# PURPOSE:      Build one model client, either Mock or Azure
# RETURNS:      A client with a complete() method (by ysing AzureOpenAICLient or MockClient in imported from)
# NOTES:        _client is never called from terminal. cmd_run calls it and provides arguments
def _client(provider: str, deployment: str, models: dict, mock_handler, mock_name: str):
    
    if provider == "mock":
        return MockClient(mock_handler, model=mock_name)
    
    #ERROR: provided deployment not part of harness configuration
    if deployment not in models:
        sys.exit(f"Deployment {deployment!r} is not in config/models.yaml.")            # !r - provides quoted text, good for error messages bc empty spaces ' '


    # RETURN:   Build an Azure client for this deployment. Flag for easoning (True/False) comes from models.yaml, defaulting to False; notes if model thinks or not first before answering
    # NOTES:    Older models (gpt-4.1-mini) take a temperature setting to control randomness. Reasoning models (gpt-5-mini) fix the temperature themselves and return an error if it is sent. Reasoning flag tells client to either provide temperature or not.
    # NOTES:    Set reasoning to be the deployment's reasoning key under the models directory; False back up assumes standard model, standard describing how model behaives, not its age since release
    return AzureOpenAIClient(deployment, reasoning=models[deployment].get("reasoning", False))



# C. COMMANDS


def cmd_ping(args: argparse.Namespace) -> int: 
    
    # args.model: file path to models file, default config/models.yaml/, user not obligated to provide 
    models = load_models(args.models)
    
    # ARGS: provider (azure); deployment (Azure model name); models; None (no fake reply, not mock); "" (no label for mock client), Ping always live, never mock
    client = _client("azure", args.deployment, models, None, "")            

    # NOTES: Completion is standard word for a model's generated reply. OpenAI's SDK uses chat.completions.create(...), and complete here is our wrapper around that SDK call
    r = client.complete("You are a test.", "Reply with the single word: pong", max_tokens=200)
    
    print(
        f"{args.deployment}: {r.text!r} | in={r.input_tokens} out={r.output_tokens} "   # Prints the model name, the reply text, then input and output token counts.
        f"reasoning={r.reasoning_tokens} latency={r.latency_s:.2f}s"                    # Hidden reasoning tokens (0 for standard models); call time in seconds, 2 decimal places
    )
    
    # RETURN: 0 
    # NOTES: command-line program ends by handing a number back to the terminal. Return 0 when successful; failure returns a '1' automatically by python
    return 0 
                                           
# cmd_run: accepts user arguments, loads models and cases, creates agent/judge clients, RAG agent being test, calls run_eval (), summarises results, checks thresholds, checks failures, print results, return exit code for CI
def cmd_run(args: argparse.Namespace) -> int:
    
    models = load_models(args.models)
    # args.cases: file path to cases file, default config/models.yaml/, user not obligated to provide 
    cases = load_cases(args.cases)
    
    # args.limit - User setting how many cases allowed to run; default run all cases pulled from file path
    if args.limit:
        cases = cases[: args.limit]                         

    # create clients for agent and judge. In run, only one provider allowed (no mock/Azure mix); defined in providers and imported: mock_agent_handler, mock_judge_handle, "mock-agent", "mock-judge")
    # ARGS: provider (azure or mock); deployment (Azure model name); models (registry - models.yaml); MockHandler (fake reply); mock_name (label for mock client)
    # NOTES: Why does agent_llm become an RAG agent and not judge_llm? Bc agent_llm/RAG is doing extra work around the model call. 
    agent_llm = _client(args.provider, args.agent, models, mock_agent_handler, "mock-agent")
    judge_llm = _client(args.provider, args.judge, models, mock_judge_handler, "mock-judge")
    
    # AGENT:                    system under test (RAG agent = Retrieval-Augmented Generation)
    # WHAT CREATES AGENT:       pairing agent's model client with the knowledge base (chunks)
    # DEFINITIONS:              retrieval - find relevant information in a store of documents; aumented - found rules added to prompt; generation - model writes answers from rules
    # DIFF B/N AGENTS,CLIENTS:  Agent decides what to do, knows the rules and system prompt, does not know how Azure works. Client handles how to reach model, knows endpoint, key, deployment name, doesn't know what the rules
    agent = RagAgent(agent_llm, load_chunks(args.docs))     

    #Basesline: tores results from an earlier run for comparison
    baseline = None
    if args.baseline:                                       # load first: a bad path fails before any paid calls
        baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8"))["summary"]   #create Aadictionary built from the string at the baseline path, take value at key "summary"


    #RUN_EVAL: imported from runner, loops over every test case, gets the agent's answer, scores it, and returns one result row per case.
    results = run_eval(cases, agent, judge_llm, models)     
    
    #SUMMARY: imported from runner. Totals accuracy, safety, cost, latency across the runs
    summary = summarise(results)                           
    
    #CHECK_THRESHOLDS: imported from runner. Judges the totality of cases for topline scores, not invidiaul cases
    thresholds = yaml.safe_load(Path(args.thresholds).read_text(encoding="utf-8"))
    
    #FAILURES: check_thresholds compares run's totlas (summar) with limits form thresholds.paml. Returns list of text messages, one per limit that was broken. [] - no breaches, ['"accuracy 76.5% below 80%"]
    failures = check_thresholds(summary, thresholds)        # list of breaches; empty = pass

    #META: Record keeping for every run. 
    meta = {                                               
        "agent_model": agent_llm.model,
        "judge_model": judge_llm.model,
        "provider": args.provider,
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    
    #write_outputs: json_path (path of results.json), md_path (path to report.mdreturned. write_outputs is importated from report.py
    json_path, md_path = write_outputs(args.out, summary, results, failures, meta, baseline)
    print(md_path.read_text(encoding="utf-8"))              
    print(f"Wrote {json_path} and {md_path}")
    
    # EXIT CODE: 1 (build fails) if thresholds breached and --fail-on-threshold (optional set on llm-run) set, else 0
    # VERDICT: compare the run's totals with the limits and tell CI whether the model passes
    return 1 if (failures and args.fail_on_threshold) else 0   


# D. MAIN: command and option definitions

"""
MAIN 
PURPOSE: Reads what the user typed and sends it to the right command
WHERE USED:     (1) Cli.py, bottom: (if __name__ == "__main__"), which runs only if executived directly. 
                (2) pyproject.toml;" when user writes llm-eval in terminal, generated command imports llm_eval.cli and calls mmain() 
"""
def main(argv: list[str] | None = None) -> int:
    
    _load_env()
    
    # argparse: Python's built-in module for command-line arguments
    # ArgumentParses(...): new empty paser, where command and options added to p
    # prog="llm-eval" - the prgroam name to show in help/error messages, otherside shows script's file name
    p = argparse.ArgumentParser(prog="llm-eval")
    sub = p.add_subparsers(dest="command", required=True)  # sub-commands: run, ping

    # RUN: Defines run subcommand and gives object run to attach its options to.
    run = sub.add_parser("run", help="Run the evaluation")
    
    # Declare every option run command accepts and define default. Menu that parse_arges later checks user's inputs against
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
    
    #FUNCT: "run" calls cmd_run
    run.set_defaults(func=cmd_run)                          

    # PING: Defines ping subcommand
    ping = sub.add_parser("ping", help="One live call to test a deployment")
    ping.add_argument("--deployment", required=True)
    ping.add_argument("--models", default="config/models.yaml")
    #FUNCT: "run" calls cmd_ping
    ping.set_defaults(func=cmd_ping)                       

    #USER INPUT: check what was typed by the user
    args = p.parse_args(argv)                             
    
    #Run the matching command
    return args.func(args)                                 

# MAIN: only when run directly, not when imported, pass the exit code to the shell
if __name__ == "__main__":                                  
    raise SystemExit(main())                                

"""
TERMS DEFINED

*Functions* 
- main: reads what the user typed and calls the associated command, after defining a menu of command options and associated arguments. Used directly or by pyproject.toml
- cmd_run: main coordinator function: reads parsed args; loads models/cases; build agent/judge client; creates RAG agent; loads baseline before any paid call; runs run_eval; summarizes; checks thresholds; writes results.json and report.md; returns exit code for CI
- cmd_ping: tests the provided deployment for a simple response
- _client: creates clients, the connection to a model. Client's job is to send prompt, return the reply with tokens and timing; knows endpoint, key and deployment name.
- _load_env: loads endpoint/key from .env into environment, so can be referenced but not coded

*Imported Functions*
- load_models:          from pricing.py     returns listing of models that can be called, listed in models.yaml
- load_cases:           from cases.py       return listing of (test) cases that will be used to evaluate the agent, listed in cases.yaml
- load_chuncks:         from agent.py       returns full build of chunks created by data/docs, thus creating the knowledge base provided to the agent
- run_eval:             from runner.py      return one result row per case by looping over every test case, getting the agent's answer, and scoring it
- summarise:            from runner.py      return a total of accuracy, safety, cost, latency across all runs
- check_thresholds:     from runner.py      return a list of preaches after comparing the run's totals with limits
- write_outputs:        from runner.py      returns paths for the results.json and report.md 

*Classes*
- RagAgent -            system under test. picks 2 most relevant Strunk rules for a question, builds the prompt, asks the model, returnt he answer with its sources
- AzureOpenAIClient -   real connection to an Azure model - sends prompt, returens reply with token counts and tming
- MockClient -          fake client that returns scripted replies (free and offline)

*Related Files*
- pyproject.toml:       definition file. names the package, dependencies, creates llm-eval command (allowign llm-eval to be used in termainl once project installed with pip)
- models.yaml:          registry of every deploment: Azure name, reasoning flag, and prices per million
- thresholds.yaml:      pass/fail limits for a run
- cases.yaml:           golden test set
- .env:                 local secrets

"""
