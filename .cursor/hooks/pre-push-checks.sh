#!/bin/bash
# Pre-push gate: runs lint + tests before git push / gh pr create.
# Starts the test database via docker-compose if it is not already running.
# Fails open (failClosed: false) so a hook crash never silently blocks a push.

set -uo pipefail

input=$(cat)
command=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null || echo "")

# Only gate push / PR creation commands
if ! echo "$command" | grep -qE 'git push|gh pr create'; then
  echo '{"permission":"allow"}'
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo '--- Pre-push checks ---' >&2

# 0. Ensure test database is running
echo '[0/2] Ensuring test database is up...' >&2
set +e
docker compose -f docker-compose.test.yml up -d 2>/dev/null
timeout 30 bash -c 'until docker compose -f docker-compose.test.yml exec -T postgres pg_isready -U postgres 2>/dev/null; do sleep 1; done' 2>/dev/null
DB_READY=$?
set -e
if [ "$DB_READY" -ne 0 ]; then
  echo "Could not start test database." >&2
  echo '{"permission":"deny","user_message":"Pre-push blocked: test database could not be started. Run `docker compose -f docker-compose.test.yml up -d` manually.","agent_message":"Test database unavailable."}'
  exit 0
fi
echo '[0/2] Database ready.' >&2

# 1. Lint
echo '[1/2] Running lint...' >&2
set +e
LINT_OUTPUT=$(npm run lint 2>&1)
LINT_EXIT=$?
set -e
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c " error " || true)
if [ "$LINT_EXIT" -ne 0 ] || [ "$LINT_ERRORS" -gt 0 ]; then
  echo "Lint failed with errors." >&2
  echo "{\"permission\":\"deny\",\"user_message\":\"Pre-push blocked: lint has $LINT_ERRORS error(s). Run \`npm run lint\` to see details.\",\"agent_message\":\"Lint check failed. Fix lint errors before pushing.\"}"
  exit 0
fi
echo '[1/2] Lint passed.' >&2

# 2. Unit tests
echo '[2/2] Running unit tests...' >&2
set +e
TEST_OUTPUT=$(npm run test:unit 2>&1)
TEST_EXIT=$?
set -e
if [ "$TEST_EXIT" -ne 0 ]; then
  FAILED=$(echo "$TEST_OUTPUT" | grep -E "Tests.*failed" | tail -1 || echo "unknown failures")
  echo "Tests failed." >&2
  echo "{\"permission\":\"deny\",\"user_message\":\"Pre-push blocked: unit tests failed ($FAILED). Run \`npm run test:unit\` to see details.\",\"agent_message\":\"Unit test check failed. Fix failing tests before pushing.\"}"
  exit 0
fi
echo '[2/2] Tests passed.' >&2

echo '--- All pre-push checks passed ---' >&2
echo '{"permission":"allow"}'
exit 0
