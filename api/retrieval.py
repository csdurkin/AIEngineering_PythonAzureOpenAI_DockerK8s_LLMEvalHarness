#RETRIEVAL.PY

  #Purpose: The retrieval breakdown the viewer shows: every rule scored against a question, which were sent to the model,
  #         and which question words were kept or dropped. Used by the question server (POST /api/retrieve, for typed
  #         questions) and by scripts/build_viewer_data.py (for the golden questions), so there is one version of it.
  #Primary Components:
      #retrieve_scored (function): the harness retrieve(), but it keeps every chunk with its score and shared words, so the viewer can show what was sent and what lost out
      #load_titles (function): each rule's title from its header line, for display
      #split_query (function): which question words were kept and which were dropped as stop words
  #Reuses (imported, not copied): agent.tokenise, _STOPWORDS, DEFAULT_K, DEFAULT_MIN_OVERLAP
  #SOURCE: moved from scripts/build_viewer_data.py (unchanged), so the server and the build script share it

#Authorship: drafted by Claude; reviewed by Connor.



#A. IMPORTS

import re
from pathlib import Path

#  IMPORTS (Harness): reused, not copied, so the viewer always matches the harness
    #Note: _STOPWORDS is private to agent.py (leading underscore). Imported on purpose so the viewer follows any change to the stop-word list.
from llm_eval.agent import DEFAULT_K, DEFAULT_MIN_OVERLAP, _STOPWORDS, Chunk, tokenise



#B. FUNCTION DEFINITIONS


#  RETRIEVE SCORED
    #Purpose: Score every chunk against the question and return all of them, best first, with what retrieve() would have done to each
    #SOURCE: src/llm_eval/agent.py retrieve() (adapted: keeps every chunk and its score instead of only the top k)
    #Output per chunk: rank, source, title, text, matched (the shared keywords), overlap (how many), sent (passed to the model), tie (file order decided whether it was sent)
    #Why it matches retrieve(): retrieve() filters to overlap >= min_overlap, then takes the first k after a stable sort.
    #   Sorting all chunks the same way and marking the first k that pass the filter gives the same chunks.
    #   check_integrity() in scripts/build_viewer_data.py proves it on the 4 October run.
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
