# Pipeline Module Specification

## Purpose

The pipeline module serves as the core orchestration component for the respec tool, coordinating the end-to-end process of analyzing source code repositories and generating specifications. It combines framework detection, file discovery, and specification generation into a unified workflow that transforms source code into structured documentation.

## Public API

### Types

#### `GeneratedSpec`
```typescript
export type { GeneratedSpec }
```
Re-exported type from the generator module representing a generated specification document.

#### `PipelineOptions`
```typescript
interface PipelineOptions {
  repoRoot: string;      // Root directory of the repository being analyzed
  targetPath: string;    // Specific path within the repository to analyze
  model: string;         // AI model identifier for spec generation
  outputDir: string;     // Directory where generated specs should be written
}
```

#### `PipelineResult`
```typescript
interface PipelineResult {
  signals: FrameworkCheckResult;    // Framework detection signals found in repository
  framework: FrameworkJudgment;     // AI-determined framework assessment
  specs: GeneratedSpec[];           // Array of generated specification documents
}
```

### Functions

#### `runPipeline`
```typescript
async function runPipeline(options: PipelineOptions): Promise<PipelineResult>
```

Executes the complete specification generation pipeline for a given repository or path.

## Behavior

### Pipeline Execution Flow

1. **Framework Detection**: Analyzes the repository structure to identify testing framework signals and patterns
2. **Framework Judgment**: Uses AI to interpret the detected signals and determine the most likely framework in use
3. **File Discovery**: Scans the target path for relevant source files using glob patterns
4. **File Processing**: Reads and processes discovered files, converting absolute paths to relative paths
5. **Spec Generation**: Generates specifications for the processed files using the determined framework context
6. **Result Compilation**: Returns comprehensive results including framework analysis and generated specs

### File Discovery Rules

- **Included patterns**: `**/*.{ts,tsx,js,jsx}` - TypeScript and JavaScript files
- **Excluded patterns**:
  - `**/node_modules/**` - Third-party dependencies
  - `**/dist/**` - Build artifacts
  - `**/*.test.*` - Test files
  - `**/*.spec.*` - Specification files

### Path Resolution

- Converts absolute file paths to paths relative to the repository root
- Maintains consistent path references across the pipeline
- Ensures generated specs reference files using repository-relative paths

## Edge Cases

### Invalid Repository Structure
- If `repoRoot` does not exist or is inaccessible, framework detection may fail
- Pipeline continues execution but framework signals may be incomplete

### Empty Target Directory
- When no files match the discovery patterns, returns empty specs array
- Framework detection and judgment still execute normally

### File Read Errors
- Individual file read failures cause the pipeline to throw an error
- No partial recovery mechanism for corrupted or inaccessible files

### Model Configuration Issues
- Invalid model identifiers are passed through to underlying services
- Framework judgment and spec generation may fail with model-specific errors

### Permission Errors
- Insufficient file system permissions cause pipeline failure
- No retry or fallback mechanisms for permission-denied scenarios

## Dependencies

### External Modules

- **`fs`**: Node.js file system operations for reading source files
- **`path`**: Path manipulation utilities for resolving relative and absolute paths
- **`glob`**: Pattern-based file discovery and filtering

### Internal Dependencies

- **`@getcorespec/corespec`**:
  - `checkFramework`: Repository framework signal detection
  - `judgeFramework`: AI-powered framework determination
  - `FrameworkCheckResult`: Type for framework detection results
  - `FrameworkJudgment`: Type for framework assessment results

- **`./generator.js`**:
  - `generateSpecs`: Core specification generation functionality
  - `GeneratedSpec`: Type definition for generated specification documents

### Service Dependencies

- AI model service (accessed through framework judgment and spec generation)
- File system access with read permissions
- Working directory context for relative path resolution