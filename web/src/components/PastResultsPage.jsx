// PURPOSE: "See Past Results" section; holds the chosen case and shows the dropdown, then that case's details
//          (conclusion, shared chunks and the two model columns are added in later steps)
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

//IMPORTS
import { useState } from 'react';
import { Paper, Typography } from '@mui/material';
import CaseSelector from './CaseSelector.jsx';
import arenaData from '../data/arena-data.json';      //Built by scripts/build_viewer_data.py; bundled at build time, so no fetch and no network

//CONSTANT: the case shown first (brief: a known retrieval miss, so the page opens on a finding)
const DEFAULT_CASE_ID = 'c-positive-form';

function PastResultsPage({ data = arenaData }) {

  //STATE MANAGEMENT
    //selectedId: the case chosen in the dropdown; falls back to the first case if the default is missing
    const cases = data.cases;
    const startId = cases.some((c) => c.id === DEFAULT_CASE_ID) ? DEFAULT_CASE_ID : cases[0]?.id ?? '';
    const [selectedId, setSelectedId] = useState(startId);

    const selected = cases.find((c) => c.id === selectedId);

  return (
    <Paper sx={{ marginTop: 3 }}>

      <Typography variant="h2" gutterBottom>See Past Results</Typography>

      {/* DROPDOWN */}
      <CaseSelector cases={cases} value={selectedId} onChange={setSelectedId} />

      {/* PURPOSE: Case not found fallback
          SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/components/BookDetails.jsx ("Book not found." block, adapted)
          AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor */}
      {!selected ? (
        <Typography variant="body1">Case not found.</Typography>
      ) : (

        /* PURPOSE: The chosen case's question; the shared and per-model sections follow in later steps
           SOURCE: new
           AUTHORSHIP: drafted by Claude; reviewed by Connor */
        <Typography variant="h5" component="p" sx={{ textAlign: 'left' }}>
          {selected.question}
        </Typography>
      )}

    </Paper>
  );
}

export default PastResultsPage;
