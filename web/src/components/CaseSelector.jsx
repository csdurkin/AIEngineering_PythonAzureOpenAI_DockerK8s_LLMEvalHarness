// PURPOSE: Case dropdown; one option per golden case, labelled "id: question"; reports the chosen case id upwards
// SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/components/Search.jsx (adapted: the "SELECT QUERY TYPE" <Select> block only; GraphQL queries, year and genre selects and the text field removed; options built from the case list instead of typed by hand)
// AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor

import { Box, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

// Props: cases (list of {id, question}), value (chosen case id), onChange (called with the new case id)
function CaseSelector({ cases, value, onChange }) {

  return (

    <Box sx={{ marginY: 2 }}>

      {/**VALUE: the chosen case id
       * On Change: pass the menu item's value (a case id) up to the page, which holds the state
       * displayEmpty shows a placeholder option when no value is selected
       * fullWidth makes the component span the full width of its container.
       * FormControl + InputLabel: gives the dropdown a visible label that screen readers also announce
       */}

      <FormControl fullWidth>

        <InputLabel id="case-select-label">Test case</InputLabel>

        <Select
          labelId="case-select-label"
          label="Test case"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          displayEmpty
          fullWidth
        >

          {/**MAP: one MenuItem per case, replacing the hand-typed MenuItems in Search.jsx */}
          {cases.map((c) => (
            <MenuItem key={c.id} value={c.id} sx={{ whiteSpace: 'normal' }}>
              {c.id}: {c.question}
            </MenuItem>
          ))}

        </Select>

      </FormControl>

    </Box>
  );
}

export default CaseSelector;
