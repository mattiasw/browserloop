# Project Plan

## MCP Screenshot Server Implementation

- [x] **Project Setup**
  - [x] Initialize Node.js project with TypeScript
  - [x] Set up Biome for linting and formatting
  - [x] Configure basic project structure
  - [x] Set up package.json with necessary dependencies

- [x] **Basic Testing Infrastructure**
  - [x] Set up test framework (Node.js built-in test runner)
  - [x] Create basic test structure and utilities
  - [x] Add simple unit tests for core functions
  - [x] Create test fixtures (simple HTML pages)
  - [x] Set up test scripts and CI-friendly commands
  - [x] Add basic integration test placeholder

- [x] **Docker Integration**
  - [x] Create Dockerfile with Playwright browser dependencies
  - [x] Set up docker-compose.yml for development
  - [x] Configure Docker networking for localhost access
  - [x] Add Docker scripts to package.json
  - [x] Create E2E tests for Docker functionality
  - [x] Test container build and deployment

- [x] **Core Playwright Service**
  - [x] Implement basic screenshot capture service
  - [x] Add support for different viewport sizes
  - [x] Configure WebP output format
  - [x] Add page load waiting strategies
  - [x] Implement error handling and retries

- [x] **MCP Server Implementation**
  - [x] Set up MCP protocol server with stdio transport
  - [x] Define screenshot tool schema and parameters
  - [x] Implement tool handler for screenshot requests
  - [x] Add base64 image encoding for responses
  - [x] Add parameter validation and defaults

- [x] **Configuration & Options**
  - [x] Add environment variable support for all default settings
  - [x] Implement configurable quality settings via BROWSERLOOP_DEFAULT_QUALITY
  - [x] Add timeout and retry configuration (BROWSERLOOP_RETRY_COUNT, BROWSERLOOP_RETRY_DELAY)
  - [x] Support custom viewport dimensions (BROWSERLOOP_DEFAULT_WIDTH, BROWSERLOOP_DEFAULT_HEIGHT)
  - [x] Add user agent configuration (BROWSERLOOP_USER_AGENT)
  - [x] Create comprehensive configuration validation with Zod
  - [x] Add retry logic with configurable count and delay
  - [x] Implement graceful fallbacks for invalid environment variables
  - [x] Add configuration tests and documentation

- [x] **Advanced Features**
  - [x] Full page screenshot support
  - [x] Element-specific screenshot capture
  - [x] Multiple format support (WebP, PNG, JPEG)

- [x] **Documentation & Examples**
  - [x] Complete API documentation
  - [x] Add usage examples and tutorials
  - [x] Document MCP configuration for AI development tools
  - [x] Create troubleshooting guide
  - [x] Add performance optimization guide

- [x] **Error Handling & Reliability**
  - [x] Add timeout handling for page loads
  - [x] Implement retry logic for failed screenshots
  - [x] Add browser crash recovery
  - [x] Handle network and Docker errors
  - [x] Add comprehensive logging

- [x] **Documentation & Deployment**
  - [x] Create README with setup instructions
  - [x] Document MCP configuration for Cursor
  - [x] Add troubleshooting guide
  - [x] Create example usage scenarios
  - [x] Set up CI/CD pipeline (optional)

- [x] **Optimization & Polish**
  - [x] Optimize Docker image size
  - [x] Add browser session reuse
  - [x] Implement caching strategies
  - [x] Performance testing and tuning
  - [x] Final code review and cleanup

## Cookie-Based Authentication Implementation

- [x] **Cookie Parameter Support**
  - [x] Extend ScreenshotOptions interface with cookies parameter
  - [x] Add cookie validation using Zod schema (array of objects or JSON string)
  - [x] Update MCP tool schema to include cookies parameter
  - [x] Add cookie parsing utilities (JSON string to cookie object array)
  - [x] Implement cookie sanitization (never log cookie values)

- [x] **Browser Context Cookie Injection**
  - [x] Modify ScreenshotService to accept cookies in options
  - [x] Implement cookie injection before page navigation
  - [x] Add proper cookie domain and path handling
  - [x] Handle cookie format validation and error messages
  - [x] Add timeout handling for cookie-related operations

