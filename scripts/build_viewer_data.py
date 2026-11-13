#BUILD_VIEWER_DATA.PY

  #Purpose: Build the results viewer's data file (web/src/data/arena-data.json) from the 4 October 2026 evidence.
  #Primary Components:
      #retrieve_scored (function): the harness retrieve(), but it keeps every chunk with its score and shared words, so the viewer can show what was sent and what lost out
      #load_titles (function): each rule's title from its header line, for display
      #split_query (function): which question words were kept and which were dropped as stop words
      #load_results (function): reads both results.json files, keyed by display model name
      #check_integrity (function): proves retrieve_scored reproduces the 4 October run; stops on any drift
      #build (function): assembles one record per case, plus top-level meta
  #Run: .venv/bin/python scripts/build_viewer_data.py
  #Output: web/src/data/arena-data.json (committed, so the web build needs no Python)
  #Note: build step only. Reads evidence; never calls a model.

#Authorship: drafted by Claude; reviewed by Connor.



#A. IMPORTS AND CONSTANTS

#  IMPORTS (Libraries)
import json
import re
import sys
from pathlib import Path

#  IMPORTS (Harness): reused, not copied, so the viewer always matches the harness
    #Note: _STOPWORDS is private to agent.py (leading underscore). Imported on purpose so the viewer follows any change to the stop-word list.
from llm_eval.agent import DEFAULT_K, DEFAULT_MIN_OVERLAP, _STOPWORDS, Chunk, load_chunks, tokenise
from llm_eval.cases import Case, load_cases

#  CONSTANTS: PATHS
ROOT = Path(__file__).resolve().parent.parent                   #Repo root, so the script works from any folder
RUN_DATE = "2026-10-04"
EVIDENCE_DIR = ROOT / "evidence" / RUN_DATE
CASES_FILE = ROOT / "data" / "cases.yaml"
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


#  RETRIEVE SCORED
    #Purpose: Score every chunk against the question and return all of them, best first, with what retrieve() would have done to each
    #SOURCE: src/llm_eval/agent.py retrieve() (adapted: keeps every chunk and its score instead of only the top k)
    #Output per chunk: rank, source, title, text, matched (the shared keywords), overlap (how many), sent (passed to the model), tie (file order decided whether it was sent)
    #Why it matches retrieve(): retrieve() filters to overlap >= min_overlap, then takes the first k after a stable sort.
    #   Sorting all chunks the same way and marking the first k that pass the filter gives the same chunks. check_integrity() proves it.
def retrieve_scored(question: str, chunks: list[Chunk], titles: dict[str, str], k: int = DEFAULT_K, min_overlap: int = DEFAULT_MIN_OVERLAP) -> list[dict]:
    q_tokenised = tokenise(question)

    scored = []                                                 #(shared words, chunk) pairs for every chunk, not just matches
    for chunk in chunks:
        chunk_tokenised = tokenise(chunk.text)
        scored.append((q_tokenised & chunk_tokenised, chunk))   #Keep the shared words themselves; retrieve() keeps only their count

    scored.sort(key=lambda pair: len(pair[0]), reverse=True)    #Same stable sort as retrieve(): equal scores keep file order

    rows = []
    for position, (matched, chunk) in enumerate(scored):
        score = len(matched)
        rows.append({
            "rank": position + 1,
            "source": chunk.source,
            "title": titles.get(chunk.source, ""),
            "text": chunk.text,
            "matched": sorted(matched),
            "overlap": score,
            "sent": position < k and score >= min_overlap,      #In the top k AND a strong enough match
            "tie": False,                                       #Filled in below
        })

    #TIES: a chunk is in a tie when another chunk with the same overlap landed on the other side of the "sent" line.
    #      Only matches strong enough to be sent can tie; below min_overlap nothing is sent whatever the order.
    for row in rows:
        if row["overlap"] < min_overlap:
            continue
        row["tie"] = any(
            other["overlap"] == row["overlap"] and other["sent"] != row["sent"]
            for other in rows
        )

    return rows


#  LOAD TITLES
    #Purpose: Read each rule's title from its first header line, e.g. "# Rule 18: Place the emphatic words of a sentence at the end"
    #Why separate: load_chunks() skips "#" lines, so the title never reaches a chunk. Display only; retrieval does not use it.
def load_titles(docs_dir: Path) -> dict[str, str]:
    titles = {}
    for path in sorted(docs_dir.glob("*.md")):
        first_line = path.read_text(encoding="utf-8").split("\n", 1)[0]
        match = re.match(r"#\s*Rule\s+\d+:\s*(.+)", first_line)        #Text after "Rule N:"
        titles[path.name] = match.group(1).strip() if match else ""
    return titles


#  SPLIT QUERY
    #Purpose: Show which question words retrieval used and which it threw away as stop words
    #Note: same regular expression as tokenise(), so "kept" equals tokenise(question)
def split_query(question: str) -> dict:
    words = re.findall(r"[a-z0-9£]+", question.lower())
    kept = tokenise(question)
    dropped = {word for word in words if word in _STOPWORDS}
    return {"kept": sorted(kept), "dropped": sorted(dropped)}


#  LOAD RESULTS
    #Purpose: Read each model's results.json, check it is the model we expect, and index its cases by id
    #Output: {display name: {"meta": ..., "cases": {case id: case}}}
def load_results() -> dict:
    results = {}
    for name, agent_model in MODELS.items():
        data = json.loads((EVIDENCE_DIR / name / "results.json").read_text(encoding="utf-8"))
        if data["meta"]["agent_model"] != agent_model:
            sys.exit(f"{name}/results.json is for {data['meta']['agent_model']}, expected {agent_model}")
        results[name] = {"meta": data["meta"], "cases": {c["id"]: c for c in data["cases"]}}
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
                name: {field: result["cases"][case.id][field] for field in MODEL_FIELDS}
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



#C. MAIN

def main() -> None:
    cases = load_cases(CASES_FILE)
    chunks = load_chunks(DOCS_DIR)
    titles = load_titles(DOCS_DIR)
    results = load_results()

    retrievals = {case.id: retrieve_scored(case.question, chunks, titles) for case in cases}
    check_integrity(cases, retrievals, results)

    data = build(cases, retrievals, results)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"{len(cases)} cases, {len(results)} models, integrity OK")
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
