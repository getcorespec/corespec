#!/usr/bin/env bash
# Posts specguard results as a PR comment.
# Expects: RESULT_JSON, EXIT_CODE, GH_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH
set -euo pipefail

PR_NUMBER=$(jq -r '.pull_request.number // empty' "$GITHUB_EVENT_PATH" 2>/dev/null || true)
if [ -z "$PR_NUMBER" ]; then
  echo "Not a pull request event, skipping comment."
  exit 0
fi

# Try to parse JSON result
if echo "$RESULT_JSON" | jq . >/dev/null 2>&1; then
  RESULT=$(echo "$RESULT_JSON" | jq -r '.result')
  THRESHOLD=$(echo "$RESULT_JSON" | jq -r '.threshold')
  FRAMEWORK=$(echo "$RESULT_JSON" | jq -r '.framework.detected')
  CONFIDENCE=$(echo "$RESULT_JSON" | jq -r '.framework.confidence')

  if [ "$RESULT" = "pass" ]; then
    ICON="white_check_mark"
    TITLE="specguard: PASS"
  else
    ICON="x"
    TITLE="specguard: FAIL"
  fi

  # Build coverage table
  COVERAGE_TABLE="| File | Score | Status | Gap |
|------|-------|--------|-----|"
  while IFS= read -r row; do
    FILE=$(echo "$row" | jq -r '.file')
    SCORE=$(echo "$row" | jq -r '.score')
    PASS=$(echo "$row" | jq -r '.pass')
    GAP=$(echo "$row" | jq -r '.gap // "-"')
    if [ "$PASS" = "true" ]; then
      STATUS=":white_check_mark:"
    else
      STATUS=":x:"
    fi
    COVERAGE_TABLE="$COVERAGE_TABLE
| \`$FILE\` | $SCORE | $STATUS | $GAP |"
  done < <(echo "$RESULT_JSON" | jq -c '.coverage[]')

  BODY=":${ICON}: **${TITLE}**

**Framework:** ${FRAMEWORK} (confidence: ${CONFIDENCE})
**Threshold:** ${THRESHOLD}

${COVERAGE_TABLE}"

else
  # specguard errored, post the raw output
  BODY=":warning: **specguard: ERROR**

\`\`\`
${RESULT_JSON}
\`\`\`"
fi

gh pr comment "$PR_NUMBER" --body "$BODY" --repo "$GITHUB_REPOSITORY"
