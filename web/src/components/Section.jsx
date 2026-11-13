// PURPOSE: Page building blocks. Sections sit directly on their band (no box); hierarchy comes from type and space:
//            Section    : small coloured label (eyebrow) above a bold h3 title, then the content
//            SubSection : an h4 heading, with a hairline rule above when it follows another SubSection
//            SURFACE    : the white surface, used only where content needs one (input and answer cards, tables, tiles)
// SOURCE: new (colours follow the sunset palette in theme.js; text colours meet the WCAG AA 4.5:1 contrast ratio)
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Box, Typography } from '@mui/material';

//CONSTANT: the white surface style
export const SURFACE = {
  backgroundColor: '#FFFFFF',
  borderRadius: 3,                                      // 12px
  border: '1px solid rgba(124, 45, 18, 0.12)',          // quiet warm hairline
  boxShadow: '0 1px 2px rgba(124, 45, 18, 0.05), 0 6px 18px rgba(124, 45, 18, 0.06)',
};

//EYEBROW: small uppercase label above a title, e.g. "SHARED INPUT"
export function Eyebrow({ children, color = '#9A3412' }) {   // dark burnt orange; at least 4.5:1 on every band
  return (
    <Typography component="p" sx={{ color, fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 1 }}>
      {children}
    </Typography>
  );
}

// Props: eyebrow (small label), title (h3 text), children
function Section({ eyebrow, title, children }) {
  return (
    <Box>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Typography variant="h3" sx={{ marginBottom: 3 }}>{title}</Typography>
      {children}
    </Box>
  );
}

// Props: title (h4 text), action (optional element at the right of the heading), children
export function SubSection({ title, action, children }) {
  return (
    <Box
      sx={{
        '& + &': { borderTop: '1px solid rgba(124, 45, 18, 0.14)', marginTop: 4, paddingTop: 4 },   // hairline and 32px either side between sub-sections
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, marginBottom: 2 }}>
        <Typography variant="h4">{title}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

export default Section;
