// PURPOSE: The harness's retrieval step, run in the browser on any question: split the question into kept and dropped words,
//          then score every rule by shared words and mark which would be sent to the model and where file order broke a tie
// SOURCE: src/llm_eval/agent.py tokenise() and retrieve(), via scripts/build_viewer_data.py retrieve_scored() and split_query() (ported from Python to JavaScript)
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// DATA: the rules, stop words and settings come from retrieval-kit.json, written by build_viewer_data.py from the harness itself
// CHECK: on every golden question this gives the same rows as arena-data.json (the Python result); see the parity check in the tests

import kit from '../data/retrieval-kit.json';

const STOPWORDS = new Set(kit.stopwords);
const TOKEN = new RegExp(kit.token_pattern, 'g');               // [a-z0-9£]+, as in tokenise()

//  TOKENISE: lowercase, split into words, drop stop words; a Set removes duplicates (agent.py tokenise())
export function tokenise(text) {
  return new Set((text.toLowerCase().match(TOKEN) ?? []).filter((w) => !STOPWORDS.has(w)));
}

//  SPLIT QUERY: which words retrieval used and which it threw away (build_viewer_data.py split_query())
export function splitQuery(question) {
  const words = question.toLowerCase().match(TOKEN) ?? [];
  return {
    kept: [...tokenise(question)].sort(),
    dropped: [...new Set(words.filter((w) => STOPWORDS.has(w)))].sort(),
  };
}

//  RETRIEVE SCORED: every rule, best first, with what retrieve() would do to each (build_viewer_data.py retrieve_scored())
//  Array.prototype.sort is stable, like Python's sort, so equal scores keep file order
export function retrieveScored(question, { k = kit.k, minOverlap = kit.min_overlap } = {}) {
  const q = tokenise(question);

  const rows = kit.chunks
    .map((chunk) => ({ chunk, matched: [...tokenise(chunk.text)].filter((w) => q.has(w)) }))
    .sort((a, b) => b.matched.length - a.matched.length)
    .map(({ chunk, matched }, position) => ({
      rank: position + 1,
      source: chunk.source,
      title: chunk.title,
      text: chunk.text,
      matched: matched.sort(),
      overlap: matched.length,
      sent: position < k && matched.length >= minOverlap,
      tie: false,
    }));

  //TIES: same overlap as a chunk on the other side of the "sent" line; only strong enough matches can tie
  for (const row of rows) {
    if (row.overlap < minOverlap) continue;
    row.tie = rows.some((other) => other.overlap === row.overlap && other.sent !== row.sent);
  }
  return rows;
}

//  AS CASE: a typed question in the same shape as one case in arena-data.json, so the same panels can show it
//  models is empty: no model is called from the browser
export function asCase(question) {
  return {
    id: 'your-question',
    category: 'your question',
    behaviour: 'unknown',
    question,
    expected_facts: [],
    expected_source: null,
    query: splitQuery(question),
    retrieval: retrieveScored(question),
    models: {},
  };
}

export const RETRIEVAL_SETTINGS = { k: kit.k, min_overlap: kit.min_overlap, chunk_count: kit.chunks.length };
