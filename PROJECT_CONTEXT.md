# BrowserLoop Project Context

## Project Overview

**BrowserLoop** is a Model Context Protocol (MCP) server for automated web page screenshot capture using Playwright. It enables AI agents and development tools to programmatically capture screenshots for UI verification, testing, and analysis tasks.

### Key Characteristics
- **License**: GNU Affero General Public License v3.0 or later (AGPL-3.0+)
- **Language**: TypeScript with Node.js 20+
- **Main Purpose**: MCP server for AI-driven screenshot automation
- **Target Users**: AI development tools, automated testing, UI verification

### Core Functionality
- High-quality screenshot capture using Playwright Chromium
- Support for viewport-specific and full-page screenshots
- Element-specific capture using CSS selectors
- Cookie-based authentication for protected pages
- Multiple image formats (WebP, PNG, JPEG) with quality control
- Comprehensive error handling and retry mechanisms
- Docker containerization for consistent environments

## Architecture Overview

### Core Components

1. **MCP Server (`mcp-server.ts`)** - Main Model Context Protocol server implementation
   - Handles tool registration and request routing
   - Validates and sanitizes input parameters
   - Manages the screenshot tool interface

2. **Screenshot Service (`screenshot-service.ts`)** - Core screenshot capture functionality
   - Browser automation using Playwright
   - Cookie injection for authenticated sessions
   - Multiple capture modes (viewport, full-page, element-specific)
   - Error handling and retry logic

3. **Configuration System (`config.ts`)** - Environment-based configuration management
   - Default values for all screenshot parameters
   - Validation using Zod schemas
   - Support for environment variable overrides

4. **Type System (`types.ts`)** - Comprehensive TypeScript definitions
   - All interfaces and types for the entire system
   - Error categorization and logging structures
   - Configuration and request/response types

5. **Cookie System (`cookie-utils.ts`)** - Authentication cookie handling
   - Cookie parsing and validation
   - Support for JSON files and direct JSON strings
   - Security-focused sanitization (no cookie values in logs)

6. **Logging System (`logger.ts`)** - Structured logging and metrics
   - Error categorization and tracking
   - Performance metrics collection
   - Debug and production logging modes

## Important Files and Their Roles

### Entry Points
- **`src/index.ts`** - Main application entry point with graceful shutdown handling
- **`package.json`** - Dependencies, scripts, and project metadata

### Core Implementation
- **`src/mcp-server.ts`** (293 lines) - MCP protocol implementation and tool registration
- **`src/screenshot-service.ts`** (1263 lines) - Main screenshot capture service with browser automation
- **`src/config.ts`** (294 lines) - Configuration management with environment variable support
- **`src/types.ts`** (406 lines) - Complete type definitions for the entire system

### Supporting Modules
- **`src/cookie-utils.ts`** (210 lines) - Cookie parsing, validation, and security utilities
- **`src/logger.ts`** (402 lines) - Logging system with error categorization and metrics
- **`src/cache.ts`** (247 lines) - Caching system for performance optimization
- **`src/image-processor.ts`** (89 lines) - Image processing utilities using Sharp
- **`src/performance.ts`** (286 lines) - Performance monitoring and optimization
- **`src/test-utils.ts`** (208 lines) - Testing utilities and mock objects

### Configuration & Documentation
- **`docker/Dockerfile`** - Multi-stage Docker build for production deployment
- **`biome.json`** - Linting and formatting configuration
- **`tsconfig.json`** - TypeScript compilation configuration
- **`docs/`** - Complete API documentation and usage guides

### Testing Infrastructure
- **`tests/unit/`** - Unit tests for all core modules
- **`tests/integration/`** - Integration tests for MCP server functionality
- **`tests/e2e/`** - End-to-end tests including Docker integration
- **`tests/performance/`** - Performance benchmarking tests
- **`tests/fixtures/`** - Test HTML pages and mock data

## Current Implementation Status

### ✅ Completed Features

#### CI/CD and Docker Integration
- **Docker CI/CD Pipeline**: Fixed GitHub Actions workflow for proper Docker testing
- **MCP Server CLI**: Added command line argument support (--help, --version)
- **Docker Integration Tests**: Updated tests to properly work with stdio-based MCP server
- **Script Naming**: Renamed `test:e2e:ts` to `test:e2e:docker` for clarity
- **Production Docker**: Multi-stage build with security best practices

### ✅ Completed Features

#### Core Functionality
- **Screenshot Capture**: Full implementation with Playwright Chromium
- **MCP Protocol**: Complete Model Context Protocol server implementation
- **Multiple Formats**: WebP, PNG, JPEG support with quality control
- **Viewport Control**: Configurable width/height (200-4000px)
- **Full Page Screenshots**: Complete page capture beyond viewport
- **Element Screenshots**: CSS selector-based element capture

#### Authentication & Security
- **Cookie Authentication**: Complete cookie injection system
- **Security Hardening**: Cookie sanitization, no sensitive data in logs
- **Input Validation**: Comprehensive parameter validation with Zod
- **Error Handling**: Categorized error system with recovery strategies

#### Configuration & Environment
- **Environment Variables**: All parameters configurable via environment
- **Default Cookie Support**: BROWSERLOOP_DEFAULT_COOKIES with file/JSON support
- **Retry Configuration**: Configurable retry count and delay
- **Timeout Management**: Multiple timeout configurations

