// PURPOSE: "See Past Results" section. Full-width bands joined by the pipeline spine, top to bottom:
//          hero, 01 start here (question picker), 02 summary, 03 shared retrieval, 04 model output (where models separate); the footer is in App.jsx
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

//IMPORTS
import { useState } from 'react';
import { Box, Typography, Grid, Fade, Chip } from '@mui/material';
import Band, { SUNSET } from './Band.jsx';
import CaseSelector from './CaseSelector.jsx';
import ConclusionPanel from './ConclusionPanel.jsx';
import IntroPanel, { HERO_BG } from './IntroPanel.jsx';
import LanguageCard from './LanguageCard.jsx';
import SharedPanel from './SharedPanel.jsx';
import ComparisonTiles, { MODEL_COLOURS } from './ComparisonTiles.jsx';
import ScoresTable from './ScoresTable.jsx';
import ModelPanel from './ModelPanel.jsx';
import Section, { SubSection, Eyebrow } from './Section.jsx';
import arenaData from '../data/arena-data.json';
import { AUTHOR_NAME, AUTHOR_GITHUB } from '../lib/links.js';      //Built by scripts/build_viewer_data.py; bundled at build time, so no fetch and no network

//CONSTANT: the case shown first (brief: a known retrieval miss, so the page opens on a finding)
const DEFAULT_CASE_ID = 'c-positive-form';

//HELPER: "2026-10-04" -> "4 October 2026"
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function PastResultsPage({ data = arenaData }) {

  //STATE MANAGEMENT
    //selectedId: the case chosen in the dropdown; falls back to the first case if the default is missing
    const { cases, meta } = data;
    const startId = cases.some((c) => c.id === DEFAULT_CASE_ID) ? DEFAULT_CASE_ID : cases[0]?.id ?? '';
    const [selectedId, setSelectedId] = useState(startId);

    const selected = cases.find((c) => c.id === selectedId);

  return (
    <Box>

      {/* INTRO: full-width dark hero; what the page shows and links to the evidence; the page's h2 */}
      <Band panel={false} background={HERO_BG} label="About this page">
        <IntroPanel meta={meta} runDateText={longDate(meta.run_date)} startId="start" />
      </Band>

      {/* 01 START HERE: the instruction first, then the question picker (the question is the control);
          the card matches the answer cards (output) in band 04 */}
      <Band id="start" step="01" first from={SUNSET[0]} to={SUNSET[1]} label="Choose a test question">
        <Eyebrow color="#1D4ED8">Start here</Eyebrow>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>Choose one of {meta.case_count} test questions</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 3, maxWidth: '72ch' }}>
          Click the question below to choose another. Every section underneath updates to that question.
        </Typography>

        <LanguageCard
          label={`Question sent to ${meta.models.join(' and ')}`}
          colours={MODEL_COLOURS.slice(0, meta.models.length)}
          action={<Typography variant="body2" sx={{ color: '#1D4ED8', fontWeight: 600 }}>Click to change</Typography>}
          sx={{ height: 'auto' }}
        >
          <CaseSelector cases={cases} value={selectedId} onChange={setSelectedId} />

          {/* TEST DETAILS as labelled pills */}
          {selected && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginTop: 1.5, paddingLeft: 1 }}>
              <Chip size="small" variant="outlined" label={`Test: ${selected.id}`} />
              <Chip size="small" variant="outlined" label={`Category: ${selected.category}`} />
              <Chip size="small" variant="outlined" label={`Expected: ${selected.behaviour}`} />
            </Box>
          )}
        </LanguageCard>
      </Band>

      {/* PURPOSE: Case not found fallback
          SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/components/BookDetails.jsx ("Book not found." block, adapted)
          AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor */}
      {!selected ? (
        <Band step="02" last from={SUNSET[1]} label="Case not found">
          <Typography variant="body1">Case not found.</Typography>
        </Band>
      ) : (

        //FADE: keyed by case id, so switching questions fades the results in
        <Fade in key={selected.id} timeout={300}>
          <Box>

            {/* 02 SUMMARY */}
            <Band step="02" from={SUNSET[1]} to={SUNSET[2]} label="Summary">
              <ConclusionPanel caseData={selected} modelNames={meta.models} />
            </Band>

            {/* 03 SHARED RETRIEVAL */}
            <Band step="03" from={SUNSET[2]} to={SUNSET[3]} label="Shared retrieval">
              <SharedPanel caseData={selected} retrievalMeta={meta.retrieval} />
            </Band>

            {/* 04 MODEL OUTPUT: the gaps as stat tiles, each model's answer side by side, then every score */}
            <Band step="04" last from={SUNSET[3]} to={SUNSET[4]} label="Model output">
              <Section eyebrow="Model output" title="Where models separate">
                <SubSection title="Speed, length and cost">
                  <ComparisonTiles caseData={selected} modelNames={meta.models} />
                </SubSection>

                {/* PURPOSE: Two model columns side by side; stacked on narrow screens
                    SOURCE: https://github.com/csdurkin/WebProgramming_ReactGraphQL_LibraryApp/blob/main/react_client/src/components/Search.jsx (Grid container / Grid item xs sm md pattern, adapted)
                    AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor */}
                <SubSection
                  title="Answers"
                  action={<Chip label="Output" size="small" variant="outlined" sx={{ borderColor: '#9A3412', color: '#9A3412', fontWeight: 700, letterSpacing: '0.06em' }} />}
                >
                  <Grid container spacing={2}>
                    {meta.models.map((name, i) => (
                      <Grid item xs={12} md={6} key={name}>
                        <ModelPanel name={name} colour={MODEL_COLOURS[i]} result={selected.models[name]} />
                      </Grid>
                    ))}
                  </Grid>
                </SubSection>

                {/* SCORES: one table for both models, styled like the rules table */}
                <SubSection title="Scores">
                  <ScoresTable caseData={selected} modelNames={meta.models} colours={MODEL_COLOURS} />
                </SubSection>
              </Section>
            </Band>

          </Box>
        </Fade>
      )}

    </Box>
  );
}

export default PastResultsPage;
