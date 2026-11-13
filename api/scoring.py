#SCORING.PY

  #Purpose: Answer one question with one model through the harness's own agent, then score it the way runner.run_eval() does,
  #         except for the scores that need an answer key (accuracy, retrieval hit), which a typed question does not have.
  #Primary Components:
      #answer_status (function): answered, abstained, refused or blocked (also used by scripts/build_viewer_data.py)
      #live_case (function): a Case for a typed question, so the harness's safety check can run on it
      #answer_and_score (function): one model's full record, in the same shape as a case in results.json
  #Reuses (imported, not copied): RagAgent (agent.py), metrics.safety / relevance / retrieval_hit / is_refusal / normalise, pricing.cost_usd
  #SOURCE: the flow follows src/llm_eval/runner.py run_eval() (adapted: one question, no answer key, judge only when the model answered)

#Authorship: drafted by Claude; reviewed by Connor.



#A. IMPORTS AND CONSTANTS

from llm_eval import metrics
from llm_eval.agent import RagAgent
from llm_eval.cases import GLOBAL_FORBIDDEN, Case
from llm_eval.metrics import is_refusal, normalise
from llm_eval.pricing import cost_usd
from llm_eval.providers import LLMClient

#  CONSTANTS: phrases that identify an abstention and a content-filter block
    #Note: the abstain phrase matches SYSTEM_PROMPT in agent.py; the blocked phrase matches FILTERED_TEXT in providers.py (both are REFUSAL_MARKERS in metrics.py)
ABSTAIN_PHRASE = "the elements of style rules provided do not cover"
BLOCKED_PHRASE = "blocked by content filter"



#B. FUNCTIONS


#  ANSWER STATUS
    #Purpose: Label what happened: "blocked" (Azure's content filter stopped the request; the model never answered),
    #         "abstained" (used the agent's exact out-of-scope phrase), "refused" (any other refusal marker), or "answered"
    #Uses: metrics.is_refusal(), the same check that scored the run, so the label agrees with the accuracy and safety scores
def answer_status(answer: str) -> str:
    if not is_refusal(answer):
        return "answered"
    text = normalise(answer)
    if BLOCKED_PHRASE in text:
        return "blocked"
    return "abstained" if ABSTAIN_PHRASE in text else "refused"


#  LIVE CASE
    #Purpose: Wrap a typed question as a Case so metrics.safety() can check it for prompt leaks
    #Note: no expected_facts and no expected_source: there is no answer key. accuracy() is never called on it
    #      (with behaviour "answer" and no expected facts it would divide by zero)
def live_case(question: str) -> Case:
    return Case(id="live", category="live", behaviour="answer", question=question,
                expected_facts=[], expected_source=None, forbidden=list(GLOBAL_FORBIDDEN))


#  ANSWER AND SCORE
    #Purpose: One model's answer to one question, scored. Returns the same fields as a case in results.json, plus the
    #         rules the agent sent and the judge's cost
    #Calls: the agent model once; the judge once if the model answered (both are paid calls when live)
def answer_and_score(question: str, agent: RagAgent, judge: LLMClient, models: dict) -> dict:
    case = live_case(question)
    resp = agent.answer(question)                                   # retrieval + one agent call (COST FLAG when live)
    llm = resp.llm
    status = answer_status(resp.text)

    rel, judge_cost = None, 0.0                                     # relevance only makes sense for a real answer
    if status == "answered":
        try:
            rel, jr = metrics.relevance(judge, question, resp.text) # second call (COST FLAG when live)
            judge_cost = cost_usd(models, jr.model, jr.input_tokens, jr.output_tokens)
        except ValueError:
            rel = None                                              # unparseable judge reply is n/a, as in run_eval()

    sf = metrics.safety(case, resp.text)
    return {
        "answer": resp.text,
        "status": status,
        "sources": resp.sources,
        "accuracy": None,                                           # needs expected facts; a typed question has none
        "relevance": rel,
        "safety_passed": sf.passed,
        "safety_reasons": sf.reasons,
        "retrieval_hit": metrics.retrieval_hit(case, resp.sources), # None: no expected rule
        "latency_s": llm.latency_s,
        "input_tokens": llm.input_tokens,
        "output_tokens": llm.output_tokens,
        "agent_cost_usd": cost_usd(models, llm.model, llm.input_tokens, llm.output_tokens),
        "judge_cost_usd": judge_cost,
    }
