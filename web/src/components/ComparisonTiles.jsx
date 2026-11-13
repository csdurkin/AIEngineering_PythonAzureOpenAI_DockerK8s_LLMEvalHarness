// PURPOSE: Stat tiles that make the separation visible: latency, output tokens and agent cost, one thin bar per model on a shared zero baseline
// SOURCE: new (bar specs follow the dataviz guidance: thin bars, rounded ends, a 2px gap, direct labels, values in text colour, a legend, hover tooltips)
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// COLOURS: MODEL_COLOURS in lib/design.js (fixed per model, never by rank; validated for colour-blind separation)

import { Box, Typography, Tooltip } from '@mui/material';
import { fmt, ratio } from '../lib/format.js';
import { HEADING_FONT } from '../muiStyling/theme.js';
import { MODEL_COLOURS, SURFACE } from '../lib/design.js';


//CONSTANT: the tiles; `show` formats a value for display; `before` and `after` wrap the ratio in a sentence,
//          e.g. "gpt-5-mini" + "took" + "3.8x" + "as long"
const MEASURES = [
  { field: 'latency_s', label: 'Latency', show: (v) => `${fmt(v, 'sec')} s`, before: 'took', after: 'as long' },
  { field: 'output_tokens', label: 'Output tokens', show: (v) => fmt(v, 'int'), before: 'wrote', after: 'as many tokens' },
  { field: 'agent_cost_usd', label: 'Agent cost', show: (v) => fmt(v, 'usd'), before: 'cost', after: 'as much' },
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

              {/* HEADLINE: the gap as a large number, e.g. "3.8x" */}
              <Typography sx={{ fontFamily: HEADING_FONT, fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginTop: 1 }}>
                {times ?? (models.length === 2 ? 'Same' : 'n/a')}
              </Typography>

              {/* CONTEXT: the full sentence in small text, repeating the number, e.g. "gpt-5-mini took 3.8x as long" */}
              <Typography variant="body2" color="text.secondary" sx={{ marginTop: 0.5, minHeight: '1.5em' }}>
                {times ? `${models[hi].name} ${measure.before} ${times} ${measure.after}` : (models.length === 2 ? 'The same for both' : '')}
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
