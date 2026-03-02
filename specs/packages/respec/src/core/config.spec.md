# Config Module Specification

## Purpose

The config module provides configuration management functionality for the respec package. It handles loading, merging, and resolving configuration values from multiple sources with a defined precedence order. The module enables flexible configuration through CLI options, environment variables, YAML files, and sensible defaults.

## Public API

### Interfaces

#### RespecConfig

```typescript
interface RespecConfig {
  model: string;
  outputDir: string;
  format: string;
}
```

Complete configuration object containing all required settings for the respec tool.

#### LoadConfigOptions

```typescript
interface LoadConfigOptions {
  cwd?: string;
  model?: string;
  outputDir?: string;
  configPath?: string;
}
```

Options for customizing configuration loading behavior and providing override values.

### Functions

#### loadConfig

```typescript
function loadConfig(options?: LoadConfigOptions): RespecConfig
```

Loads and merges configuration from multiple sources according to precedence rules.

**Parameters:**
- `options` (optional): Configuration loading options and override values

**Returns:**
- Complete `RespecConfig` object with all required properties

## Behavior

### Configuration Loading

The `loadConfig` function implements a hierarchical configuration system with the following precedence order (highest to lowest):

1. CLI flags (via `options` parameter)
2. Environment variables (`RESPEC_MODEL`)
3. YAML configuration file (`.respec.yml`)
4. Default values

### Default Values

The module provides sensible defaults for all configuration properties:
- `model`: `"anthropic/claude-sonnet-4-20250514"`
- `outputDir`: `"specs"`
- `format`: `"markdown"`

### YAML File Parsing

The module includes a simple YAML parser that handles basic key-value pairs in the format:
```yaml
key: value
```

The parser processes the following configuration keys:
- `model`
- `outputDir`
- `format`

### Working Directory Resolution

When no explicit `cwd` is provided, the function uses `process.cwd()` as the working directory for resolving the configuration file path.

## Edge Cases

### Missing Configuration File

When the `.respec.yml` file does not exist at the expected path, the function gracefully continues with other configuration sources without throwing errors.

### Invalid YAML Content

Lines in the YAML file that do not match the expected `key: value` format are silently ignored. The parser continues processing remaining lines.

### Empty or Malformed Values

- Empty string values in YAML are preserved as-is
- Lines without proper key-value structure are skipped
- Unknown configuration keys are ignored

### Environment Variable Handling

- Only the `RESPEC_MODEL` environment variable is currently supported
- Empty or undefined environment variables fall back to the next precedence level

### Path Resolution

Custom configuration file paths are used as-is without additional validation. The existence check occurs during file reading.

## Dependencies

### Node.js Built-in Modules

- `fs`: File system operations for reading configuration files
  - `readFileSync`: Synchronous file reading
  - `existsSync`: File existence checking
- `path`: Path manipulation utilities
  - `join`: Cross-platform path joining

### Runtime Dependencies

- `process.cwd()`: Current working directory resolution
- `process.env`: Environment variable access

## Error Handling

The module follows a fail-safe approach where configuration loading errors do not prevent the application from starting. Missing files and parsing errors result in graceful fallback to lower-precedence configuration sources or defaults.