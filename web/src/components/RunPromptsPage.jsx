// PURPOSE: "Run prompts" section. Mirrors Past results, but the input is a text area. On Ask:
//            1. the question server (api/app.py) returns its retrieval breakdown (POST /api/retrieve, no model call),
//               so step 03 fills within moments
//            2. at the same time it asks both models through the harness's agent and scores each answer (POST /api/ask);
//               step 04 shows the answers, tiles and scores as Past results does
//          Layout: hero, 01 start here (text area), 02 summary, 03 shared retrieval, 04 model output
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// SHAPE: a typed question becomes the same shape as a case in arena-data.json (typedCase), so the same panels can show it

//IMPORTS
import { useMemo, useRef, useState } from 'react';
import { Box, Typography, Grid, Fade, Chip, Button, InputBase, LinearProgress, Alert } from '@mui/material';
import Band from './Band.jsx';
import Hero from './Hero.jsx';
import LanguageCard from './LanguageCard.jsx';
import SharedPanel from './SharedPanel.jsx';
import ModelPanel from './ModelPanel.jsx';
import ComparisonTiles from './ComparisonTiles.jsx';
import ScoresTable from './ScoresTable.jsx';
import { outcome, separation, retrievalSummary, retrievalCheck } from '../lib/summary.js';
import Section, { SubSection, Eyebrow } from './Section.jsx';
import { askModels, retrieveQuestion } from '../lib/api.js';
import { REPO_URL } from '../lib/links.js';
import { SERIF_FONT } from '../muiStyling/theme.js';
import arenaData from '../data/arena-data.json';
import { C, SUNSET, MODEL_COLOURS, HERO_BG } from '../lib/design.js';

//CONSTANTS
const MODELS = arenaData.meta.models;                                    // the same two models as the past run
const RETRIEVAL_SETTINGS = arenaData.meta.retrieval;                     // k, min_overlap, chunk_count: the harness's settings, written by build_viewer_data.py
const MAX_LENGTH = 500;                                                  // matches MAX_QUESTION in api/app.py
const EXAMPLES = [                                                       // not golden questions, so they show something new
  'Should I write my report in the active voice?',
  'Is "not very often" a good phrase to use?',
  'How do I keep related words together in a sentence?',
];

//  TYPED CASE: a typed question in the same shape as one case in arena-data.json; no answer key, so no expected facts or source
function typedCase(question, retrieved, models) {
  return {
    id: 'your-question',
    category: 'your question',
    behaviour: 'unknown',
    question,
    expected_facts: [],
    expected_source: null,
    query: retrieved.query,
    retrieval: retrieved.retrieval,
    models,
  };
}

