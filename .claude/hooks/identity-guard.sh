#!/bin/bash
# Block commits, pushes, and gh CLI actions unless identity is gaspodewonder.
# Also block any content containing /Users/<username>/ paths.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

deny() {
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"$1"}}
EOF
  exit 1
}

allow() {
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

# Skip identity checks in CI — auth is handled by GITHUB_TOKEN
if [[ "$CI" == "true" ]]; then
  allow
fi

# Check git identity on commit commands
if [[ "$COMMAND" =~ git\ commit ]]; then
  AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-$(git config user.email 2>/dev/null)}"
  if [[ "$AUTHOR_EMAIL" != *"gaspodewonder"* ]]; then
    deny "Git author email must contain gaspodewonder. Current: $AUTHOR_EMAIL"
  fi
fi

# Check gh CLI identity on push/pr commands
if [[ "$COMMAND" =~ ^gh\ (pr|issue|api|workflow) ]] || [[ "$COMMAND" =~ git\ push ]]; then
  GH_USER=$(gh auth status 2>&1 | grep "Active account: true" -B1 | head -1 | grep -o 'account [^ ]*' | cut -d' ' -f2)
  if [[ "$GH_USER" != "gaspodewonder" ]]; then
    deny "GitHub CLI active account must be gaspodewonder. Current: $GH_USER"
  fi
fi

# Block any command that would write /Users/<username>/ paths into files
if [[ "$COMMAND" =~ /Users/[A-Za-z_]+/ ]] && [[ "$COMMAND" =~ (echo|cat|write|>>|>) ]]; then
  deny "Command contains a /Users/<username>/ path. Use \$HOME instead."
fi

allow
