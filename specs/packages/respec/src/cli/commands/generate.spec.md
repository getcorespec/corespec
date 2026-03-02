# Specification: Generate Command Module

## Purpose

The generate command module provides a CLI interface for automatically generating specification files from source code. It serves as the primary entry point for the spec generation workflow, orchestrating the process of analyzing source files and producing corresponding test specifications using configurable LLM models.

## Public API

### Exported Members

#### `generateCommand: Command`
A Commander.js command instance configured with the following interface:
- **Command**: `generate`
- **Description**: Generate specs for source files
- **Arguments**: 
  - `[path]` - Optional target path to generate specs for (defaults to current directory)
- **Options**:
  - `--model <model>` - LLM model identifier (e.g. anthropic/claude-sonnet-4-20250514)
  - `--output-dir <dir>` - Output directory for generated spec files
  - `--output <format>` - Output format, either 'human' or 'json' (defaults to 'human')
  - `--config <path>` - Path to configuration file
  - `--dry-run` - Preview mode that shows what would be generated without writing files

### Internal Functions

#### `formatHuman(specs: GeneratedSpec[], dryRun: boolean): string`
Formats the generation results for human-readable console output.
- **Parameters**:
  - `specs` - Array of generated specification objects
  - `dryRun` - Boolean indicating if this was a dry run execution
- **Returns**: Formatted string with color-coded output showing generated spec paths and source files

#### `formatJson(specs: GeneratedSpec[]): string`
Formats the generation results as JSON output.
- **Parameters**:
  - `specs` - Array of generated specification objects
- **Returns**: Pretty-printed JSON string representation of the specs array

## Behavior

### Normal Operation Flow
1. Load configuration from provided config file or command-line options
2. Detect git repository root using `git rev-parse --show-toplevel`
3. Resolve the target path to absolute path
4. Execute the spec generation pipeline with resolved parameters
5. Write generated spec files to the filesystem (unless dry-run mode)
6. Output results in requested format (human-readable or JSON)

### Configuration Loading
The command merges configuration from multiple sources:
- Command-line model option
- Command-line output directory option  
- External configuration file path
- Uses `loadConfig()` to handle the merge strategy

### File Writing Process
For each generated spec (when not in dry-run mode):
- Creates the full file path by joining repository root with spec path
- Creates parent directories recursively if they don't exist
- Writes spec content to file using UTF-8 encoding

### Output Formatting
- **Human format**: Shows colored output with generation count, file paths, and source file mappings
- **JSON format**: Outputs the raw specs array as formatted JSON
- **Empty results**: Human format shows "No specs generated." message in yellow

## Edge Cases

### Error Conditions
- **Non-git repository**: Exits with code 1 and error message when not inside a git repository
- **Git command failure**: Catches `execSync` exceptions and provides clear error messaging
- **File system errors**: Directory creation and file writing operations may throw IO exceptions

### Boundary Conditions
- **Empty target path**: Defaults to current directory when no path argument provided
- **No specs generated**: Handles empty results gracefully with appropriate user messaging
- **Invalid output format**: Falls back to human format for unrecognized output options

### Input Validation
- Target paths are resolved to absolute paths to ensure consistent behavior
- Configuration options are validated through the `loadConfig` function
- Git repository validation occurs before attempting spec generation

## Dependencies

### External Modules
- **commander**: CLI framework for command definition and argument parsing
- **child_process**: Executes git commands to determine repository information
- **fs**: File system operations for directory creation and file writing
- **path**: Path manipulation utilities for resolving and joining file paths
- **chalk**: Terminal string styling for colored console output

### Internal Modules
- **../../core/config.js**: Configuration loading and management
- **../../core/pipeline.js**: Core spec generation pipeline and `GeneratedSpec` type definition

### System Dependencies
- **Git**: Required for repository root detection via `git rev-parse` command
- **File system**: Write access to target directories for spec file generation