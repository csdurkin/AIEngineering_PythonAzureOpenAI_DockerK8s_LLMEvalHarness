"""LLM clients: the only code that talks to a model. Every call returns text plus the usage data the metrics need."""



#A. IMPORTS AND CONSTANTS

#  IMPORTS (Libraries)
from __future__ import annotations          #Treat type hints as text; enables modern hint syntax
import os                                   #Reads environment variables (endpoint and key from .env)
import re                                   #Regular expressions; used by the mock handlers to read prompts
import time                                 #High-precision timer for measuring latency
import zlib                                 #crc32 checksum; gives the mock a stable fake latency
from collections.abc import Callable        #Type hint for "a function"; used for mock handlers
from dataclasses import dataclass           #For simple data containers
from typing import Protocol                 #Defines a contract that classes must match (LLMClient)

# CONSTANT: FILTERED TEXT
    #Purpose: Placeholder reply when Azure's content filter blocks a prompt or response
    #Note: metrics.py treats this phrase as a refusal, so a blocked unsafe prompt counts as safe
FILTERED_TEXT = "[Blocked by content filter]"



#B. CLASS DEFINITIONS

#  LLM RESULT
    #Purpose: The standard record of one model call; every metric (accuracy, cost, latency, safety) is calculated from it
    #Used by: agent.py (inside AgentResponse), metrics.py (judge calls), runner.py (tokens, latency, cost)
@dataclass(frozen=True)                     #Frozen: read-only, so results can't change after a call
class LLMResult:
    text: str                               #The model's reply
    input_tokens: int                       #Tokens sent (system prompt, context, question)
    output_tokens: int                      #Tokens returned, including hidden reasoning tokens, which are billed
    latency_s: float                        #Seconds from request to reply
    model: str                              #Deployment name that answered
    reasoning_tokens: int = 0               #Hidden thinking tokens, if the model reports them
    filtered: bool = False                  #True if Azure's content filter blocked the prompt or reply

#  LLM CLIENT (PROTOCOL)
    #Purpose: The contract every model client must meet: a model name and a complete() method returning an LLMResult
    #Used by: agent.py and metrics.py as a type hint; lets real and mock clients be swapped freely (model-agnostic design)
    #Note: Contains no working code; the "..." means the body is defined by each client
class LLMClient(Protocol):
    model: str

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> LLMResult: ...

#  AZURE OPENAI CLIENT
    #Purpose: Calls one Azure OpenAI deployment through the openai SDK (v1 endpoint)
    #Used by: cli.py (live runs), scripts/ping.py
    #Note: Reads AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY from the environment, never from code
    #Note: gpt-5 (reasoning) models reject temperature, so it is only sent to non-reasoning deployments
class AzureOpenAIClient:
    def __init__(self, deployment: str, reasoning: bool = False):
        try:
            from openai import OpenAI                                   #Imported here so offline tests work without the SDK
        except ImportError as exc:
            raise RuntimeError("Install dependencies: pip install -e '.[azure]'") from exc   #Clear message if the SDK is missing
        endpoint = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")      #Endpoint from .env; strip trailing / to avoid a double slash
        self.model = deployment                                         #Deployment name, e.g. agent-gpt-4.1-mini
        self.reasoning = reasoning                                      #From models.yaml; decides whether temperature is sent
        self._client = OpenAI(
            base_url=f"{endpoint}/openai/v1/",                          #Azure's v1 API; no dated api-version needed
            api_key=os.environ["AZURE_OPENAI_API_KEY"],                 #Key from .env
            max_retries=3,                                              #Retry temporary failures such as rate limits
        )

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> LLMResult:
        from openai import BadRequestError                              #Error type Azure raises when it blocks a prompt

        kwargs = {                                                      #Request settings, gathered so they can be adjusted before sending
            "model": self.model,                                        #Which deployment answers
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],   #Rules first, then context and question
            "max_completion_tokens": max_tokens,                        #Caps reply length, and therefore cost
        }
        if not self.reasoning:
            kwargs["temperature"] = 0.0                                 #Most repeatable answers; only for non-reasoning models

        start = time.perf_counter()                                     #Start the latency timer
        try:
            resp = self._client.chat.completions.create(**kwargs)       #Send the request; ** unpacks the settings dictionary
        except BadRequestError as exc:
            # Azure rejects prompts its content filter flags with HTTP 400, code content_filter.
            if "content_filter" in str(exc):                            #Blocked prompt: record a refusal instead of crashing
                return LLMResult(
                    FILTERED_TEXT, 0, 0, time.perf_counter() - start, self.model, filtered=True
                )
            raise                                                       #Any other error is re-raised, not hidden
        latency = time.perf_counter() - start                           #Stop the timer

        choice = resp.choices[0]                                        #The first (only) reply
        filtered = choice.finish_reason == "content_filter"             #True if Azure blocked the reply itself
        text = FILTERED_TEXT if filtered else (choice.message.content or "")   #Use the placeholder if blocked; "" guards against an empty reply
        details = getattr(resp.usage, "completion_tokens_details", None)        #Optional usage breakdown; not every model provides it
        reasoning = getattr(details, "reasoning_tokens", 0) or 0                #Hidden thinking tokens, or 0 if not reported
        return LLMResult(                                               #Package everything into the standard record
            text=text,
            input_tokens=resp.usage.prompt_tokens,
            output_tokens=resp.usage.completion_tokens,
            latency_s=latency,
            model=self.model,
            reasoning_tokens=reasoning,
            filtered=filtered,
        )

