// PURPOSE: A full-width page band with the pipeline spine. Background runs edge to edge; content sits in a centred 1280px column,
//          inside a light translucent panel (frosted white over the sunset) so each step reads as one area without a heavy box.
//          The spine is a thin vertical line down the left with a numbered node per step (01 start here, 02 conclusion, 03 shared retrieval, 04 model output), so the page reads as one flow.
// SOURCE: new (the 1280px width and centring come from Connor's Ticketmaster App.css #root block, moved here)
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Box, Typography } from '@mui/material';
import { HEADING_FONT } from '../muiStyling/theme.js';

//CONSTANT: the sunset, one stop per band, so the bands blend into one gradient from daylight (input) to dusk (output)
export const SUNSET = ['#FFFBF5', '#FFF4E6', '#FFEBD4', '#FFDDB8', '#FED7AA'];

//CONSTANTS: spine colours
const LINE = 'rgba(194, 65, 12, 0.30)';
const NODE = '#C2410C';

//CONSTANT: the light panel; translucent white with a blur, so the band colour still shows through
const PANEL = {
  backgroundColor: 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  boxShadow: '0 1px 2px rgba(124, 45, 18, 0.04), 0 10px 30px rgba(124, 45, 18, 0.06)',
  borderRadius: 5,                                      // 20px
  padding: { xs: 2.5, sm: 4 },
};

//CONSTANT: where the spine node sits, so it lines up with the first line inside the panel (band padding 32px + panel padding 32px)
const NODE_TOP = 64;

// Props: step (e.g. '01'; omit for no spine), from / to (background colours at the top and bottom of the band),
//        first / last (the spine starts at the first node and stops at the last), label (aria label), panel (false = no light panel),
//        indent (true = keep the spine's space with no line, so content lines up with the steps), background (any CSS background, overrides from / to),
//        id (so a link can jump to this band), children
function Band({ id, step, from = SUNSET[0], to = from, background, first = false, last = false, label, panel = true, indent = false, children }) {
  const spine = Boolean(step);
  const column = spine || indent;

  return (
    <Box component="section" id={id} aria-label={label} sx={{ background: background ?? `linear-gradient(180deg, ${from} 0%, ${to} 100%)`, scrollMarginTop: 60 }}>   {/* scrollMarginTop: a link to this band stops below the sticky menu bar */}
      <Box
        sx={{
          maxWidth: 1280, marginX: 'auto', paddingX: { xs: 2, sm: 4 },
          display: 'grid', gridTemplateColumns: { xs: '1fr', sm: column ? '56px 1fr' : '1fr' }, columnGap: { sm: 3 },
        }}
      >

        {/* INDENT: an empty spine column */}
        {!spine && indent && <Box sx={{ display: { xs: 'none', sm: 'block' } }} />}

        {/* SPINE: hidden on phones; the line fills the band's height so it joins up with the next band */}
        {spine && (
          <Box aria-hidden="true" sx={{ display: { xs: 'none', sm: 'block' }, position: 'relative' }}>
            <Box sx={{ position: 'absolute', left: '50%', width: 2, marginLeft: '-1px', backgroundColor: LINE, top: first ? NODE_TOP + 16 : 0, bottom: last ? `calc(100% - ${NODE_TOP + 16}px)` : 0 }} />
            <Box
              sx={{
                position: 'absolute', top: NODE_TOP, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 32, borderRadius: '50%', backgroundColor: '#FFFFFF', border: `2px solid ${NODE}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontFamily: HEADING_FONT, fontSize: '0.75rem', fontWeight: 800, color: '#9A3412', lineHeight: 1 }}>{step}</Typography>
            </Box>
          </Box>
        )}

        {/* CONTENT: the vertical padding lives here, so the spine runs through it */}
        <Box sx={{ paddingY: { xs: 3, sm: 4 }, minWidth: 0 }}>
          {panel ? <Box sx={PANEL}>{children}</Box> : children}
        </Box>

      </Box>
    </Box>
  );
}

export default Band;
