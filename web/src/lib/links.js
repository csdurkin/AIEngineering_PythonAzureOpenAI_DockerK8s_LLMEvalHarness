// PURPOSE: Public links to the harness repository and the run evidence this page is built from
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor

// Author shown in the footer
export const AUTHOR_NAME = 'Connor Durkin';
export const AUTHOR_GITHUB = 'https://github.com/csdurkin';

export const REPO_URL = 'https://github.com/csdurkin/AIEngineering_PythonAzureOpenAI_DockerK8s_LLMEvalHarness';

// Evidence for one run date, e.g. evidenceUrl('2026-10-04')
export const evidenceUrl = (runDate) => `${REPO_URL}/tree/main/evidence/${runDate}`;

// One model's markdown report for a run, e.g. reportUrl('2026-10-04', 'gpt-5-mini')
export const reportUrl = (runDate, model) => `${REPO_URL}/blob/main/evidence/${runDate}/${model}/report.md`;
