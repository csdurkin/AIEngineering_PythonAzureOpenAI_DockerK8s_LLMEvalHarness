// PURPOSE: Summary; one sentence on what this case shows: the outcome, whether retrieval found the right rule, and where the models separate
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// HOW THE SENTENCE IS BUILT: fixed rules in the browser, from the case data; no model writes it, and it never says which model is "better".
//   1. Outcome:     what each model did (answered, abstained, refused, blocked) and its accuracy
//   2. Retrieval:   whether the expected rule was sent (skipped when the case has no expected rule)
//   3. Separation:  which model was slower and costlier, and by how much (larger / smaller)
//   Draft wording, to revisit.

import { Box, Typography } from '@mui/material';
import { fmt, ratio } from '../lib/format.js';
import { Eyebrow } from './Section.jsx';

//PART 1: OUTCOME. e.g. "Both models answered and scored 0.0% accuracy."
export function outcome(nameA, A, nameB, B) {
  const accA = fmt(A.accuracy, 'pct');
  const accB = fmt(B.accuracy, 'pct');
  if (A.status === 'blocked' && B.status === 'blocked') {
    return "Azure's content filter blocked both requests, so neither model answered.";
  }
  if (A.status === B.status && accA === accB) {
    return accA === 'n/a'
      ? `Both models ${A.status}.`                                      // refuse cases have no accuracy score
      : `Both models ${A.status} and scored ${accA} accuracy.`;
  }
  return `${nameA} ${A.status} (${accA} accuracy) while ${nameB} ${B.status} (${accB}).`;
}

//PART 2: RETRIEVAL. e.g. "The expected rule, rule11.md, was not sent (ranked 5 of 18)."
function retrievalSentence(caseData) {
  const expected = caseData.expected_source;
  if (!expected) return '';                                             // abstain and refuse cases test behaviour, not retrieval
  const row = caseData.retrieval.find((r) => r.source === expected);
  if (row?.sent) return `The expected rule, ${expected}, was sent to both.`;
  return `The expected rule, ${expected}, was not sent${row ? ` (ranked ${row.rank} of ${caseData.retrieval.length})` : ''}.`;
}

//PART 3: SEPARATION. e.g. "gpt-5-mini took 3.8x as long and cost 1.9x as much."
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

// Props: caseData (one case from arena-data.json), modelNames (display names in a fixed order)
function ConclusionPanel({ caseData, modelNames }) {

  const present = modelNames.filter((name) => caseData.models[name]);
  let sentence;

  //FALLBACK: a comparison needs both models
  if (present.length < 2) {
    sentence = 'Only one model has a result for this case, so there is nothing to compare.';
  } else {
    const [nameA, nameB] = present;
    const A = caseData.models[nameA];
    const B = caseData.models[nameB];
    sentence = [outcome(nameA, A, nameB, B), retrievalSentence(caseData), separation(nameA, A, nameB, B)]
      .filter(Boolean)
      .join(' ');
  }

  //HEADING: "Summary", not "Conclusion": the sentence reports facts and gives no verdict on which model is better
  //A burnt orange rule on the left marks the sentence
  return (
    <Box>
      <Eyebrow>At a glance</Eyebrow>
      <Typography variant="h3" sx={{ marginBottom: 2 }}>Summary</Typography>
      <Typography variant="body1" sx={{ fontWeight: 500, maxWidth: '72ch', borderLeft: '3px solid #C2410C', paddingLeft: 2 }}>{sentence}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1.5 }}>
        One run per model, so these are single observations, not averages.
      </Typography>
    </Box>
  );
}

export default ConclusionPanel;