- [x] **Security & Privacy**
  - [x] Ensure cookie values are never logged or stored
  - [x] Clear sensitive data from memory after use
  - [x] Add security warnings to documentation
  - [x] Implement proper error messages without exposing cookie data
  - [x] Add input validation to prevent cookie injection attacks

- [x] **Testing & Validation**
  - [x] Create test fixtures with authentication requirements
  - [x] Add unit tests for cookie parsing and validation
  - [x] Create integration tests with mock authentication
  - [x] Test cookie injection with different domain configurations
  - [x] Add E2E tests with real authenticated scenarios
  - [x] Verify security measures (no cookie leakage in logs)

- [x] **Documentation & Examples**
  - [x] Document cookie extraction methods (dev tools, browser extensions)
  - [x] Add example cookie formats and usage scenarios
  - [x] Create step-by-step guides for popular sites (GitHub, Gmail)
  - [x] Document browser extension recommendations
  - [x] Add troubleshooting guide for authentication failures
  - [x] Update API documentation with cookie parameter details

- [x] **Error Handling & User Experience**
  - [x] Add helpful error messages for invalid cookies
  - [x] Implement authentication failure detection
  - [x] Add cookie expiration handling and user guidance
  - [x] Create user-friendly validation error messages
  - [x] Add parameter validation with clear feedback

## Cookie Domain Validation & Modern Authentication Support

- [x] **Default Cookie Environment Variable Support**
  - [x] Implement BROWSERLOOP_DEFAULT_COOKIES environment variable
  - [x] Support both JSON file paths and JSON string values
  - [x] Add automatic file vs string detection (path contains .json or starts with /)
  - [x] Create comprehensive error handling for file operations
  - [x] Add detailed debug logging for cookie loading process

- [x] **Cookie Merging System**
  - [x] Implement cookie merging between default and request cookies
  - [x] Request cookies override default cookies with same name
  - [x] Add detailed debug logging for merge process
  - [x] Sanitize sensitive values in all log outputs

- [x] **Modern Cookie Name Support**
  - [x] Fix overly restrictive cookie name validation regex
  - [x] Support RFC 6265 compliant cookie names including dots
  - [x] Add support for __Host- and __Secure- prefixed cookies
  - [x] Test with real-world authentication patterns (Next.js, analytics)
  - [x] Add comprehensive test suite for modern cookie names

- [x] **Parent Domain Cookie Support (RFC 6265)**
  - [x] Fix domain validation logic for parent domain cookies
  - [x] Implement correct RFC 6265 domain matching rules
  - [x] Support cookies with domain .example.com on subdomain.example.com
  - [x] Add comprehensive domain validation tests
  - [x] Document the fix and provide examples

- [x] **__Host- Cookie URL Format Fix**
  - [x] Fix __Host- cookie "Invalid cookie fields" error
  - [x] Implement base URL extraction for __Host- cookies (protocol + hostname only)
  - [x] Remove path components from URLs for __Host- cookies
  - [x] Test with real-world Next.js authentication patterns
  - [x] Ensure compatibility with mixed cookie types

- [x] **Cookie Expiration & Security Attributes Fix**
  - [x] Identify root cause of session cookie issue (missing expires, secure, httpOnly attributes)
  - [x] Create cookie enhancement system to add proper security attributes
  - [x] Implement automatic expiration date assignment (30 days for auth cookies)
  - [x] Fix persistent vs session cookie authentication problems
  - [x] Create cookie enhancement utility script for future updates
  - [x] Verify authentication works with enhanced cookies containing proper attributes
  - [x] **FINAL RESOLUTION**: All technical cookie issues resolved. Authentication failures are due to server-side session expiration (normal security behavior). Automatic cookie enhancement is working correctly but not needed since cookies are being properly injected. Users need to refresh expired authentication sessions.
  - [x] **REMOVED**: Manual enhance-cookies.js script removed since automatic enhancement is built into ScreenshotService

