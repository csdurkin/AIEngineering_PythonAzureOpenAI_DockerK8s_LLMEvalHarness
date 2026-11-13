// PURPOSE: Page footer, shared by both sections: the dusk at the end of the sunset, with the author's name and contact
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Box, Typography } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { AUTHOR_NAME, AUTHOR_GITHUB } from '../lib/links.js';

function Footer() {
  return (
    <Box component="footer" sx={{ backgroundColor: '#7C2D12' }}>
      <Box sx={{ maxWidth: 1280, marginX: 'auto', paddingX: { xs: 2, sm: 4 }, paddingY: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" sx={{ color: '#FFF7ED', fontWeight: 600 }}>{AUTHOR_NAME}</Typography>
        <Typography variant="body2" component="a" href={AUTHOR_GITHUB} target="_blank" rel="noopener noreferrer"
          sx={{ color: '#FFEDD5', textDecoration: 'underline', textUnderlineOffset: 3, '&:hover': { color: '#FFFFFF' } }}>
          GitHub: csdurkin<Box component="span" sx={visuallyHidden}> (opens in a new tab)</Box>
        </Typography>
      </Box>
    </Box>
  );
}

export default Footer;
