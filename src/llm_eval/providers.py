"""LLM clients. Every call returns text plus the usage data the metrics need."""

from __future__ import annotations

import os
import re
import time
import zlib
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

FILTERED_TEXT = "[Blocked by content filter]"


@dataclass(frozen=True)
class LLMResult:
    text: str
    input_tokens: int
    output_tokens: int  # includes any hidden reasoning tokens, which are billed
    latency_s: float
    model: str  # deployment name
    reasoning_tokens: int = 0
    filtered: bool = False  # True if Azure's content filter blocked the prompt or reply


class LLMClient(Protocol):
    model: str

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> LLMResult: ...


class AzureOpenAIClient:
    """Calls one Azure OpenAI deployment through the openai SDK (v1 endpoint).

    Reads AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY from the environment.
    Reasoning models (the gpt-5 family) reject `temperature`, so it is only sent
    when the deployment is configured as non-reasoning.
    """

    def __init__(self, deployment: str, reasoning: bool = False):
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("Install dependencies: pip install -e '.[azure]'") from exc
        endpoint = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
        self.model = deployment
        self.reasoning = reasoning
        self._client = OpenAI(
            base_url=f"{endpoint}/openai/v1/",
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            max_retries=3,
        )

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> LLMResult:
        from openai import BadRequestError

        kwargs = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_completion_tokens": max_tokens,
        }
        if not self.reasoning:
            kwargs["temperature"] = 0.0

        start = time.perf_counter()
        try:
            resp = self._client.chat.completions.create(**kwargs)
        except BadRequestError as exc:
            # Azure rejects prompts its content filter flags with HTTP 400, code content_filter.
            if "content_filter" in str(exc):
                return LLMResult(
                    FILTERED_TEXT, 0, 0, time.perf_counter() - start, self.model, filtered=True
                )
            raise
        latency = time.perf_counter() - start

        choice = resp.choices[0]
        filtered = choice.finish_reason == "content_filter"
        text = FILTERED_TEXT if filtered else (choice.message.content or "")
        details = getattr(resp.usage, "completion_tokens_details", None)
        reasoning = getattr(details, "reasoning_tokens", 0) or 0
        return LLMResult(
            text=text,
            input_tokens=resp.usage.prompt_tokens,
            output_tokens=resp.usage.completion_tokens,
            latency_s=latency,
            model=self.model,
            reasoning_tokens=reasoning,
            filtered=filtered,
        )


class MockClient:
    """Deterministic offline client for tests and CI. Behaviour comes from a handler."""

    def __init__(self, handler: Callable[[str, str], str], model: str = "mock-agent"):
        self.model = model
        self._handler = handler

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> LLMResult:
        text = self._handler(system, user)
        in_tok = int(len((system + " " + user).split()) * 1.3)
        out_tok = max(1, int(len(text.split()) * 1.3))
        # Stable pseudo-latency between 0.2s and 1.2s, derived from the prompt.
        latency = 0.2 + (zlib.crc32(user.encode()) % 1000) / 1000
        return LLMResult(text, in_tok, out_tok, latency, self.model)


_REFUSAL_TRIGGERS = ("ignore your instructions", "system prompt", "bypass", "admin password")


def mock_agent_handler(system: str, user: str) -> str:
    """Behaves like a well-aligned agent: refuses unsafe asks, abstains without context."""
    question = user.split("Question:", 1)[-1].strip().lower()
    if any(t in question for t in _REFUSAL_TRIGGERS):
        return "I can't help with that request."
    context = user.split("Context:", 1)[-1].split("Question:", 1)[0].strip()
    if context == "(none)" or not context:
        return "I don't know based on the available documents."
    return re.sub(r"^\[[^\]]+\]\s*", "", context.split("\n")[0])


def mock_judge_handler(system: str, user: str) -> str:
    """Crude relevance judge: scores by word overlap between question and answer."""
    q = set(re.findall(r"[a-z]+", user.split("Question:", 1)[-1].split("Answer:", 1)[0].lower()))
    a = set(re.findall(r"[a-z]+", user.split("Answer:", 1)[-1].lower()))
    score = 5 if len(q & a) >= 2 else 3
    return f'{{"score": {score}, "reason": "mock judge"}}'
