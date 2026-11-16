// PURPOSE: "Report" section: the whole 4 October run, both models side by side, as the harness's report.md gives it for each.
//          Layout: hero, 01 verdict, 02 headline metrics, 03 by category, 04 failing cases; the footer is in App.jsx
// SOURCE: new (the rows follow src/llm_eval/report.py "Headline metrics", "By category" and "Failing cases")
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// DATA: arena-data.json "report", built by scripts/build_viewer_data.py from each results.json; pass/fail comes from the harness's
//       check_thresholds(), so this page never re-checks a limit itself

//IMPORTS
import { Box, Typography, Button, Chip, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import Band from './Band.jsx';
import Hero from './Hero.jsx';
import Section, { SubSection } from './Section.jsx';
import arenaData from '../data/arena-data.json';
import { fmt, ratio } from '../lib/format.js';
import { failureReason } from '../lib/summary.js';
import { REPO_URL, evidenceUrl, reportUrl } from '../lib/links.js';
import { SERIF_FONT } from '../muiStyling/theme.js';
import { C, SUNSET, MODEL_COLOURS, HERO_BG, SURFACE } from '../lib/design.js';

//CONSTANT: headline rows, in report.md order; `limit` names the thresholds.yaml key, `sign` how the limit reads
const HEADLINE = [
  { label: 'Accuracy', key: 'accuracy', kind: 'pct', limit: 'min_accuracy', sign: '≥' },
  { label: 'Relevance (judge)', key: 'relevance', kind: 'pct', limit: 'min_relevance', sign: '≥' },
  { label: 'Safety pass rate', key: 'safety_pass_rate', kind: 'pct', limit: 'min_safety_pass_rate', sign: '≥' },
  { label: 'Retrieval hit rate', key: 'retrieval_hit_rate', kind: 'pct' },
  { label: 'Latency, median (p50)', key: 'latency_p50_s', kind: 'sec', unit: ' s' },
  { label: 'Latency, 95th percentile (p95)', key: 'latency_p95_s', kind: 'sec', unit: ' s', limit: 'max_latency_p95_s', sign: '≤' },
  { label: 'Agent cost per case', key: 'cost_per_case_usd', kind: 'usd', limit: 'max_cost_per_case_usd', sign: '≤' },
  { label: 'Agent cost, all cases', key: 'agent_cost_usd', kind: 'usd' },
  { label: 'Input tokens, all cases', key: 'input_tokens', kind: 'int' },
  { label: 'Output tokens, all cases', key: 'output_tokens', kind: 'int' },
  { label: 'Judge cost, all cases (scoring, not the agent)', key: 'judge_cost_usd', kind: 'usd' },
];

//CONSTANT: the two groups of headline rows, each its own table; if every quality measure is equal the verdict says the models tied
const QUALITY = HEADLINE.slice(0, 4);
const SPEED_AND_COST = HEADLINE.slice(4);

//CONSTANT: by-category columns, as in report.md
const CATEGORY_COLUMNS = [
  { label: 'Accuracy', key: 'accuracy' },
  { label: 'Relevance', key: 'relevance' },
  { label: 'Safety', key: 'safety_pass_rate' },
];

//HELPERS
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const show = (value, row) => (value == null ? 'n/a' : `${fmt(value, row.kind)}${row.unit ?? ''}`);

//  BREACHED: did this model fail this threshold? Read from the harness's own failure messages ("<metric>=<value> breaches <key>=<limit>")
const breached = (model, limitKey) => model.failures.some((f) => f.includes(` breaches ${limitKey}=`));

//  DIFFERENCE: percentages as points; under 5% apart as a percentage (a ratio would round to "1.0x");
//  otherwise as how many times larger, and for which model
function difference(row, names, values) {
  const [a, b] = values;
  if (a == null || b == null) return 'n/a';
  if (a === b) return 'Same';
  if (row.kind === 'pct') {
    const pts = (b - a) * 100;
    return `${pts > 0 ? '+' : ''}${pts.toFixed(1)} pts for ${names[1]}`;
  }
  const [hi, lo, who] = a > b ? [a, b, names[0]] : [b, a, names[1]];
  if (hi / lo < 1.05) return `${(((hi - lo) / lo) * 100).toFixed(1)}% higher for ${who}`;
  return `${ratio(hi, lo)} higher for ${who}`;
}

//  VERDICT SENTENCE: worked out from the data, never written by hand
function verdictSentence(names, models, limitCount) {
  const [a, b] = names.map((n) => models[n].summary);
  const parts = [];

  const qualityDiffers = QUALITY.filter((row) => a[row.key] !== b[row.key]);
  parts.push(qualityDiffers.length === 0
    ? `Both models scored the same on ${QUALITY.map((r) => `${r.label.toLowerCase()} (${show(a[r.key], r)})`).join(', ')}.`
    : `They differ on ${qualityDiffers.map((r) => r.label.toLowerCase()).join(', ')}.`);

  const [fast, slow] = a.latency_p50_s <= b.latency_p50_s ? [0, 1] : [1, 0];
  const p50 = [a.latency_p50_s, b.latency_p50_s];
  const [cheap, dear] = a.cost_per_case_usd <= b.cost_per_case_usd ? [0, 1] : [1, 0];
  const cost = [a.cost_per_case_usd, b.cost_per_case_usd];
  parts.push(
    `${names[fast]} was ${ratio(p50[slow], p50[fast])} faster at the median (${fmt(p50[fast], 'sec')} s against ${fmt(p50[slow], 'sec')} s)` +
    (cheap === fast ? ` and ${ratio(cost[dear], cost[cheap])} cheaper per case (${fmt(cost[cheap], 'usd')} against ${fmt(cost[dear], 'usd')}).`
                    : `; ${names[cheap]} was ${ratio(cost[dear], cost[cheap])} cheaper per case.`)
  );

  const passed = names.filter((n) => models[n].failures.length === 0);
  parts.push(passed.length === names.length
    ? `Both passed all ${limitCount} thresholds.`
    : `${names.filter((n) => !passed.includes(n)).join(' and ')} failed at least one threshold.`);

  return parts.join(' ');
}

//SMALL PARTS
const Swatch = ({ colour }) => <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: colour, flexShrink: 0 }} />;
const ModelHead = ({ name, colour }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap' }}><Swatch colour={colour} />{name}</Box>
);

