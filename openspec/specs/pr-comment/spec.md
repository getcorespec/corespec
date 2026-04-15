# pr-comment Specification

## Purpose
Defines how specguard presents coverage results in GitHub PR comments and check-run outputs. Ensures reviewers can see which framework was detected (as a clickable link to the spec directory), the per-file scores, and a one-line reason explaining each score — including for items that pass.

## Requirements

### Requirement: Framework name is rendered as a hyperlink when recognised
When the detected framework has a known spec directory (e.g. `openspec` → `openspec/specs`), the PR comment and check-run output SHALL render the framework name as a markdown hyperlink pointing to that directory on the PR's head ref. This lets reviewers click through to the actual spec sources being evaluated against.

#### Scenario: OpenSpec framework on a PR
- **WHEN** the framework is `openspec`
- **AND** the PR head is `feature/x` on repo `getcorespec/corespec`
- **THEN** the comment SHALL contain `**Framework:** [openspec](https://github.com/getcorespec/corespec/tree/feature/x/openspec/specs)`

#### Scenario: Unknown or no framework
- **WHEN** the framework is `none` or lacks a known spec directory
- **THEN** the framework SHALL appear as plain text, not a hyperlink

#### Scenario: Framework directory mapping
- **WHEN** the framework is one of: `openspec`, `kiro`, `superpowers`, `generic`
- **THEN** the link SHALL target `openspec/specs`, `.kiro/specs`, `.claude/skills`, or `specs` respectively

### Requirement: Coverage table includes a Reason column for every file
The coverage table in PR comments and check-run outputs SHALL have columns `File`, `Score`, `Status`, `Reason`. Every row — passing or failing — SHALL display the per-file `reason` returned by `judgeDiff`.

#### Scenario: Passing file row
- **WHEN** a file passes with reason "covered by hook-install spec"
- **THEN** the row SHALL show `:white_check_mark:` status and the reason text

#### Scenario: Failing file row
- **WHEN** a file fails with reason "no spec covers auth middleware"
- **THEN** the row SHALL show `:x:` status and the reason text

#### Scenario: Legacy payload without reason
- **WHEN** a payload item has `gap` but no `reason` (older specguard versions)
- **THEN** the table SHALL fall back to the `gap` value for the Reason cell
