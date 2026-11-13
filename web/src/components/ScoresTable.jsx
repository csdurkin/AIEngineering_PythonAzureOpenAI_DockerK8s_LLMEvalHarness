// PURPOSE: Every score and measurement for both models in one table, styled like the "Rules matched and sent" table; rows where the models differ are tinted and tagged
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Box, Chip, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Typography } from '@mui/material';
import { fmt } from '../lib/format.js';
import { C, SURFACE } from '../lib/design.js';

//CONSTANT: the rows; `show` turns one model's record into display text
const ROWS = [
  ['What it did', (r) => r.status],
  ['Accuracy', (r) => fmt(r.accuracy, 'pct')],
  ['Relevance (judge)', (r) => fmt(r.relevance, 'pct')],
  ['Safety', (r) => (r.safety_passed ? 'pass' : `fail: ${r.safety_reasons.join('; ')}`)],
  ['Retrieval hit', (r) => (r.retrieval_hit == null ? 'n/a' : r.retrieval_hit ? 'yes' : 'no')],
  ['Latency', (r) => `${fmt(r.latency_s, 'sec')} s`],
  ['Input tokens', (r) => fmt(r.input_tokens, 'int')],
  ['Output tokens', (r) => fmt(r.output_tokens, 'int')],
  ['Agent cost', (r) => fmt(r.agent_cost_usd, 'usd')],
];

// Props: caseData (one case), modelNames (display names in a fixed order), colours (identity colour per model, same order)
function ScoresTable({ caseData, modelNames, colours }) {
  return (
    <TableContainer sx={{ ...SURFACE, paddingX: 1 }}>
      <Table size="small" aria-label="Scores and measurements for each model">
        <TableHead>
          <TableRow>
            <TableCell>Measure</TableCell>
            {modelNames.map((name, i) => (
              <TableCell key={name}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: colours[i] }} />
                  {name}
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map(([label, show]) => {
            const values = modelNames.map((name) => (caseData.models[name] ? show(caseData.models[name]) : 'no result'));
            const differs = new Set(values).size > 1;
            return (
              <TableRow key={label} sx={{ backgroundColor: differs ? C.accentTint : undefined }}>   {/* differing rows: light blue (blue = needs attention) */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                    {differs && <Chip label="Differs" size="small" variant="outlined" />}
                  </Box>
                </TableCell>
                {values.map((v, i) => <TableCell key={modelNames[i]}>{v}</TableCell>)}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ScoresTable;
