// PURPOSE: The Past results hero content: what the page shows, how to read it, and links to the run evidence on GitHub
// SOURCE: new (design in Hero.jsx, shared with the Run prompts page)
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import Hero from './Hero.jsx';
import { REPO_URL, evidenceUrl, reportUrl } from '../lib/links.js';

export { HERO_BG } from './Hero.jsx';

// Props: meta (top-level meta from arena-data.json), runDateText (e.g. "4 October 2026"), startId (id of the step 01 band, for the call to action)
function IntroPanel({ meta, runDateText, startId }) {
  return (
    <Hero
      eyebrow="LLM evaluation harness · results viewer"
      title={`Two models, the same ${meta.case_count} questions`}
      body={
        `This page shows the evidence from one run of the evaluation harness on ${runDateText}. A retrieval-augmented writing ` +
        `assistant answered ${meta.case_count} golden test questions twice, once with ${meta.models.join(' and once with ')}. ` +
        'Each answer was scored for accuracy, relevance, safety and retrieval, and timed and costed.'
      }
      cta={{ label: 'Start comparing', href: `#${startId}` }}
      steps={['Choose a question', 'Read the summary', 'See what both models were given', 'Compare where they separate']}
      linksTitle="Evidence on GitHub"
      links={[
        { label: 'Harness on GitHub', href: REPO_URL },
        { label: `Run evidence, ${runDateText}`, href: evidenceUrl(meta.run_date) },
        ...meta.models.map((m) => ({ label: `${m} report`, href: reportUrl(meta.run_date, m) })),
      ]}
    />
  );
}

export default IntroPanel;
