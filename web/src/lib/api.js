// PURPOSE: Send a typed question to the question server (api/app.py) and return both models' scored answers
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// NOTE: "/api" is forwarded to the Flask server by vite.config.js in development, so the page and server share one address

// ASK MODELS: POST {question}; returns { question, models: { name: {...} }, meta: { provider, judge_model, run_at } }
// Throws an Error with a readable message when the server is unreachable or refuses the question
export async function askModels(question) {
  let response;
  try {
    response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new Error('Could not reach the question server. Is it running? Start it with: sh api/run.sh');
  }

  const body = await response.json().catch(() => ({}));       // a server error may not send JSON
  if (!response.ok) {
    throw new Error(body.err ?? `The question server replied with an error (${response.status}).`);
  }
  return body;
}
