// PURPOSE: Stat tiles that make the separation visible: latency, output tokens and agent cost, one thin bar per model on a shared zero baseline
// SOURCE: new (bar specs follow the dataviz guidance: thin bars, rounded ends, a 2px gap, direct labels, values in text colour, a legend, hover tooltips)
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// COLOURS: fixed per model, never by rank; validated as a pair for colour-blind separation (scripts/validate_palette.js: all checks pass)

import { Box, Typography, Tooltip } from '@mui/material';
import { fmt, ratio } from '../lib/format.js';
import { HEADING_FONT } from '../muiStyling/theme.js';
import { SURFACE } from './Section.jsx';

//CONSTANT: model colours in meta.models order (gpt-4.1-mini, gpt-5-mini)
export const MODEL_COLOURS = ['#2563EB', '#C2410C'];

//CONSTANT: the tiles; `show` formats a value for display
const MEASURES = [
  { field: 'latency_s', label: 'Latency', show: (v) => `${fmt(v, 'sec')} s`, word: 'as long' },
  { field: 'output_tokens', label: 'Output tokens', show: (v) => fmt(v, 'int'), word: 'as many' },
  { field: 'agent_cost_usd', label: 'Agent cost', show: (v) => fmt(v, 'usd'), word: 'as much' },
];

// Props: caseData (one case), modelNames (display names in a fixed order)
function ComparisonTiles({ caseData, modelNames }) {

  const models = modelNames.map((name, i) => ({ name, colour: MODEL_COLOURS[i], result: caseData.models[name] }))
    .filter((m) => m.result);

  return (
    <Box>
      {/* LEGEND: identity is never colour alone; each bar is also labelled with its model name */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 2 }}>
        {models.map((m) => (
          <Box key={m.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: m.colour }} />
            <Typography variant="body2">{m.name}</Typography>
          </Box>
        ))}
      </Box>

      {/* TILES: three across on wide screens, stacked on phones */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {MEASURES.map((measure) => {
          const values = models.map((m) => m.result[measure.field]);
          const max = Math.max(...values.filter((v) => v != null), 0);
          const hi = models.length === 2 && values[0] !== values[1]
            ? (values[0] > values[1] ? 0 : 1) : null;                                  // which model is higher, if they differ
          const times = hi === null ? null : ratio(values[hi], values[1 - hi]);

          return (
            <Box key={measure.field} sx={{ ...SURFACE, padding: 2.5 }}>
              <Typography variant="h5" component="p">{measure.label}</Typography>

              {/* HEADLINE: the gap as a large number, e.g. "3.8x"; the sentence under it says who and what */}
              <Typography sx={{ fontFamily: HEADING_FONT, fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginTop: 1 }}>
                {times ?? (models.length === 2 ? 'Same' : 'n/a')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ minHeight: '1.5em' }}>
                {times ? `${models[hi].name} ${measure.word}` : ''}
              </Typography>

              {/* BARS: one per model, shared zero baseline, 2px gap between */}
              <Box sx={{ display: 'grid', gap: '2px', marginTop: 2 }}>
                {models.map((m, i) => (
                  <Box key={m.name} sx={{ display: 'grid', gridTemplateColumns: '88px 1fr auto', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>{m.name}</Typography>
                    <Tooltip title={`${m.name}: ${measure.show(values[i])}`} placement="top" arrow>
                      <Box sx={{ height: 20, display: 'flex', alignItems: 'center', cursor: 'default' }} tabIndex={0} aria-label={`${m.name} ${measure.label}: ${measure.show(values[i])}`}>
                        <Box sx={{
                          width: max > 0 ? `${Math.max((values[i] / max) * 100, values[i] > 0 ? 2 : 0)}%` : 0,
                          height: 10, backgroundColor: m.colour, borderRadius: '0 4px 4px 0',
                        }} />
                      </Box>
                    </Tooltip>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{measure.show(values[i])}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default ComparisonTiles;
