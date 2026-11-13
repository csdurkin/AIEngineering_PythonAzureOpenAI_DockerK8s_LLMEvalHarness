// PURPOSE: The question picker, styled as the question itself: the chosen question shows large in serif and is the control; click it to choose another
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/components/Search.jsx (adapted: the "SELECT QUERY TYPE" <Select> block only; GraphQL queries, year and genre selects and the text field removed; options built from the case list instead of typed by hand; outline and floating label removed so the value reads as a headline)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

import { Box, Select, MenuItem, Typography } from '@mui/material';
import { SERIF_FONT, SERIF_SIZE } from '../muiStyling/theme.js';
import { C } from '../lib/design.js';

// Props: cases (list of {id, question}), value (chosen case id), onChange (called with the new case id)
function CaseSelector({ cases, value, onChange }) {

  return (

    <Box>

      {/**VALUE: the chosen case id
       * On Change: pass the menu item's value (a case id) up to the page, which holds the state
       * fullWidth makes the component span the full width of its container.
       * variant="standard" + disableUnderline: no box or line, so the chosen question reads as a headline
       * renderValue: the closed control shows only the question, large, in serif
       * aria-label: names the control for screen readers, since there is no visible label inside it
       */}

      <Select
        variant="standard"
        disableUnderline
        value={value}
        onChange={(e) => onChange(e.target.value)}
        renderValue={(id) => cases.find((x) => x.id === id)?.question ?? ''}
        fullWidth
        inputProps={{ 'aria-label': 'Test question' }}
        MenuProps={{ PaperProps: { sx: { maxHeight: 480, padding: 0 } } }}
        sx={{
          fontFamily: SERIF_FONT,
          fontSize: { xs: '1.25rem', sm: '1.375rem' },
          fontWeight: 500,
          lineHeight: 1.4,
          borderRadius: 2,
          transition: 'background-color 0.2s ease',
          '&:hover': { backgroundColor: C.accentTint },                                 // pale blue: blue is the "you can click this" accent
          '&.Mui-focused': { backgroundColor: C.accentTint, outline: `2px solid ${C.accent}`, outlineOffset: 2 },
          '& .MuiSelect-select': { whiteSpace: 'normal', paddingY: 1, paddingLeft: 1, paddingRight: '2.5rem !important' },
          '& .MuiSelect-icon': { color: C.accent, fontSize: '2rem', right: 4 },
        }}
      >

        {/**MAP: one MenuItem per case, replacing the hand-typed MenuItems in Search.jsx */}
        {cases.map((c) => (
          <MenuItem key={c.id} value={c.id} sx={{ whiteSpace: 'normal', display: 'block', paddingY: 1.25 }}>
            <Box component="span" sx={{ fontFamily: SERIF_FONT, fontSize: SERIF_SIZE, fontWeight: 500 }}>{c.question}</Box>
            <Typography component="span" variant="body2" color="text.secondary" sx={{ marginLeft: 1 }}>
              {c.id}
            </Typography>
          </MenuItem>
        ))}

      </Select>

    </Box>
  );
}

export default CaseSelector;
