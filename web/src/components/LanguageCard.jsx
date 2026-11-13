// PURPOSE: One container style for the language going into and out of the models (the question, each answer):
//          white card, hairline border, a header row (colour squares + small-capitals label + optional extra on the right), serif body
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// WHY: input and output share this card, so the page reads: input at the top, output at the bottom, the harness's analysis (sans) between

import { Box, Typography } from '@mui/material';
import { SURFACE } from './Section.jsx';

// Props: label (header text), labelComponent (HTML element for the label, e.g. 'h3'), colours (one square per model shown),
//        action (optional element at the right of the header), children (the card body)
function LanguageCard({ label, labelComponent = 'p', colours = [], action, children, sx }) {
  return (
    <Box sx={{ ...SURFACE, height: '100%', overflow: 'hidden', ...sx }}>

      {/* HEADER ROW: styled like the table headings */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', paddingX: 2, paddingY: 1.25, borderBottom: '1px solid rgba(124, 45, 18, 0.08)', backgroundColor: '#FFFBF5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {colours.map((c) => (
            <Box key={c} aria-hidden="true" sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: c }} />
          ))}
          <Typography variant="h5" component={labelComponent} sx={{ color: 'text.primary', margin: 0 }}>{label}</Typography>
        </Box>
        {action}
      </Box>

      {/* BODY */}
      <Box sx={{ padding: { xs: 2, sm: 2.5 } }}>
        {children}
      </Box>

    </Box>
  );
}

export default LanguageCard;
