// PURPOSE: Summary for a golden case: the test details, then one sentence on what the case shows (the outcome, whether
//          retrieval sent the right rule, and where the models separate). The sentence rules live in lib/summary.js
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// HEADING: "Summary", not "Conclusion": the sentence reports facts and gives no verdict on which model is better

import { Box, Typography, Chip } from '@mui/material';
import { Eyebrow } from './Section.jsx';
import { outcome, retrievalSentence, separation } from '../lib/summary.js';
import { C } from '../lib/design.js';

// Props: caseData (one case from arena-data.json), modelNames (display names in a fixed order)
function SummaryPanel({ caseData, modelNames }) {

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

  return (
    <Box>
      <Eyebrow>At a glance</Eyebrow>
      <Typography variant="h3" sx={{ marginBottom: 2 }}>Summary</Typography>

      {/* TEST DETAILS as labelled pills */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginBottom: 2 }}>
        <Chip size="small" variant="outlined" label={`Test: ${caseData.id}`} />
        <Chip size="small" variant="outlined" label={`Category: ${caseData.category}`} />
        <Chip size="small" variant="outlined" label={`Expected: ${caseData.behaviour}`} />
      </Box>

      {/* SENTENCE: a burnt orange rule on the left marks it */}
      <Typography variant="body1" sx={{ fontWeight: 500, maxWidth: '72ch', borderLeft: `3px solid ${C.orange}`, paddingLeft: 2 }}>{sentence}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1.5 }}>
        One run per model, so these are single observations, not averages.
      </Typography>
    </Box>
  );
}

export default SummaryPanel;
