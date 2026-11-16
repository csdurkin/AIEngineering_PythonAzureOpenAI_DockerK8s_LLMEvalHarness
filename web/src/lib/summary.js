// PURPOSE: The rules that write the summary sentences on both pages. Fixed rules from the case data: no model writes them,
//          and they never say which model is "better"
// SOURCE: new (moved here from SummaryPanel.jsx and RunPromptsPage.jsx, so both pages share one copy and the rules can be tested)
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// PAST RESULTS sentence: outcome + retrievalSentence + separation
// RUN PROMPTS sentence:  retrievalSummary, then (once the models answer) outcome + separation + retrievalCheck
// REPORT failing cases:  failureReason

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
//  settings: { k, min_overlap } from arena-data.json meta.retrieval
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

//  RETRIEVAL CHECK (typed questions): the agents (/api/ask) should send the same rules as the breakdown shown (/api/retrieve); say so if not
export function retrievalCheck(caseData) {
  const shown = caseData.retrieval.filter((r) => r.sent).map((r) => r.source).join(',');
  const differ = Object.entries(caseData.models).filter(([, r]) => r.sources.join(',') !== shown).map(([name]) => name);
  return differ.length ? `Note: the rules ${listText(differ)} received differ from the retrieval shown here; the server may have reloaded its rules mid-question.` : '';
}


//  ORDINAL: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th"
const ordinal = (n) => {
  const tens = n % 100, ones = n % 10;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
};

//  WHAT THEY DID: what a failing model did, in words that follow "Both models" or a model name
const DID = {
  answered: (sent) => `answered from the rules they were sent${sent.length ? ` (${listText(sent)})` : ''}`,
  abstained: () => 'said the rules provided did not cover the question',
  refused: () => 'refused',
  blocked: () => "were blocked by Azure's content filter",
};

//  FAILURE REASON (Report page): why a case fell below full accuracy or failed safety, worked out from the case data
//  e.g. "The expected rule, rule18.md (…), shared 3 words with the question but tied with rule06.md and rule10.md; only the top 2
//        are sent, and file order put it 3rd. Both models said the rules provided did not cover the question."
//  failedNames: the models that failed this case; settings: { k, min_overlap } from arena-data.json meta.retrieval
export function failureReason(caseData, failedNames, { k, min_overlap: min }) {
  const parts = [];
  const failed = failedNames.map((name) => [name, caseData.models[name]]);

  //SAFETY: name the reasons, model by model
  for (const [name, r] of failed) {
    if (!r.safety_passed) parts.push(`${name} failed the safety check: ${listText(r.safety_reasons)}.`);
  }

  const lowAccuracy = failed.filter(([, r]) => r.accuracy != null && r.accuracy < 1);
  if (!lowAccuracy.length) return parts.join(' ');

  //RETRIEVAL: was the rule with the answer sent, and if not, why not
  const expected = caseData.expected_source;
  const row = expected && caseData.retrieval.find((r) => r.source === expected);
  const sent = caseData.retrieval.filter((r) => r.sent).map((r) => r.source);
  const facts = caseData.expected_facts.map((f) => `"${f}"`);
  if (row && !row.sent) {
    const rule = `The expected rule, ${expected}${row.title ? ` (${row.title})` : ''},`;
    const words = row.overlap === 1 ? '1 word' : `${row.overlap} words`;
    if (row.overlap < min) {
      parts.push(row.overlap === 0
        ? `${rule} shared no words with the question, so it was not sent.`
        : `${rule} was not sent: it shared only ${words} with the question (${listText(row.matched.map((w) => `"${w}"`))}), below the ${min}-word minimum.`);
    } else if (row.tie) {
      const rivals = caseData.retrieval.filter((r) => r.tie && r.source !== expected).map((r) => r.source);
      parts.push(`${rule} shared ${words} with the question but tied with ${listText(rivals)}; only the top ${k} are sent, and file order put it ${ordinal(row.rank)}.`);
    } else {
      parts.push(`${rule} ranked ${ordinal(row.rank)}; only the top ${k} are sent.`);
    }
  } else if (row) {
    parts.push(`The expected rule, ${expected}, was sent, but the answer did not include every expected fact (${listText(facts)}).`);
  } else if (facts.length) {
    parts.push(`The answer did not include every expected fact (${listText(facts)}).`);
  }

  //MODELS: what they did as a result; one sentence if they did the same thing
  const missing = (r) => (r.status === 'answered' && r.accuracy === 0 && facts.length ? `, so their answers did not include ${listText(facts)}` : '');
  const statuses = new Set(lowAccuracy.map(([, r]) => r.status));
  if (statuses.size === 1) {
    const [, r] = lowAccuracy[0];
    const who = lowAccuracy.length === Object.keys(caseData.models).length && lowAccuracy.length > 1 ? 'Both models' : lowAccuracy[0][0];
    parts.push(`${who} ${(DID[r.status] ?? (() => r.status))(sent)}${missing(r)}.`);
  } else {
    for (const [name, r] of lowAccuracy) parts.push(`${name} ${(DID[r.status] ?? (() => r.status))(sent)}.`);
  }
  return parts.join(' ');
}
