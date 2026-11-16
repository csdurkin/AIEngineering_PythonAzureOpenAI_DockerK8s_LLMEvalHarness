#BUILD_VIEWER_DATA.PY

  #Purpose: Build the results viewer's data file (web/src/data/arena-data.json) from the 4 October 2026 evidence.
  #Primary Components:
      #load_results (function): reads both results.json files, keyed by display model name
      #check_integrity (function): proves retrieve_scored reproduces the 4 October run; stops on any drift
      #build (function): assembles one record per case, plus top-level meta
      #build_report (function): each model's overall summary, threshold checks and failing cases, for the Report page
  #Run: .venv/bin/python scripts/build_viewer_data.py
  #Reuses: retrieve_scored, load_titles, split_query (api/retrieval.py) and answer_status (api/scoring.py), shared with the question server
  #Output: web/src/data/arena-data.json (committed, so the web build needs no Python)
  #Note: build step only. Reads evidence; never calls a model.

#Authorship: drafted by Claude; reviewed by Connor.



#A. IMPORTS AND CONSTANTS

#  IMPORTS (Libraries)
import json
import sys
from pathlib import Path

import yaml

#  IMPORTS (Harness): reused, not copied, so the viewer always matches the harness
from llm_eval.agent import DEFAULT_K, DEFAULT_MIN_OVERLAP, load_chunks
from llm_eval.cases import Case, load_cases
from llm_eval.runner import check_thresholds                     #the harness's own pass/fail gate

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   #repo root, so the api package can be imported
from api.retrieval import load_titles, retrieve_scored, split_query   #shared with the question server
from api.scoring import answer_status                              #shared with the question server

#  CONSTANTS: PATHS
ROOT = Path(__file__).resolve().parent.parent                   #Repo root, so the script works from any folder
RUN_DATE = "2026-10-04"
EVIDENCE_DIR = ROOT / "evidence" / RUN_DATE
CASES_FILE = ROOT / "data" / "cases.yaml"
THRESHOLDS_FILE = ROOT / "config" / "thresholds.yaml"
DOCS_DIR = ROOT / "data" / "docs"
OUTPUT_FILE = ROOT / "web" / "src" / "data" / "arena-data.json"

#  CONSTANT: MODELS
    #Purpose: evidence folder name -> the agent_model recorded in its results.json; the folder name is the display name
MODELS = {
    "gpt-4.1-mini": "agent-gpt-4.1-mini",
    "gpt-5-mini": "challenger-gpt-5-mini",
}

#  CONSTANT: MODEL FIELDS
    #Purpose: the per-case result fields the viewer shows. judge_cost_usd is left out: it is the cost of scoring, not of the agent.
MODEL_FIELDS = [
    "answer", "sources", "accuracy", "relevance", "safety_passed", "safety_reasons",
    "retrieval_hit", "latency_s", "input_tokens", "output_tokens", "agent_cost_usd",
]



#B. FUNCTION DEFINITIONS


#  RETRIEVE SCORED, LOAD TITLES, SPLIT QUERY: imported from api/retrieval.py (shared with the question server)


#  ANSWER STATUS: imported from api/scoring.py (shared with the question server)


#  LOAD RESULTS
    #Purpose: Read each model's results.json, check it is the model we expect, and index its cases by id
    #Output: {display name: {"meta": ..., "cases": {case id: case}}}
def load_results() -> dict:
    results = {}
    for name, agent_model in MODELS.items():
        data = json.loads((EVIDENCE_DIR / name / "results.json").read_text(encoding="utf-8"))
        if data["meta"]["agent_model"] != agent_model:
            sys.exit(f"{name}/results.json is for {data['meta']['agent_model']}, expected {agent_model}")
        results[name] = {"meta": data["meta"], "summary": data["summary"], "failures": data["failures"], "cases": {c["id"]: c for c in data["cases"]}}
    return results


#  CHECK INTEGRITY
    #Purpose: Prove the viewer shows what actually happened on 4 October.
    #Checks: same case ids everywhere, and for every case the chunks marked "sent" equal the sources each model received.
    #Why: if data/docs or retrieval changed since the run, the viewer would show a retrieval that never happened. Stop instead.
