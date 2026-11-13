// PURPOSE: The rules that write the summary sentences on both pages. Fixed rules from the case data: no model writes them,
//          and they never say which model is "better"
// SOURCE: new (moved here from SummaryPanel.jsx and RunPromptsPage.jsx, so both pages share one copy and the rules can be tested)
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// PAST RESULTS sentence: outcome + retrievalSentence + separation
// RUN PROMPTS sentence:  retrievalSummary, then (once the models answer) outcome + separation + retrievalCheck

import { fmt, ratio } from './format.js';

//  LIST TEXT: a list in plain English: ["a"] -> "a"; ["a", "b"] -> "a and b"; ["a", "b", "c"] -> "a, b and c"
export const listText = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

//  OUTCOME: what each model did and its accuracy. e.g. "Both models answered and scored 0.0% accuracy."
export function outcome(nameA, A, nameB, B) {
  const accA = fmt(A.accuracy, 'pct');
  const accB = fmt(B.accuracy, 'pct');
  if (A.status === 'blocked' && B.status === 'blocked') {
    return "Azure's content filter blocked both requests, so neither model answered.";
  }
  if (A.status === B.status && accA === accB) {
    return accA === 'n/a'
      ? `Both models ${A.status}.`                                      // refuse cases and typed questions have no accuracy score
      : `Both models ${A.status} and scored ${accA} accuracy.`;
  }
  return `${nameA} ${A.status} (${accA} accuracy) while ${nameB} ${B.status} (${accB}).`;
}

//  RETRIEVAL SENTENCE (golden cases): was the expected rule sent? e.g. "The expected rule, rule11.md, was not sent (ranked 5 of 18)."
export function retrievalSentence(caseData) {
  const expected = caseData.expected_source;
  if (!expected) return '';                                             // abstain and refuse cases test behaviour, not retrieval
  const row = caseData.retrieval.find((r) => r.source === expected);
  if (row?.sent) return `The expected rule, ${expected}, was sent to both.`;
  return `The expected rule, ${expected}, was not sent${row ? ` (ranked ${row.rank} of ${caseData.retrieval.length})` : ''}.`;
}

//  RETRIEVAL SUMMARY (typed questions): which rules were sent, any tie, any dropped words
//  settings: { k, min_overlap } from the retrieval kit
export function retrievalSummary(caseData, { k, min_overlap: min }) {
  const sent = caseData.retrieval.filter((r) => r.sent);
  const parts = [];

  if (!sent.length) {
    parts.push(`No rule shares ${min} or more words with your question, so the models received no rules as context.`);
  } else {
    parts.push(`${sent.length === 1 ? '1 rule was' : `${sent.length} rules were`} sent to both models: ${listText(sent.map((r) => `${r.source} (${r.title})`))}.`);
    const tied = caseData.retrieval.filter((r) => r.tie);
    if (tied.length) parts.push(`The last of the top ${k} places was a tie between ${listText(tied.map((r) => r.source))}; file order decided.`);
  }
  if (caseData.query.dropped.length) parts.push(`Dropped as stop words: ${listText(caseData.query.dropped)}.`);
  return parts.join(' ');
}

//  SEPARATION: which model was slower and costlier, and by how much. e.g. "gpt-5-mini took 3.8x as long and cost 1.9x as much."
export function separation(nameA, A, nameB, B) {
  const gap = (a, b) => (a == null || b == null || a === b ? null : a > b ? [nameA, ratio(a, b)] : [nameB, ratio(b, a)]);
  const time = gap(A.latency_s, B.latency_s);
  const cost = gap(A.agent_cost_usd, B.agent_cost_usd);
  if (time && cost && time[0] === cost[0]) return `${time[0]} took ${time[1]} as long and cost ${cost[1]} as much.`;
  const parts = [];
  if (time) parts.push(`${time[0]} took ${time[1]} as long`);
  if (cost) parts.push(`${cost[0]} cost ${cost[1]} as much`);
  return parts.length ? `${parts.join('; ')}.` : '';
}

//  RETRIEVAL CHECK (typed questions): the server's agent should send the same rules as the browser's retrieval; say so if not
export function retrievalCheck(caseData) {
  const browser = caseData.retrieval.filter((r) => r.sent).map((r) => r.source).join(',');
  const differ = Object.entries(caseData.models).filter(([, r]) => r.sources.join(',') !== browser).map(([name]) => name);
  return differ.length ? `Note: the server's retrieval for ${listText(differ)} differed from this page's, so the rules data may be out of date.` : '';
}
