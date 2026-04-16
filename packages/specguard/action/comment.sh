#!/usr/bin/env bash
# Posts specguard results as a PR comment.
# Expects: RESULT_JSON, EXIT_CODE, GH_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH
set -euo pipefail

PR_NUMBER=$(jq -r '.pull_request.number // empty' "$GITHUB_EVENT_PATH" 2>/dev/null || true)
if [ -z "$PR_NUMBER" ]; then
  echo "Not a pull request event, skipping comment."
  exit 0
fi

# Resolve head ref (branch name) from the PR event; fall back to GITHUB_REF_NAME.
HEAD_REF=$(jq -r '.pull_request.head.ref // empty' "$GITHUB_EVENT_PATH" 2>/dev/null || true)
HEAD_REF="${HEAD_REF:-${GITHUB_REF_NAME:-main}}"

# Maps a recognised spec framework to the repo directory holding its spec/plan
# documents. Only frameworks with a known, verified convention are listed;
# others render as plain text in the comment.
#   OpenSpec:    https://github.com/Fission-AI/OpenSpec
#   Kiro:        https://kiro.dev/docs/specs/
#   Superpowers: https://github.com/obra/superpowers
framework_spec_dir() {
  case "$1" in
    openspec) echo "openspec/specs" ;;
    kiro) echo ".kiro/specs" ;;
    superpowers) echo "docs/superpowers/plans" ;;
    *) echo "" ;;
  esac
}

# Render a framework name as a markdown hyperlink to its spec directory on the PR head ref,
# so reviewers can click through to the canonical spec sources.
render_framework_link() {
  local framework="$1"
  local dir
  dir=$(framework_spec_dir "$framework")
  if [ -z "$dir" ] || [ "$framework" = "none" ]; then
    echo "$framework"
    return
  fi
  echo "[${framework}](https://github.com/${GITHUB_REPOSITORY}/tree/${HEAD_REF}/${dir})"
}

# Try to parse JSON result
if echo "$RESULT_JSON" | jq . >/dev/null 2>&1; then
  RESULT=$(echo "$RESULT_JSON" | jq -r '.result')
  THRESHOLD=$(echo "$RESULT_JSON" | jq -r '.threshold')
  FRAMEWORK=$(echo "$RESULT_JSON" | jq -r '.framework.detected')
  CONFIDENCE=$(echo "$RESULT_JSON" | jq -r '.framework.confidence')
  FRAMEWORK_LINK=$(render_framework_link "$FRAMEWORK")

  if [ "$RESULT" = "pass" ]; then
    ICON="white_check_mark"
    TITLE="specguard: PASS"
  else
    ICON="x"
    TITLE="specguard: FAIL"
  fi

  # Build coverage table. Every row includes a Reason so passing items explain why
  # (e.g. "covered by hook-install spec", "test file, self-documenting").
  COVERAGE_TABLE="| File | Score | Status | Reason |
|------|-------|--------|--------|"
  while IFS= read -r row; do
    FILE=$(echo "$row" | jq -r '.file')
    SCORE=$(echo "$row" | jq -r '.score')
    PASS=$(echo "$row" | jq -r '.pass')
    # Fall back to legacy "gap" field for backwards compatibility with older payloads.
    REASON=$(echo "$row" | jq -r '.reason // .gap // "-"')
    if [ "$PASS" = "true" ]; then
      STATUS=":white_check_mark:"
    else
      STATUS=":x:"
    fi
    COVERAGE_TABLE="$COVERAGE_TABLE
| \`$FILE\` | $SCORE | $STATUS | $REASON |"
  done < <(echo "$RESULT_JSON" | jq -c '.coverage[]')

  BODY=":${ICON}: **${TITLE}**

**Framework:** ${FRAMEWORK_LINK} (confidence: ${CONFIDENCE})
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
