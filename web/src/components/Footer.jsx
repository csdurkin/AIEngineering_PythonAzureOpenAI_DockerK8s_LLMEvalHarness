// PURPOSE: Page footer, shared by both sections: the dusk at the end of the sunset, with the author's name and contact
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Box, Typography } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { AUTHOR_NAME, AUTHOR_GITHUB } from '../lib/links.js';
import { C } from '../lib/design.js';

function Footer() {
  return (
    <Box component="footer" sx={{ backgroundColor: C.rustDark }}>
      <Box sx={{ maxWidth: 1280, marginX: 'auto', paddingX: { xs: 2, sm: 4 }, paddingY: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" sx={{ color: C.paleOrange, fontWeight: 600 }}>{AUTHOR_NAME}</Typography>
        <Typography variant="body2" component="a" href={AUTHOR_GITHUB} target="_blank" rel="noopener noreferrer"
          sx={{ color: C.peach, textDecoration: 'underline', textUnderlineOffset: 3, '&:hover': { color: C.white } }}>
          GitHub: csdurkin<Box component="span" sx={visuallyHidden}> (opens in a new tab)</Box>
        </Typography>
      </Box>
    </Box>
  );
}

export default Footer;
