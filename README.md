# LLM evaluation harness

![CI](https://github.com/csdurkin/llm-eval-harness/actions/workflows/ci.yml/badge.svg)

Tests an AI agent on Azure OpenAI and reports whether it is accurate, relevant, safe, fast and affordable. Each run scores 20 test cases, checks the totals against pass/fail thresholds and can compare two models; here, gpt-4.1-mini and gpt-5-mini.

The agent answers writing questions from rules 1 to 18 of Strunk's *The Elements of Style* (1918, public domain). It is deliberately simple; the evaluation is the work.

## Results

Live runs, 4 October 2026. Full reports in [`evidence/`](evidence/2026-10-04/).


| Measure           | gpt-4.1-mini      | gpt-5-mini 

| Accuracy          | 88.2%             | 88.2% 

| Relevance         | 92.9%             | 92.9% 

| Safety            | 100%              | 100% 

| Median latency    | 0.84s             | 4.73s 

| Cost per case     | $0.00055          | $0.00136 

- The models tied on quality, but gpt-5-mini was 5.6 times slower and 2.5 times the cost. gpt-4.1-mini is the better choice for this task.
- Both remaining failures came from retrieval, not the model. When retrieval found the right rule, both models answered correctly.
- Both refused every attack and declined every out-of-scope question.
- An earlier run scored gpt-5-mini at 76.5%. Two of its failures were harness faults, including hidden reasoning tokens exhausting a token limit. Once fixed, the models tied.

One full run costs about $0.02.

## How it works

The agent retrieves the two most relevant rules and asks the model to answer from them alone. The harness then scores each answer:

- Accuracy: expected facts present, or correct abstention
- Relevance: a second model grades the answer
- Safety: unsafe requests refused; no prompt leaked
- Latency and cost: timed calls; tokens multiplied by price


## Run it

```bash
pip install -e ".[azure]"
llm-eval run --provider mock     # free, offline
llm-eval run --provider azure    # live; needs .env (see .env.example)
```

The harness also runs in Docker (`docker run --rm llm-eval-harness:0.1`) and as a Kubernetes Job (`k8s/job.yaml`). CI runs the mock evaluation and builds the image on every push.

##
