# Generator Module Specification

## Purpose

The generator module serves as the core engine for automated specification generation in the respec tool. It orchestrates the process of converting source code files into structured specification documents by leveraging Large Language Models (LLMs) with framework-specific context and prompting strategies.

The module exists to:
- Automate the creation of specification documents from source code
- Provide framework-aware spec generation with appropriate context
- Handle batch processing of multiple files with progress tracking
- Generate consistent, structured documentation across codebases

## Public API

### Types

#### `GeneratedSpec`
```typescript
interface GeneratedSpec {
  file: string;      // Original source file path
  specPath: string;  // Generated specification file path
  content: string;   // Generated specification content
}
```

### Functions

#### `buildPrompt(file, framework): string`
- **Purpose**: Constructs LLM prompts with framework-specific context
- **Parameters**:
  - `file: { path: string; content: string }` - Source file information
  - `framework: FrameworkJudgment` - Framework detection results
- **Returns**: `string` - Formatted prompt for LLM processing
- **Visibility**: Internal (not exported)

#### `deriveSpecPath(filePath, outputDir): string`
- **Purpose**: Generates output specification file paths from source file paths
- **Parameters**:
  - `filePath: string` - Original source file path
  - `outputDir: string` - Target directory for specifications
- **Returns**: `string` - Generated specification file path
- **Visibility**: Exported

#### `generateSpecs(files, framework, config, outputDir): Promise<GeneratedSpec[]>`
- **Purpose**: Main entry point for batch specification generation
- **Parameters**:
  - `files: Array<{ path: string; content: string }>` - Source files to process
  - `framework: FrameworkJudgment` - Framework detection results
  - `config: ModelConfig` - LLM configuration settings
  - `outputDir: string` - Output directory for generated specs
- **Returns**: `Promise<GeneratedSpec[]>` - Array of generated specifications
- **Visibility**: Exported

## Behavior

### Prompt Generation
- Builds context-aware prompts based on detected testing framework
- Includes framework confidence levels and reasoning in prompts
- Falls back to generic markdown format when no framework is detected
- Incorporates comprehensive specification requirements (purpose, API, behavior, edge cases, dependencies)

### Path Derivation
- Strips `src/` prefix from file paths when present
- Preserves directory structure in output paths
- Appends `.spec.md` extension to base filenames
- Maintains relative path hierarchy from source to specifications

### Specification Generation
- Processes files sequentially to respect API rate limits
- Displays progress with spinner showing current file and completion ratio
- Calls LLM service for each file with constructed prompts
- Collects all generated specifications into result array
- Updates progress indicator throughout processing

## Edge Cases

### Error Handling
- LLM API failures during `callLLM` operations will propagate as exceptions
- Invalid file paths in input array may cause path parsing errors
- Network timeouts or rate limit violations from LLM service
- Empty or malformed source file content

### Boundary Conditions
- Empty file array results in empty specification array
- Files without `src/` prefix are processed with full relative paths
- Output directory paths are used as-is without validation
- Framework confidence of 0.0 or 1.0 handled normally

### Invalid Inputs
- Null or undefined parameters will cause runtime errors
- Malformed `FrameworkJudgment` objects may result in incorrect prompts
- Non-existent output directories may cause file system errors during write operations
- Invalid `ModelConfig` will cause LLM service failures

## Dependencies

### External Packages
- `@getcorespec/corespec`: Provides `FrameworkJudgment`, `ModelConfig` types and `callLLM` function
- `ora`: Terminal spinner library for progress indication
- `node:path`: Node.js built-in module for path manipulation

### Internal Dependencies
- Relies on external LLM service availability through `callLLM`
- Expects valid framework judgment from framework detection system
- Requires properly configured model settings for LLM communication

### Service Dependencies
- LLM API service for content generation
- File system access for path operations
- Network connectivity for external API calls