#!/bin/sh
# PURPOSE: Start the question server for the results viewer (mock by default; LLM_PROVIDER=azure for real, paid calls)
# SOURCE: https://github.com/csdurkin/PythonFundamentals_FlaskREST_WebForum/blob/main/run.sh (adapted: app path, port, provider)
# AUTHORSHIP: original by Connor (MSc); adapted by Claude; reviewed by Connor
# Run from the repo root:  sh api/run.sh            (mock)
#                          LLM_PROVIDER=azure sh api/run.sh   (real models; uses .env)

export FLASK_APP=api.app
export LLM_PROVIDER="${LLM_PROVIDER:-mock}"

exec .venv/bin/flask run --port 5001