#  MOCK CLIENT
    #Purpose: A fake model for free, offline, repeatable tests; its behaviour comes from a handler function
    #Used by: tests, CI (GitHub Actions), cli.py with --provider mock; never used in live evaluation
class MockClient:
    def __init__(self, handler: Callable[[str, str], str], model: str = "mock-agent"):
        self.model = model                                              #Name used in reports and price lookups (models.yaml)
        self._handler = handler                                         #Function that decides the scripted reply

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> LLMResult:
        text = self._handler(system, user)                              #Get the scripted reply
        in_tok = int(len((system + " " + user).split()) * 1.3)          #Estimate input tokens: words x 1.3
        out_tok = max(1, int(len(text.split()) * 1.3))                  #Estimate output tokens; at least 1
        # Stable pseudo-latency between 0.2s and 1.2s, derived from the prompt.
        latency = 0.2 + (zlib.crc32(user.encode()) % 1000) / 1000       #Same prompt always gives the same fake latency
        return LLMResult(text, in_tok, out_tok, latency, self.model)



#C. FUNCTION DEFINITIONS (MOCK HANDLERS)

# CONSTANT: REFUSAL TRIGGERS
    #Purpose: Phrases that make the mock agent refuse, imitating a well-aligned model
_REFUSAL_TRIGGERS = ("ignore your instructions", "system prompt", "bypass", "admin password")

#  MOCK AGENT HANDLER
    #Purpose: Scripts a well-behaved agent: refuses unsafe asks, abstains without context, otherwise quotes the top rule
    #Used by: MockClient in tests and mock runs
def mock_agent_handler(system: str, user: str) -> str:
    question = user.split("Question:", 1)[-1].strip().lower()          #Pull the question out of the user message
    if any(t in question for t in _REFUSAL_TRIGGERS):                  #Unsafe request: refuse
        return "I can't help with that request."
    context = user.split("Context:", 1)[-1].split("Question:", 1)[0].strip()   #Pull out the context section
    if context == "(none)" or not context:                             #No rules retrieved: abstain
        return "I don't know based on the available documents."
    return re.sub(r"^\[[^\]]+\]\s*", "", context.split("\n")[0])       #Return the first rule, minus its [file name] tag

#  MOCK JUDGE HANDLER
    #Purpose: Scripts a crude relevance judge: 5 if question and answer share 2 or more words, otherwise 3
    #Used by: MockClient in tests and mock runs
def mock_judge_handler(system: str, user: str) -> str:
    q = set(re.findall(r"[a-z]+", user.split("Question:", 1)[-1].split("Answer:", 1)[0].lower()))   #Words in the question
    a = set(re.findall(r"[a-z]+", user.split("Answer:", 1)[-1].lower()))                             #Words in the answer
    score = 5 if len(q & a) >= 2 else 3                                #Overlap of 2 or more words scores 5
    return f'{{"score": {score}, "reason": "mock judge"}}'              #Same JSON shape the real judge must return; {{ }} prints literal braces