//  METRICS TABLE: one group of headline rows; no row tint, as the Difference column already says where the models differ
// Props: rows (from HEADLINE), names (models in fixed order), models (report.models), limits (thresholds.yaml), label (aria label)
function MetricsTable({ rows, names, models, limits, label }) {
  return (
    <TableContainer sx={{ ...SURFACE, paddingX: 1 }}>
      <Table size="small" aria-label={label} sx={{ minWidth: 640 }}>   {/* below this width the card scrolls sideways instead of squashing the labels */}
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '34%', minWidth: 160 }}>Measure</TableCell>   {/* labels may wrap, but never to one word a line */}
            {names.map((n, i) => <TableCell key={n} sx={{ width: '15%' }}><ModelHead name={n} colour={MODEL_COLOURS[i]} /></TableCell>)}
            <TableCell>Difference</TableCell>
            <TableCell sx={{ width: '14%' }}>Threshold</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const values = names.map((n) => models[n].summary[row.key]);
            const hasLimit = row.limit && row.limit in limits;
            return (
              <TableRow key={row.key}>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.label}</Typography></TableCell>
                {names.map((n, i) => {
                  const failed = hasLimit && breached(models[n], row.limit);
                  return (
                    <TableCell key={n} sx={{ whiteSpace: 'nowrap', color: failed ? '#B91C1C' : undefined, fontWeight: failed ? 700 : undefined }}>
                      {show(values[i], row)}{failed && ' (fail)'}
                    </TableCell>
                  );
                })}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{difference(row, names, values)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {hasLimit ? `${row.sign} ${show(limits[row.limit], row)}` : <Typography variant="body2" color="text.secondary" component="span">not set</Typography>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

//  CATEGORY VALUE: one number when both models agree; otherwise each model's, with its swatch
function CategoryValue({ values, names }) {
  if (values.every((v) => v === values[0])) return fmt(values[0], 'pct');
  return (
    <Box sx={{ display: 'grid', gap: 0.25 }}>
      {values.map((v, i) => (
        <Box key={names[i]} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }} aria-label={`${names[i]}: ${fmt(v, 'pct')}`}>
          <Swatch colour={MODEL_COLOURS[i]} />{fmt(v, 'pct')}
        </Box>
      ))}
    </Box>
  );
}

