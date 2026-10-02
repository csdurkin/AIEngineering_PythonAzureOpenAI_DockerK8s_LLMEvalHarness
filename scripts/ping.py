"""Send one tiny request to a deployment to prove the connection works."""
import sys

from dotenv import load_dotenv

from llm_eval.providers import AzureOpenAIClient

load_dotenv()
deployment = sys.argv[1]
reasoning = "gpt-5" in deployment  # gpt-5 models reject temperature
client = AzureOpenAIClient(deployment, reasoning=reasoning)
r = client.complete("You are a test.", "Reply with the single word: pong", max_tokens=500)
print(f"{deployment}: {r.text!r} | in={r.input_tokens} out={r.output_tokens} "
      f"reasoning={r.reasoning_tokens} latency={r.latency_s:.2f}s")