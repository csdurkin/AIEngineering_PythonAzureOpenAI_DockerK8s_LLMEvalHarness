// PURPOSE: "Run Prompts" section; states plainly that live questions are not built
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Paper, Typography } from '@mui/material';

function RunPromptsPage() {
    return (
        <Paper sx={{ marginTop: 3 }}>
            <Typography variant="h2" gutterBottom>Run Prompts</Typography>
            <Typography variant="body1" sx={{ textAlign: 'center' }}>
                Not built. Live questions are a planned later phase.
            </Typography>
        </Paper>
    );
}

export default RunPromptsPage;
