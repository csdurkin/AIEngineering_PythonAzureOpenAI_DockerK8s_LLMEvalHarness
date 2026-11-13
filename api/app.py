#APP.PY

  #Purpose: The results viewer's question server. The Run prompts page sends a question here; the server asks both models
  #         through the harness's agent, scores each answer, and returns them in the same shape as results.json.
  #Endpoints:
      #GET  /api/health : is the server up, and is it using the mock or Azure
      #POST /api/ask    : {"question": "..."} -> both models' answers, scores, time and cost
  #Provider: LLM_PROVIDER=mock (default; free, scripted replies) or LLM_PROVIDER=azure (real, paid; needs the Azure keys in .env)
  #Guards: question length limit; per-visitor rate limit; a spending cap for the server's lifetime (azure only)
  #Run: api/run.sh  (or: flask --app api.app run --port 5001)

#SOURCE: https://github.com/csdurkin/PythonFundamentals_FlaskREST_WebForum/blob/main/app.py
#        (adapted: Flask app, POST route reading JSON, jsonify responses, KeyError -> 400 and Exception -> 500 with logging,
#         and a threading.Lock guarding shared state; forum posts and users replaced by the harness's agents and a rate limit)
#AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor
#Reuses from the harness (imported, not copied): cli._load_env / _client (build mock or Azure clients from models.yaml),
#        agent.RagAgent / load_chunks, pricing.load_models, plus api/scoring.py

#Authorship: drafted by Claude; reviewed by Connor.



#A. IMPORTS AND SETUP

import os
import threading
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request

from llm_eval.agent import RagAgent, load_chunks
from llm_eval.cli import _client, _load_env                     # private helpers, imported on purpose: the server builds clients exactly as the CLI does
from llm_eval.pricing import load_models
from llm_eval.providers import mock_agent_handler, mock_judge_handler

from api.scoring import answer_and_score

ROOT = Path(__file__).resolve().parent.parent
_load_env()                                                     # Azure endpoint and key from .env, as in the CLI

#  CONSTANTS: settings (environment variables override the defaults)
PROVIDER = os.environ.get("LLM_PROVIDER", "mock")               # mock unless told otherwise: a mistake costs nothing
AGENTS = {                                                      # display name -> deployment in config/models.yaml (same pair as the 4 October run)
    "gpt-4.1-mini": "agent-gpt-4.1-mini",
    "gpt-5-mini": "challenger-gpt-5-mini",
}
JUDGE = "judge-gpt-5-mini-2"
MAX_QUESTION = 500                                              # characters; matches the text area on the page
RATE_LIMIT = int(os.environ.get("ASK_PER_MINUTE", "5"))         # questions per visitor per minute
SPEND_CAP_USD = float(os.environ.get("SPEND_CAP_USD", "0.50"))  # total spend allowed for this server's lifetime (azure only)

app = Flask(__name__)

#  SHARED STATE: built once at start-up
models = load_models(ROOT / "config" / "models.yaml")
chunks = load_chunks(ROOT / "data" / "docs")
agents = {
    name: RagAgent(_client(PROVIDER, dep, models, mock_agent_handler, "mock-agent"), chunks)
    for name, dep in AGENTS.items()
}
judge = _client(PROVIDER, JUDGE, models, mock_judge_handler, "mock-judge")

lock = threading.Lock()                                         # synchronises access to the counters below (as in the forum app)
recent = defaultdict(deque)                                     # visitor address -> times of their recent questions
spent_usd = 0.0                                                 # running total of agent + judge cost



#B. HELPERS

#  ALLOW: rate limit and spending cap; returns an error message, or None if the question may go ahead
def allow(visitor: str) -> str | None:
    now = time.monotonic()
    with lock:
        times = recent[visitor]
        while times and now - times[0] > 60:                    # forget questions older than a minute
            times.popleft()
        if len(times) >= RATE_LIMIT:
            return f"Too many questions: the limit is {RATE_LIMIT} a minute. Try again shortly."
        if PROVIDER == "azure" and spent_usd >= SPEND_CAP_USD:
            return "This server has reached its spending cap. Try again later."
        times.append(now)
    return None



#C. ENDPOINTS

# ENDPOINT 1: GET HEALTH
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "provider": PROVIDER, "models": list(AGENTS), "judge": JUDGE})


# ENDPOINT 2: POST ASK
@app.route("/api/ask", methods=["POST"])
def ask():
    global spent_usd

    try:
        data = request.get_json(silent=True)                    # pull JSON data from the HTTP request; None if the body is not JSON
        if not isinstance(data, dict):
            return jsonify({"err": "Bad Request: send JSON like {\"question\": \"...\"}."}), 400
        question = data["question"]                             # access the value at key 'question'

        #VALIDATION: a non-empty string, within the length limit
        if not isinstance(question, str) or not question.strip():
            return jsonify({"err": "Question must be non-empty text."}), 400
        question = question.strip()
        if len(question) > MAX_QUESTION:
            return jsonify({"err": f"Question is too long: the limit is {MAX_QUESTION} characters."}), 400

        #GUARDS: rate limit and spending cap
        refusal = allow(request.remote_addr or "unknown")
        if refusal:
            return jsonify({"err": refusal}), 429               # 429 Too Many Requests

        #ASK BOTH MODELS AT ONCE: each call is timed on its own, so running them together does not change the latencies
        with ThreadPoolExecutor(max_workers=len(agents)) as pool:
            futures = {name: pool.submit(answer_and_score, question, agent, judge, models) for name, agent in agents.items()}
            results = {name: f.result() for name, f in futures.items()}

        with lock:
            spent_usd += sum(r["agent_cost_usd"] + r["judge_cost_usd"] for r in results.values())

    except (KeyError, TypeError):
        return jsonify({"err": "Bad Request: send JSON like {\"question\": \"...\"}."}), 400   # 400 Bad Request: client-side error

    except Exception as e:
        app.logger.error(str(e))
        return jsonify({"err": "An error occurred while asking the models."}), 500             # 500 Internal Server Error

    #RETURN: the same model fields as arena-data.json, plus run details
    return jsonify({
        "question": question,
        "models": results,
        "meta": {
            "provider": PROVIDER,
            "judge_model": judge.model,
            "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
    })
