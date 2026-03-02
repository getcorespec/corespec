# Formatter Module Specification

## Purpose

The formatter module provides output formatting capabilities for ReSpec pipeline results. It transforms structured pipeline data into human-readable and machine-readable formats, supporting both JSON output for programmatic consumption and formatted console output for interactive use.

## Public API

### Types

#### PipelineResult
```typescript
interface PipelineResult {
  signals: FrameworkCheckResult;
  framework: FrameworkJudgment;
  specs: GeneratedSpec[];
}
```

Represents the complete result of a ReSpec pipeline execution, containing framework detection results and generated specifications.

### Functions

#### formatJson(result: PipelineResult): string

Converts pipeline results into a structured JSON string format.

**Parameters:**
- `result`: PipelineResult object containing pipeline execution results

**Returns:**
- JSON string with formatted output containing:
  - Framework detection information (name, confidence, signals)
  - Generated spec details (file paths, spec paths, content)
  - Total count of generated specs

**Behavior:**
- Extracts signal names from FrameworkCheckResult signals array
- Maps GeneratedSpec objects to simplified output format
- Formats JSON with 2-space indentation for readability

#### formatHuman(result: PipelineResult): string

Generates human-readable console output with visual formatting.

**Parameters:**
- `result`: PipelineResult object containing pipeline execution results

**Returns:**
- Multi-line string formatted for console display

**Behavior:**
- Creates sectioned output with visual separators
- Displays framework detection results with confidence scores
- Shows file-to-spec path mappings with success indicators
- Includes summary statistics with colored output
- Uses chalk for terminal color formatting

## Behavior Specifications

### Framework Detection Display

When a framework is detected:
- Displays framework name left-aligned in 20-character field
- Shows confidence score with 2 decimal precision
- Appends "detected" status indicator

When no framework is detected:
- Displays "No spec framework detected" message
- Omits confidence scoring

### Spec Generation Display

For each generated spec:
- Shows source file name in 20-character left-aligned field
- Displays arrow separator (→) 
- Shows target spec path in 25-character left-aligned field
- Appends green checkmark (✓) success indicator

### Output Structure

Human-readable format follows consistent structure:
1. Framework Detection section with separator line
2. Generated Specs section with separator line
3. Summary result with total count
4. Consistent spacing and alignment

## Edge Cases

### Empty Results
- When `result.specs` is empty array, displays count as 0
- Framework detection section still renders normally
- Generated Specs section shows empty list

### No Framework Detected
- When `result.framework.framework` equals 'none'
- Displays appropriate "not detected" message
- Omits confidence score display

### Long File Names
- File names longer than padding width may break alignment
- Spec paths longer than 25 characters may affect formatting
- No truncation or wrapping implemented

### Invalid Confidence Values
- Confidence values are formatted with `toFixed(2)`
- NaN or undefined values may cause formatting errors
- No validation of confidence range (0-1)

## Dependencies

### External Modules

#### chalk
- Used for terminal color formatting in human-readable output
- Applied to success indicators and summary messages
- Provides green color for checkmarks and result text

#### @getcorespec/corespec
- Provides `FrameworkCheckResult` type definition
- Provides `FrameworkJudgment` type definition
- Core dependency for framework detection types

#### ./generator.js
- Provides `GeneratedSpec` type definition
- Local module dependency for spec generation types

### Internal Dependencies

The module relies on:
- Well-formed PipelineResult objects
- Valid FrameworkCheckResult with signals array
- GeneratedSpec objects with required file/path properties
- Proper TypeScript type checking for interface compliance