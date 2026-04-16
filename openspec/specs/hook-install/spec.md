# hook-install Specification

## Purpose
The `specguard hook install` command installs a git hook that runs specguard checks automatically. Pre-push is the default (batches checks per push, avoids penalising frequent committers). Pre-commit is opt-in for instant feedback.

## Requirements

### Requirement: Default installs a pre-push hook
`specguard hook install` with no flags SHALL write a pre-push hook script to `.git/hooks/pre-push`.

#### Scenario: Default install
- **WHEN** `specguard hook install` is run in a git repository
- **THEN** a file SHALL be created at `.git/hooks/pre-push` with mode 0755
- **AND** the script SHALL invoke `npx specguard check` with a commit range

### Requirement: Pre-push hook reads ref ranges from stdin
The pre-push script SHALL parse git's stdin protocol (`local_ref local_sha remote_ref remote_sha`) to determine the commit range.

#### Scenario: Existing remote branch
- **WHEN** `remote_sha` is not the zero SHA
- **THEN** the range SHALL be `remote_sha..local_sha`

#### Scenario: New branch (no remote tracking)
- **WHEN** `remote_sha` is the zero SHA (`0000000000000000000000000000000000000000`)
- **THEN** the hook SHALL compute a base via `git merge-base HEAD origin/main`, falling back to `origin/master`, then to the initial commit
- **AND** the range SHALL be `base..local_sha`

#### Scenario: Deleted branch
- **WHEN** `local_sha` is the zero SHA
- **THEN** the hook SHALL skip that ref (no specguard check)

### Requirement: --pre-commit installs a pre-commit hook
`specguard hook install --pre-commit` SHALL write a pre-commit hook to `.git/hooks/pre-commit` that runs `npx specguard check --staged`.

#### Scenario: Pre-commit install
- **WHEN** `specguard hook install --pre-commit` is run
- **THEN** a file SHALL be created at `.git/hooks/pre-commit`
- **AND** the script SHALL invoke `npx specguard check --staged`

### Requirement: Existing hook requires --force
If the target hook file already exists, the command SHALL exit with an error unless `--force` is provided.

#### Scenario: Hook already exists without --force
- **WHEN** `.git/hooks/pre-push` already exists
- **AND** `specguard hook install` is run without `--force`
- **THEN** the command SHALL exit with code 1 and print an error

#### Scenario: Hook already exists with --force
- **WHEN** `.git/hooks/pre-push` already exists
- **AND** `specguard hook install --force` is run
- **THEN** the existing hook SHALL be overwritten

### Requirement: Non-repo exits with error
Running outside a git repository SHALL print an error and exit with code 1.

#### Scenario: Not a git repo
- **WHEN** `specguard hook install` is run outside a git repository
- **THEN** the command SHALL exit with code 1
- **AND** print "not inside a git repository"

### Requirement: Hooks directory is created if missing
If `.git/hooks` does not exist, the command SHALL create it before writing the hook.

#### Scenario: Missing hooks directory
- **WHEN** `.git/hooks` does not exist
- **THEN** the command SHALL create the directory recursively before writing the hook file