// Props: onOpenCase (called with a case id; App switches to Past results showing that case), data (defaults to arena-data.json)
function ReportPage({ onOpenCase, data = arenaData }) {
  const { meta, cases, report } = data;
  const names = meta.models;
  const models = report.models;
  const limits = report.thresholds;
  const limitRows = HEADLINE.filter((row) => row.limit && row.limit in limits);
  const judge = meta.judge_model[names[0]];
  const caseCount = meta.case_count;

  //CATEGORIES: [name, [each model's group]] in report.md order, and which ones the models differ in
  const categories = Object.keys(models[names[0]].summary.by_category)
    .map((category) => [category, names.map((n) => models[n].summary.by_category[category])]);
  const categoriesDiffer = categories
    .filter(([, groups]) => CATEGORY_COLUMNS.some((col) => groups[0]?.[col.key] !== groups[1]?.[col.key]))
    .map(([category]) => category);

  //FAILING CASES: every case either model failed, in cases.yaml order
  const failing = cases.filter((c) => names.some((n) => models[n].failing_cases.includes(c.id)));

  return (
    <Box>

      {/* HERO */}
      <Band panel={false} background={HERO_BG} label="About this page">
        <Hero
          eyebrow="LLM evaluation harness · overall report"
          title={`${names.join(' vs ')}: the overall report`}
          body={
            `The totals from the live run on ${longDate(meta.run_date)}. Both models answered the same ${caseCount} test cases through the ` +
            `same agent, and the same judge (${judge}) scored them. Each model's totals are checked against the harness's pass/fail thresholds.`
          }
          note="One run of each model, so these are single observations, not averages over repeated runs."
          cta={{ label: 'See the verdict', href: '#verdict' }}
          steps={['Read the verdict', 'Compare the headline metrics', 'Check each category', 'See the failing cases']}
          links={[
            ...names.map((n) => ({ label: `${n} report.md`, href: reportUrl(meta.run_date, n) })),
            { label: 'Thresholds (thresholds.yaml)', href: `${REPO_URL}/blob/main/config/thresholds.yaml` },
            { label: 'Run evidence', href: evidenceUrl(meta.run_date) },
          ]}
          linksTitle="Sources on GitHub"
        />
      </Band>

      {/* 01 VERDICT: pass or fail per model, then the sentence */}
      <Band id="verdict" step="01" first from={SUNSET[0]} to={SUNSET[1]} label="Verdict">
        <Section eyebrow="At a glance" title="Verdict">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, marginBottom: 3 }}>
            {names.map((name, i) => {
              const met = limitRows.filter((row) => !breached(models[name], row.limit)).length;
              const pass = models[name].failures.length === 0;
              return (
                <Box key={name} sx={{ ...SURFACE, padding: 2.5, borderTop: `4px solid ${MODEL_COLOURS[i]}` }}>
                  <Typography variant="h5" component="p" sx={{ marginBottom: 1 }}><ModelHead name={name} colour={MODEL_COLOURS[i]} /></Typography>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, color: pass ? '#15803D' : '#B91C1C' }}>
                    {pass ? 'PASS' : 'FAIL'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{met} of {limitRows.length} thresholds met</Typography>
                </Box>
              );
            })}
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 500, maxWidth: '72ch', borderLeft: `3px solid ${C.orange}`, paddingLeft: 2 }}>
            {verdictSentence(names, models, limitRows.length)}
          </Typography>
        </Section>
      </Band>

      {/* 02 HEADLINE METRICS: report.md's rows in two tables, quality then speed and cost, so the tie and the gap each read at a glance */}
      <Band step="02" from={SUNSET[1]} to={SUNSET[2]} label="Headline metrics">
        <Section eyebrow={`All ${caseCount} cases`} title="Headline metrics">
          <SubSection title="Quality">
            <MetricsTable rows={QUALITY} names={names} models={models} limits={limits} label="Quality measures for each model" />
          </SubSection>
          <SubSection title="Speed and cost">
            <MetricsTable rows={SPEED_AND_COST} names={names} models={models} limits={limits} label="Speed and cost for each model" />
            <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1.5, maxWidth: '72ch' }}>
              Latency is the median (p50) and the 95th percentile (p95) of the {caseCount} answer times, as the harness reports it, not a mean.
            </Typography>
          </SubSection>
        </Section>
      </Band>

      {/* 03 BY CATEGORY: one value per cell when the models agree, both when they differ */}
      <Band step="03" from={SUNSET[2]} to={SUNSET[3]} label="By category">
        <Section eyebrow="Where the scores come from" title="By category">
          <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 2, maxWidth: '72ch' }}>
            {categoriesDiffer.length === 0
              ? 'Both models scored the same in every category, so each cell shows one value.'
              : `The models differ in ${categoriesDiffer.join(', ')}; those cells show each model's value.`}
          </Typography>
          <TableContainer sx={{ ...SURFACE, paddingX: 1 }}>
            <Table size="small" aria-label="Scores by category" sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Cases</TableCell>
                  {CATEGORY_COLUMNS.map((col) => <TableCell key={col.key}>{col.label}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map(([category, groups]) => (
                  <TableRow key={category}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{category}</Typography></TableCell>
                    <TableCell>{groups[0].n}</TableCell>
                    {CATEGORY_COLUMNS.map((col) => (
                      <TableCell key={col.key}><CategoryValue values={groups.map((g) => g?.[col.key] ?? null)} names={names} /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1.5, maxWidth: '72ch' }}>
            n/a: the measure does not apply. Out-of-scope and safety cases have no relevance score, and safety cases have no expected facts to check.
          </Typography>
        </Section>
      </Band>

      {/* 04 FAILING CASES: report.md's rule (below full accuracy, or failed safety); why each failed; each opens on Past results */}
      <Band step="04" last from={SUNSET[3]} to={SUNSET[4]} label="Failing cases">
        <Section eyebrow="Where marks were lost" title="Failing cases">
          <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 3, maxWidth: '72ch' }}>
            Cases below full accuracy or failing safety, the rule report.md uses. {failing.length === 0
              ? 'Neither model failed a case.'
              : `${failing.length} of ${caseCount} cases; open one to see the retrieval and both answers.`}
          </Typography>
          {failing.map((c) => {
            const failedBy = names.filter((n) => models[n].failing_cases.includes(c.id));
            return (
              <SubSection key={c.id} title={c.id}
                action={<Button variant="outlined" size="small" onClick={() => onOpenCase(c.id)} sx={{ borderRadius: 999, flexShrink: 0 }}>Open in Past results</Button>}>
                <Typography variant="body2" color="text.secondary" sx={{ marginTop: -1, marginBottom: 1.5 }}>{c.category}</Typography>
                <Typography sx={{ fontFamily: SERIF_FONT, fontSize: '1.125rem', fontWeight: 500, marginBottom: 1.5 }}>{c.question}</Typography>
                <Typography variant="body1" sx={{ maxWidth: '72ch', borderLeft: `3px solid ${C.orange}`, paddingLeft: 2, marginBottom: 2 }}>
                  {failureReason(c, failedBy, meta.retrieval)}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {names.map((n, i) => {
                    const r = c.models[n];
                    return (
                      <Chip key={n} variant="outlined" size="small" icon={<Swatch colour={MODEL_COLOURS[i]} />}
                        label={`${n}: ${r.status} · ${fmt(r.accuracy, 'pct')}${r.safety_passed ? '' : ' · safety fail'}`} />
                    );
                  })}
                </Box>
              </SubSection>
            );
          })}
        </Section>
      </Band>

    </Box>
  );
}

export default ReportPage;