- [x] **Enhanced Debugging & Documentation**
  - [x] Create comprehensive debugging guide for cookie issues
  - [x] Document all common cookie problems and solutions
  - [x] Add step-by-step troubleshooting instructions
  - [x] Update API documentation with new cookie features
  - [x] Create examples for MCP configuration with default cookies

- [x] **Browser Extension Cookie Format Support**
  - [x] Update cookie validation schema to accept session cookies (expires: -1)
  - [x] Add support for float timestamps from browser extensions (e.g., 1750704030.825311)
  - [x] Respect existing cookie attributes instead of overriding them
  - [x] Ensure enhancement logic only adds missing attributes
  - [x] Test compatibility with real browser extension exports
  - [x] Document browser extension cookie support with examples
  - [x] **COMPLETE**: Users can now directly use cookie files exported from browser extensions without any manual editing required

- [x] **Repository Cleanup**
  - [x] Clean up temporary test files with specific identifiers
  - [x] Ensure all examples are suitable for public repository
  - [x] **COMPLETE**: Repository now contains only generic examples suitable for open source distribution

## Linting Error Fixes

- [x] Create proper type definitions to replace `any` types
- [x] Remove static-only classes (CookieUtils)
- [x] Replace `delete` operators with undefined assignments
- [x] Replace `forEach` with `for...of` loops
- [x] Fix MCP server API issues
- [x] Add missing imports and exports
- [x] Update test files with proper typing

## Git Pre-commit Hooks with lint-staged and Husky

- [x] **Environment and Version Verification**
  - [x] Verify Node.js version compatibility with lint-staged 16.1.0 and Husky 9.1.7
  - [x] Check current git status and ensure repository is clean
  - [x] Verify existing npm scripts (`lint` and `format`) work correctly
  - [x] Document current state of .git/hooks directory

- [x] **Package Installation**
  - [x] Install lint-staged version 16.1.0 as dev dependency
  - [x] Install Husky version 9.1.7 as dev dependency
  - [x] Verify package-lock.json is updated with exact versions
  - [x] Confirm no version conflicts with existing dependencies

- [x] **Husky Initialization and Setup**
  - [x] Run `npx husky init` to set up Husky configuration
  - [x] Verify .husky directory is created with correct structure
  - [x] Check that .husky/_/husky.sh script is created
  - [x] Ensure package.json prepare script is added for Husky installation
  - [x] Test Husky setup with `npm run prepare`

- [x] **lint-staged Configuration**
  - [x] Create lint-staged configuration in package.json
  - [x] Configure lint-staged to run `npm run lint` on staged files
  - [x] Configure lint-staged to run `npm run format` on staged files
  - [x] Set up proper file matching patterns for TypeScript/JavaScript files
  - [x] Add ignore patterns for generated files and node_modules
  - [x] Verify lint-staged config follows v16.1.0 syntax and features

- [x] **Pre-commit Hook Setup**
  - [x] Create .husky/pre-commit hook script
  - [x] Add `npx lint-staged` command to pre-commit hook
  - [x] Make pre-commit hook executable (chmod +x)
  - [x] Test pre-commit hook execution manually
  - [x] Verify hook script uses proper shebang and error handling

- [x] **Security Considerations**
  - [x] Review lint-staged configuration for potential command injection
  - [x] Ensure only trusted commands are executed in hooks
  - [x] Verify file pattern matching doesn't expose sensitive files
  - [x] Add safeguards against hook bypassing (document --no-verify usage)
  - [x] Test hook behavior with various file states (renamed, deleted, etc.)

## Cookie Domain Filtering for Multi-Site Support

- [x] **Core Cookie Filtering Implementation**
  - [x] Add cookie domain filtering function using existing RFC 6265 domain matching logic
  - [x] Filter out cookies that don't match target URL domain before injection
  - [x] Continue screenshot process even when some/all cookies are filtered out
  - [x] Add basic debug logging for filtered cookie count (without values)

- [x] **Security Verification**
  - [x] Test that filtered cookies never leak to wrong domains
  - [x] Verify RFC 6265 compliance with existing domain matching tests
  - [x] Test with multi-domain cookie files to ensure proper filtering

