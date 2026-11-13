// PURPOSE: One model's answer (model output) for one case, in serif, with what the model did; scores are compared in ScoresTable
// SOURCE: new ("not found" fallback follows Connor's Library app BookDetails.jsx)
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Typography, Chip } from '@mui/material';
import LanguageCard from './LanguageCard.jsx';
import { SERIF_FONT, SERIF_SIZE } from '../muiStyling/theme.js';

//CONSTANT: chip colour per status
const STATUS_COLOUR = { answered: 'primary', abstained: 'default', refused: 'secondary', blocked: 'warning' };

// Props: name (display name), colour (the model's identity colour), result (this model's record, or undefined),
//        emptyText (shown when there is no result)
function ModelPanel({ name, colour, result, emptyText = 'This model has no result for this case.' }) {
  return (
    <LanguageCard
      label={name}
      labelComponent="h5"
      colours={[colour]}
      action={result ? <Chip label={result.status} color={STATUS_COLOUR[result.status] ?? 'default'} size="small" /> : null}
    >
      {result ? (
        //ANSWER: kept as written, line breaks included; serif, as it is language the model produced
        <Typography sx={{ fontFamily: SERIF_FONT, fontSize: SERIF_SIZE, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {result.answer}
        </Typography>
      ) : (
        //FALLBACK: adapted from BookDetails.jsx "Book not found."
        <Typography variant="body1" color="text.secondary">{emptyText}</Typography>
      )}
    </LanguageCard>
  );
}

export default ModelPanel;