#### Docker & Deployment
- **Production Docker**: Multi-stage build with security best practices
- **Non-root Execution**: Secure container execution
- **System Chromium**: Uses system-installed Chromium for efficiency
- **Health Checks**: Container health monitoring

#### Testing & Quality
- **Comprehensive Testing**: Unit, integration, e2e, and performance tests
- **Node.js Test Runner**: Using built-in test framework
- **CI/CD Ready**: All tests designed for automated pipelines
- **Code Quality**: Biome linting and formatting

### Key Technical Achievements

#### Advanced Cookie System
- **Modern Cookie Support**: Handles RFC 6265 compliant cookies including __Host- and __Secure- prefixes
- **Browser Extension Compatibility**: Direct import of cookie files from browser extensions
- **Domain Validation**: Correct parent domain matching (e.g., .example.com on subdomain.example.com)
- **Cookie Merging**: Request cookies override default cookies with same name
- **Session Cookie Support**: Handles both persistent and session cookies
- **Multi-Site Cookie Filtering**: Automatically filters cookies by domain to support multi-site cookie files

#### Error Handling & Reliability
- **Error Categorization**: 8 error categories (network, timeout, browser_crash, etc.)
- **Severity Levels**: 4 severity levels (low, medium, high, critical)
- **Recovery Strategies**: Automatic retry with exponential backoff
- **Metrics Collection**: Error tracking and performance monitoring

#### Performance Optimization
- **Browser Session Reuse**: Efficient browser instance management
- **Caching System**: Intelligent caching for repeated requests
- **Memory Management**: Proper cleanup and garbage collection
- **Timeout Optimization**: Multiple timeout configurations for different operations

## Development Workflow

### Available Scripts
- **Build**: `npm run build` - TypeScript compilation
- **Development**: `npm run dev` - Watch mode compilation
- **Testing**: `npm run test` - Full test suite (unit + integration + e2e)
- **Docker**: `npm run docker:build` / `npm run docker:run` - Container operations
- **Linting**: `npm run lint` / `npm run format` - Code quality

### Testing Strategy
- **Unit Tests**: Individual module testing with mocks
- **Integration Tests**: MCP server functionality testing
- **E2E Tests**: Real browser automation testing
- **Performance Tests**: Benchmarking and optimization verification

### Development Guidelines
- **TypeScript First**: Strict typing throughout the codebase
- **Error Handling**: Comprehensive error categorization and recovery
- **Security Focus**: No sensitive data in logs, proper input validation
- **Docker Ready**: All features tested in containerized environment

## Current Development - Cookie Domain Filtering Complete

The project is in a **production-ready state** with all core features implemented and thoroughly tested. Recently completed cookie domain filtering for multi-site support, enabling users to use cookie files containing cookies from multiple domains without manual filtering.

### Cookie Domain Filtering Implementation
- ✅ **Core Filtering Logic**: Added `filterCookiesByDomain()` function using existing RFC 6265 domain matching logic
- ✅ **Service Integration**: Modified `ScreenshotService.injectCookies()` to filter cookies before injection
- ✅ **Graceful Handling**: Screenshot continues even when all cookies are filtered out
- ✅ **Debug Logging**: Added filtered cookie count logging without exposing sensitive values
- ✅ **Comprehensive Testing**: 11 unit tests and 6 integration tests covering all filtering scenarios
- ✅ **Security Verification**: Confirmed filtered cookies never leak to wrong domains
- ✅ **RFC 6265 Compliance**: Verified correct parent domain matching and __Host-/__Secure- cookie handling

### Development Dependencies
- **lint-staged@16.1.0**: Configured to run linting and formatting on staged files
- **husky@9.1.7**: Git hooks management for automated quality checks
- **@biomejs/biome@1.9.4**: Existing linting and formatting tool
- **typescript@5.7.2**: TypeScript compiler
- **@types/node@22.10.2**: Node.js type definitions

## Next Steps & Maintenance

Key areas for potential enhancement after git hooks completion:

1. **Performance Monitoring**: Enhanced metrics collection and alerting
2. **Additional Formats**: Support for additional image formats if needed
3. **Advanced Selectors**: XPath or more complex selector support
4. **Batch Operations**: Multiple screenshots in single request
5. **Storage Backends**: Alternative storage options beyond base64 responses

## Usage in AI Development

BrowserLoop is designed to integrate seamlessly with AI development tools that support MCP:

1. **Cursor IDE**: Add to `~/.cursor/mcp.json` configuration
2. **Claude Desktop**: Configure in MCP settings
3. **Custom AI Tools**: Use via MCP protocol directly

The tool enables AI agents to:
- Verify UI implementations against designs
- Capture screenshots for debugging
- Test responsive design across viewport sizes
- Document visual changes during development
- Automate visual regression testing

## Technical Dependencies

### Runtime Dependencies
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **playwright**: Browser automation (Chromium)
- **sharp**: Image processing and optimization
- **zod**: Runtime type validation

### Development Dependencies
- **@biomejs/biome**: Fast linting and formatting
- **typescript**: Type system and compilation
- **@types/node**: Node.js type definitions

### System Requirements
- **Node.js 20+**: Runtime environment
- **Docker**: For containerized deployment
- **Chromium**: Browser engine (installed via Playwright or system package)
