// PURPOSE: The full-width dark hero at the top of each page: what the page is and a call to action (left),
//          how to read it and links on GitHub (right). The dark rust sets it apart from the light steps below
//          and bookends the page with the rust footer. Content comes in as props, so both pages share one design.
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Box, Typography, Button } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { Eyebrow } from './Section.jsx';
import { C } from '../lib/design.js';

//CONSTANTS: hero colours (light text on the dark rust HERO_BG in lib/design.js; all well above 4.5:1)
const TEXT = C.paleOrange;
const MUTED = 'rgba(255, 237, 213, 0.82)';                 // 6.0:1 on the lighter end of the hero
const ACCENT = C.apricot;

// Props: eyebrow, title, body (main paragraph), note (optional smaller line), cta ({ label, href }),
//        steps (list of step names, matching the spine), links ({ label, href } list, open in a new tab), linksTitle
function Hero({ eyebrow, title, body, note, cta, steps, links, linksTitle = 'On GitHub' }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: { xs: 4, md: 8 }, paddingY: { xs: 2, sm: 4 }, alignItems: 'start' }}>

      {/* LEFT: what this page is */}
      <Box>
        <Eyebrow color={ACCENT}>{eyebrow}</Eyebrow>
        <Typography variant="h2" sx={{ color: TEXT, fontSize: { xs: '1.75rem', sm: '2.5rem' }, marginBottom: 2.5 }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ color: TEXT, maxWidth: '62ch', marginBottom: note ? 1.5 : 3 }}>{body}</Typography>
        {note && <Typography variant="body2" sx={{ color: MUTED, maxWidth: '62ch', marginBottom: 3 }}>{note}</Typography>}

        {/* CALL TO ACTION: jumps to step 01; blue, the accent for anything you can click */}
        {cta && (
          <Button href={cta.href} variant="contained" disableElevation
            sx={{ borderRadius: 999, paddingX: 3, paddingY: 1.25, fontSize: '1rem', backgroundColor: C.accent, '&:hover': { backgroundColor: C.accentDark } }}>
            {cta.label} <Box component="span" aria-hidden="true" sx={{ marginLeft: 1 }}>↓</Box>
          </Button>
        )}
      </Box>

      {/* RIGHT: how to read it, then the links */}
      <Box>
        <Typography variant="h5" component="p" sx={{ color: ACCENT, marginBottom: 1.5 }}>How to read this page</Typography>
        <Box component="ol" sx={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 4, display: 'grid', gap: 1.25 }}>
          {steps.map((step, i) => (
            <Box component="li" key={step} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box component="span" aria-hidden="true" sx={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: `2px solid ${ACCENT}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800, color: ACCENT }}>
                {String(i + 1).padStart(2, '0')}
              </Box>
              <Typography variant="body1" sx={{ color: TEXT }}>{step}</Typography>
            </Box>
          ))}
        </Box>

        <Typography variant="h5" component="p" sx={{ color: ACCENT, marginBottom: 1.5 }}>{linksTitle}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {links.map(({ label, href }) => (
            <Button key={href} href={href} target="_blank" rel="noopener noreferrer" variant="outlined" size="small"
              sx={{
                borderRadius: 999, paddingX: 2, paddingY: 0.5, color: TEXT, borderColor: 'rgba(255, 237, 213, 0.45)',
                '&:hover': { borderColor: TEXT, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
              }}>
              {label} <Box component="span" aria-hidden="true" sx={{ marginLeft: 0.75 }}>↗</Box>
              <Box component="span" sx={visuallyHidden}> (opens in a new tab)</Box>
            </Button>
          ))}
        </Box>
      </Box>

    </Box>
  );
}

export default Hero;
