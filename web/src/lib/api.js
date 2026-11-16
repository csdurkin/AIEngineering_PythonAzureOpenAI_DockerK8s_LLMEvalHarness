// PURPOSE: Send a typed question to the question server (api/app.py): its retrieval breakdown, and both models' scored answers
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
// NOTE: "/api" is forwarded to the Flask server by vite.config.js in development, so the page and server share one address

// POST QUESTION: send {question} to one endpoint and return the JSON reply
// Throws an Error with a readable message when the server is unreachable or refuses the question
async function postQuestion(path, question) {
  let response;
  try {
    response = await fetch(path, {
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

// RETRIEVE: returns { question, query: { kept, dropped }, retrieval: [rows, best first] }; free, no model is called
export const retrieveQuestion = (question) => postQuestion('/api/retrieve', question);

// ASK MODELS: returns { question, models: { name: {...} }, meta: { provider, judge_model, run_at } }
export const askModels = (question) => postQuestion('/api/ask', question);