- [x] **Documentation Update**
  - [x] Document new domain filtering behavior in API docs
  - [x] Add troubleshooting note about authentication with filtered cookies

## Automatic Cookie File Reloading (Fix MCP Caching Issue) ✅ COMPLETE

- [x] **Core Configuration Refresh**
  - [x] Add `refreshConfig()` method to ConfigManager class
  - [x] Implement secure cookie file re-reading with proper error handling
  - [x] Add atomic configuration replacement to prevent partial updates
  - [x] Maintain cookie sanitization practices during reload operations

- [x] **Automatic File Watching System**
  - [x] Implement file watcher for cookie files using Node.js `fs.watch()` (chose fs.watch over chokidar to avoid external dependencies)
  - [x] Add debouncing to prevent rapid reload attempts during file writes (1000ms debounce delay)
  - [x] Watch all configured cookie file paths automatically
  - [x] Handle file deletion, creation, and modification events
  - [x] Add graceful error handling for watch failures (missing files, permissions)

- [x] **Configuration Integration**
  - [x] Automatically watch cookie file when BROWSERLOOP_DEFAULT_COOKIES points to a file path
  - [x] Integrate file watcher with ConfigManager initialization
  - [x] Ensure proper cleanup of file watchers on server shutdown
  - [x] Add logging for file watch events (without sensitive data)

- [x] **Security & Testing**
  - [x] Ensure no cookie values leak to logs during automatic reload operations
  - [x] Add unit tests for file watching mechanisms and debouncing (10 comprehensive tests)
  - [x] Test error handling for corrupted or invalid cookie files during automatic reload
  - [x] Verify backward compatibility with existing configurations
  - [x] Test file watcher cleanup and resource management

- [x] **MCP Protocol Compatibility Fix**
  - [x] **CRITICAL ISSUE IDENTIFIED**: Console logging was breaking MCP stdio communication
  - [x] **ROOT CAUSE**: Console output interfered with JSON-based MCP protocol over stdio
  - [x] **SOLUTION**: Removed all console.log/console.error from production code paths
  - [x] **VERIFICATION**: File watching now works silently in MCP environment
  - [x] **TESTING**: Maintained full debugging capabilities in test mode with mock watchers

- [x] **ScreenshotService Dynamic Configuration Fix**
  - [x] **CRITICAL ISSUE IDENTIFIED**: ScreenshotService was using stale configuration snapshot from startup
  - [x] **ROOT CAUSE**: ScreenshotService held a static reference to serviceConfig.authentication.defaultCookies from initialization time
  - [x] **SOLUTION**: Modified ScreenshotService.createScreenshotConfig() to fetch fresh authentication config from ConfigManager
  - [x] **VERIFICATION**: ScreenshotService now uses config.getAuthenticationConfig() for each screenshot operation
  - [x] **TESTING**: Verified that configuration changes are immediately reflected in new screenshot requests

- [x] **File Watcher Recreation After Rename Events Fix**
  - [x] **CRITICAL ISSUE IDENTIFIED**: File watcher stopped working after first change due to editor file replacement behavior
  - [x] **ROOT CAUSE**: Editors create temp files and rename them to replace originals, leaving fs.watch() watching dead inodes
  - [x] **SOLUTION**: Added watcher recreation logic for 'rename' events with proper cleanup and delayed recreation
  - [x] **IMPLEMENTATION**: Created recreateWatcher() method with file existence checks and 100ms delay for file operations
  - [x] **VERIFICATION**: File watcher now survives multiple file edits and continues monitoring indefinitely

- [x] **Documentation & Fallback**
  - [x] Document automatic file watching capabilities in API documentation
  - [x] Add troubleshooting guide for file watching issues
  - [x] Manual configuration refresh available via `config.refreshConfig()` method for edge cases
  - [x] **Updated documentation for file-based logging**: README.md and Cookie Authentication Guide now reflect new `/tmp/browserloop.log` logging
  - [x] **Removed BROWSERLOOP_SILENT environment variable**: No longer needed since file logging doesn't interfere with MCP protocol
  - [x] **COMPLETE**: Automatic file watching resolves MCP caching issues and works correctly in production MCP environments