function RunPromptsPage() {

  //STATE MANAGEMENT
    //draft: what is in the text area; asked: the question last run
    //phase: 'idle' | 'loading' | 'done' | 'error'; retrieved: the server's retrieval breakdown; reply: the models' answers; error: a readable message
    const [draft, setDraft] = useState('');
    const [asked, setAsked] = useState('');
    const [phase, setPhase] = useState('idle');
    const [retrieved, setRetrieved] = useState(null);
    const [reply, setReply] = useState(null);
    const [error, setError] = useState('');
    const latest = useRef(0);                                            // ignore replies to an older question

    //CASE: retrieval as soon as it arrives; the models once they have answered
    const caseData = useMemo(() => {
      if (!asked || !retrieved) return null;
      return typedCase(asked, retrieved, phase === 'done' && reply ? reply.models : {});
    }, [asked, retrieved, phase, reply]);

    //ASK: both requests start together; retrieval needs no model, so it returns first and step 03 fills while the models answer
    const run = async (question = draft) => {
      const q = question.trim();
      if (!q || phase === 'loading') return;
      const id = ++latest.current;
      setDraft(q); setAsked(q); setPhase('loading'); setRetrieved(null); setReply(null); setError('');
      try {
        const answers = askModels(q);
        answers.catch(() => {});                                         // handled below; stops an "unhandled rejection" if retrieval fails first
        const breakdown = await retrieveQuestion(q);
        if (id !== latest.current) return;
        setRetrieved(breakdown);
        const result = await answers;
        if (id === latest.current) { setReply(result); setPhase('done'); }
      } catch (e) {
        if (id === latest.current) { setError(e.message); setPhase('error'); }
      }
    };

    const isMock = reply?.meta?.provider === 'mock';

    //SUMMARY SENTENCE: retrieval always; the models' outcome and separation once they have answered
    const summary = caseData && [
      retrievalSummary(caseData, RETRIEVAL_SETTINGS),
      phase === 'done' && outcome(MODELS[0], caseData.models[MODELS[0]], MODELS[1], caseData.models[MODELS[1]]),
      phase === 'done' && separation(MODELS[0], caseData.models[MODELS[0]], MODELS[1], caseData.models[MODELS[1]]),
      phase === 'done' && retrievalCheck(caseData),
    ].filter(Boolean).join(' ');

  return (
    <Box>

      {/* HERO */}
      <Band panel={false} background={HERO_BG} label="About this page">
        <Hero
          eyebrow="LLM evaluation harness · ask your own"
          title="Ask your own question"
          body={
            `Type a writing-style question and send it to both models through the harness's own agent. You see which of the ` +
            `${RETRIEVAL_SETTINGS.chunk_count} style rules were retrieved, then each model's answer, scored for relevance and safety, timed and costed.`
          }
          note="Accuracy and retrieval hit need an answer key, so they show n/a for your own questions."
          cta={{ label: 'Write a question', href: '#ask' }}
          steps={['Write a question', 'Read the summary', 'See what both models were given', 'Compare where they separate']}
          links={[
            { label: 'Harness on GitHub', href: REPO_URL },
            { label: 'Agent code (agent.py)', href: `${REPO_URL}/blob/main/src/llm_eval/agent.py` },
            { label: `The ${RETRIEVAL_SETTINGS.chunk_count} style rules`, href: `${REPO_URL}/tree/main/data/docs` },
          ]}
        />
      </Band>

      {/* 01 START HERE: the text area; same card style as the answers in band 04 */}
      <Band id="ask" step="01" first last={!caseData} from={SUNSET[0]} to={SUNSET[1]} label="Write a question">
        <Eyebrow color={C.accentDark}>Start here</Eyebrow>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>Write a question</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 3, maxWidth: '72ch' }}>
          Ask about writing style, as a student might.
          <br />
          Press Ask both models, or Ctrl+Enter (Cmd+Enter on a Mac).
        </Typography>

        <LanguageCard
          label={`Question for ${MODELS.join(' and ')}`}
          colours={MODEL_COLOURS.slice(0, MODELS.length)}
          action={<Typography variant="body2" color="text.secondary">{draft.length} / {MAX_LENGTH}</Typography>}
          sx={{ height: 'auto' }}
        >
          {/* TEXT AREA: serif, like the question on Past results, as it is language for the models */}
          <InputBase
            multiline
            minRows={2}
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
            placeholder="e.g. Should I avoid starting sentences with “however”?"
            inputProps={{ 'aria-label': 'Your question' }}
            sx={{
              fontFamily: SERIF_FONT, fontSize: { xs: '1.25rem', sm: '1.375rem' }, fontWeight: 500, lineHeight: 1.4,
              borderRadius: 2, padding: 1, transition: 'background-color 0.2s ease',
              '&:hover': { backgroundColor: C.accentTint },
              '&.Mui-focused': { backgroundColor: C.accentTint, outline: `2px solid ${C.accent}`, outlineOffset: 2 },
            }}
          />

          {/* ASK */}
          <Box sx={{ marginTop: 2, paddingLeft: 1 }}>
            <Button variant="contained" disableElevation onClick={() => run()} disabled={!draft.trim() || phase === 'loading'}
              sx={{ borderRadius: 999, paddingX: 3, backgroundColor: C.accent, '&:hover': { backgroundColor: C.accentDark } }}>
              {phase === 'loading' ? 'Asking…' : 'Ask both models'}
            </Button>
          </Box>

          {/* EXAMPLES: on their own line under the button */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, marginTop: 2, paddingLeft: 1 }}>
            <Typography variant="body2" color="text.secondary">Or try…</Typography>
            {EXAMPLES.map((q) => (
              <Chip key={q} label={q} size="small" variant="outlined" clickable disabled={phase === 'loading'} onClick={() => run(q)} sx={{ fontFamily: SERIF_FONT }} />
            ))}
          </Box>
        </LanguageCard>

        {/* ERROR BEFORE RETRIEVAL: nothing to show below yet (usually the server is not running), so say so here */}
        {phase === 'error' && !caseData && (
          <Alert severity="error" sx={{ marginTop: 3, borderRadius: 3 }}
            action={<Button color="inherit" size="small" onClick={() => run(asked)}>Try again</Button>}>
            {error}
          </Alert>
        )}
      </Band>

      {/* RESULTS: after the first ask */}
      {caseData && (
        <Fade in key={caseData.question} timeout={300}>
          <Box>

            {/* 02 SUMMARY */}
            <Band step="02" from={SUNSET[1]} to={SUNSET[2]} label="Summary">
              <Eyebrow>At a glance</Eyebrow>
              <Typography variant="h3" sx={{ marginBottom: 2 }}>Summary</Typography>
              <Typography variant="body1" aria-live="polite" sx={{ fontWeight: 500, maxWidth: '72ch', borderLeft: `3px solid ${C.orange}`, paddingLeft: 2 }}>
                {summary}
                {phase === 'loading' && ' Waiting for both models…'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1.5 }}>
                {isMock
                  ? 'Mock provider: answers are the harness’s scripted test replies, not real model output; times and costs are estimates.'
                  : 'One run per model, so these are single observations, not averages.'}
              </Typography>
            </Band>

            {/* 03 SHARED RETRIEVAL: the same panel as Past results, fed by the server's retrieval breakdown */}
            <Band step="03" from={SUNSET[2]} to={SUNSET[3]} label="Shared retrieval">
              <SharedPanel caseData={caseData} retrievalMeta={RETRIEVAL_SETTINGS} />
            </Band>

            {/* 04 MODEL OUTPUT */}
            <Band step="04" last from={SUNSET[3]} to={SUNSET[4]} label="Model output">
              <Section eyebrow="Model output" title="Where models separate">

                {/* MOCK BANNER: never let scripted replies pass for real ones */}
                {isMock && (
                  <Alert severity="info" sx={{ marginBottom: 3, borderRadius: 3 }}>
                    The server is running with the mock provider, so both answers are the same scripted reply. Start it with
                    LLM_PROVIDER=azure for real model answers.
                  </Alert>
                )}

                {/* ERROR: what went wrong, and a way to try again */}
                {phase === 'error' && (
                  <Alert severity="error" sx={{ marginBottom: 3, borderRadius: 3 }}
                    action={<Button color="inherit" size="small" onClick={() => run(asked)}>Try again</Button>}>
                    {error}
                  </Alert>
                )}

                {/* LOADING: one card per model with a progress bar */}
                {phase === 'loading' && (
                  <Grid container spacing={2}>
                    {MODELS.map((name, i) => (
                      <Grid item xs={12} md={6} key={name}>
                        <ModelPanel name={name} colour={MODEL_COLOURS[i]} emptyText={`Asking ${name}…`} />
                        <LinearProgress sx={{ marginTop: -0.5, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} aria-label={`Waiting for ${name}`} />
                      </Grid>
                    ))}
                  </Grid>
                )}

                {/* DONE: the same tiles, answer cards and scores table as Past results */}
                {phase === 'done' && (
                  <>
                    <SubSection title="Speed, length and cost">
                      <ComparisonTiles caseData={caseData} modelNames={MODELS} />
                    </SubSection>
                    <SubSection title="Answers">
                      <Grid container spacing={2}>
                        {MODELS.map((name, i) => (
                          <Grid item xs={12} md={6} key={name}>
                            <ModelPanel name={name} colour={MODEL_COLOURS[i]} result={caseData.models[name]} />
                          </Grid>
                        ))}
                      </Grid>
                    </SubSection>
                    <SubSection title="Scores">
                      <ScoresTable caseData={caseData} modelNames={MODELS} colours={MODEL_COLOURS} />
                    </SubSection>
                  </>
                )}

              </Section>
            </Band>

          </Box>
        </Fade>
      )}

    </Box>
  );
}

export default RunPromptsPage;