def check_integrity(cases: list[Case], retrievals: dict, results: dict) -> None:
    problems = []
    case_ids = {c.id for c in cases}

    for name, result in results.items():
        if set(result["cases"]) != case_ids:
            problems.append(f"{name}: case ids differ from cases.yaml")

    for case in cases:
        sent = [row["source"] for row in retrievals[case.id] if row["sent"]]
        for name, result in results.items():
            recorded = result["cases"].get(case.id, {}).get("sources")
            if recorded is not None and sent != recorded:
                problems.append(f"{case.id} ({name}): viewer sends {sent}, run recorded {recorded}")

    if problems:
        sys.exit("Integrity check FAILED; the evidence no longer matches retrieval:\n  " + "\n  ".join(problems))


#  BUILD
    #Purpose: Put each case together in the shape the viewer reads (keep this shape stable; a future live endpoint could return one case in it)
def build(cases: list[Case], retrievals: dict, results: dict) -> dict:
    records = []
    for case in cases:
        records.append({
            "id": case.id,
            "category": case.category,
            "behaviour": case.behaviour,
            "question": case.question,
            "expected_facts": case.expected_facts,
            "expected_source": case.expected_source,
            "query": split_query(case.question),
            "retrieval": retrievals[case.id],
            "models": {
                name: {
                    **{field: result["cases"][case.id][field] for field in MODEL_FIELDS},
                    "status": answer_status(result["cases"][case.id]["answer"]),
                }
                for name, result in results.items()
                if case.id in result["cases"]
            },
        })

    meta = {
        "run_date": RUN_DATE,
        "models": list(MODELS),
        "run_at": {name: result["meta"]["run_at"] for name, result in results.items()},
        "judge_model": {name: result["meta"]["judge_model"] for name, result in results.items()},
        "case_count": len(records),
        "retrieval": {"k": DEFAULT_K, "min_overlap": DEFAULT_MIN_OVERLAP, "chunk_count": len(next(iter(retrievals.values())))},
    }
    return {"meta": meta, "cases": records}


#  BUILD REPORT
    #Purpose: Everything the Report page shows: each model's overall summary (as results.json recorded it), whether it passed
    #         each threshold, and which cases it failed
    #Thresholds: checked with the harness's check_thresholds(), and the result must equal the failures results.json recorded
    #Failing cases: SOURCE src/llm_eval/report.py "Failing cases" (same rule: below full accuracy, or failed safety); written
    #               inline there, so it is repeated here rather than imported
    #Output: {"thresholds": {...}, "models": {name: {"summary", "failures", "failing_cases"}}}
def build_report(results: dict, thresholds: dict) -> dict:
    problems = []
    models = {}
    for name, result in results.items():
        failures = check_thresholds(result["summary"], thresholds)
        if failures != result["failures"]:
            problems.append(f"{name}: thresholds now give {failures}, run recorded {result['failures']}")
        failing = [
            case_id for case_id, c in result["cases"].items()
            if (c["accuracy"] is not None and c["accuracy"] < 1) or not c["safety_passed"]
        ]
        models[name] = {"summary": result["summary"], "failures": failures, "failing_cases": failing}

    if problems:
        sys.exit("Report check FAILED; thresholds.yaml no longer gives the recorded verdict:\n  " + "\n  ".join(problems))
    return {"thresholds": thresholds, "models": models}



#C. MAIN

def main() -> None:
    cases = load_cases(CASES_FILE)
    chunks = load_chunks(DOCS_DIR)
    titles = load_titles(DOCS_DIR)
    results = load_results()

    retrievals = {case.id: retrieve_scored(case.question, chunks, titles) for case in cases}
    check_integrity(cases, retrievals, results)

    data = build(cases, retrievals, results)
    data["report"] = build_report(results, yaml.safe_load(THRESHOLDS_FILE.read_text(encoding="utf-8")))
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"{len(cases)} cases, {len(results)} models, integrity OK, report verdicts match")
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
