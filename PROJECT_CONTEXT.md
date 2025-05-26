# BrowserLoop - MCP Screenshot Server

## What This Is
An **MCP (Model Context Protocol) server** that provides screenshot capabilities for AI agents using Playwright. Allows AI tools to capture and analyze web page screenshots, especially useful for verifying UI changes on localhost development servers.

**Current Status**: 🔧 **NEEDS LINTING FIXES** - Core functionality is production ready but requires code quality improvements

## Key Use Cases
- AI agent verification of localhost development servers
- Automated UI testing and validation
- Screenshot capture for web development workflows
- Integration with AI development tools (Cursor, Claude Desktop, etc.)

## Technical Stack
- **Node.js 20+ with TypeScript**
- **Playwright** for browser automation
- **Sharp** for image processing (PNG, JPEG, WebP)
- **Docker** for containerized deployment
- **MCP Protocol** for AI tool integration

## What's Complete ✅

### Core Features
- ✅ **MCP Server**: Full protocol compliance with stdio transport
- ✅ **Screenshot Service**: Playwright-based with page pooling and browser session reuse
- ✅ **Multiple Formats**: PNG, JPEG, WebP with quality controls
- ✅ **Advanced Features**: Full page, viewport, element-specific screenshots
- ✅ **Docker**: Optimized production container (1.01GB, 58% size reduction)

### Performance & Reliability
- ✅ **Performance**: 13.70 concurrent shots/sec (2x improvement)
- ✅ **Caching**: LRU cache with TTL for repeated requests
- ✅ **Error Handling**: Comprehensive logging with categorization and recovery
- ✅ **Browser Management**: Session reuse, crash recovery, resource cleanup

### Testing & CI/CD
- ✅ **143 Tests Passing**: Unit, integration, E2E, and performance tests
- ✅ **CI/CD Pipeline**: GitHub Actions with multi-version testing, security scanning
- ✅ **Multi-platform**: amd64 and arm64 Docker builds
- ✅ **Quality Gates**: Linting, formatting, security audits

### Documentation
- ✅ **Complete API Docs**: Parameter reference, examples, troubleshooting
- ✅ **Setup Guides**: README with MCP configuration for AI tools
- ✅ **Architecture Docs**: Technical decisions and implementation details

## What Needs Fixing 🔧

### Code Quality Issues (Linting Errors)
- 🔧 **Type Safety**: 18 instances of `any` type usage that need proper typing
- 🔧 **Static Class**: CookieUtils class should be converted to exported functions
- 🔧 **Performance**: 2 instances of `forEach` that should use `for...of`
- 🔧 **Type Casting**: 4 instances of unsafe `as any` type assertions

**Impact**: These are code quality issues that don't affect functionality but should be fixed for maintainability and type safety.

**Linting Command**: `npm run lint` currently fails with 36 errors and 40 warnings

## What's Next (Optional Enhancements)

### Authentication Support ✅
**Complete**: Cookie-based authentication for login-protected pages

- [x] Cookie parameter support in MCP tool
- [x] Cookie validation and parsing utilities with security measures
- [x] Zod schema validation for cookie arrays and JSON strings
- [x] Cookie sanitization (never logs sensitive values)
- [x] Comprehensive testing (50 new cookie/auth tests, 143 total tests passing)
- [x] Browser context cookie injection
- [x] Proper domain and path handling with auto-derivation from URL
- [x] Timeout handling for cookie operations with network timeout
- [x] Error categorization for cookie-specific failures
- [x] Integration testing with cookie injection scenarios
- [x] **Security & Privacy Implementation**
  - [x] Memory cleanup: Cookie values automatically cleared after use
  - [x] Sanitized logging: Cookie values never appear in logs
  - [x] Input validation: Prevents cookie injection attacks
  - [x] Domain validation: Prevents cross-domain cookie attacks
  - [x] Size limits: Prevents DoS via large cookie payloads
- [x] **Documentation & Examples**
  - [x] Comprehensive Cookie Authentication Guide (docs/COOKIE_AUTHENTICATION.md)
  - [x] Step-by-step extraction guides for popular sites
  - [x] Browser extension recommendations
  - [x] Security best practices and troubleshooting
  - [x] API documentation with detailed examples
- [x] **Error Handling & User Experience**
  - [x] Helpful error messages for invalid cookies
  - [x] Authentication failure detection and guidance
  - [x] Cookie expiration handling
  - [x] User-friendly validation error messages
  - [x] Parameter validation with clear feedback
- [x] **Default Cookies Configuration** ⭐ NEW
  - [x] BROWSERLOOP_DEFAULT_COOKIES environment variable support
  - [x] JSON string parsing for MCP configuration
  - [x] Cookie merging: Request cookies override defaults
  - [x] Persistent authentication across all requests
  - [x] Secure environment-based storage
  - [x] Comprehensive testing and documentation

### Future Enhancements (Not Started)
- Multiple browser engines (Firefox, Safari)
- Mobile device emulation
- Video recording capabilities
- Batch screenshot operations
- Enterprise features (auth, rate limiting)

## Quick Start

### Prerequisites
- Node.js 20+
- Docker with compose support

### Installation
```bash
git clone <repo>
cd browserloop
npm install
npm run build
```

### MCP Configuration
Add to your AI tool's MCP settings:
```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": ["/path/to/browserloop/dist/src/index.js"]
    }
  }
}
```

### Usage
```bash
# Start MCP server
npm start

# Run tests
npm test

# Docker development
npm run docker:dev
```

### Quick Start Commands
```bash
# Install dependencies
npm install

# Install Playwright browsers (required for screenshots)
npx playwright install chromium
# OR use the convenient script:
npm run install-browsers

# Build project
npm run build

# Start MCP server
npm start

# Run all tests
npm test

# Docker development
npm run docker:dev
```

## Project Structure

```
browserloop/
├── src/
│   ├── index.ts (MCP server entry point) ✅
│   ├── mcp-server.ts (MCP server implementation) ✅
│   ├── screenshot-service.ts (Core Playwright Service) ✅
│   ├── config.ts (Configuration management) ✅
│   ├── types.ts (screenshot interfaces) ✅
│   └── test-utils.ts (testing utilities) ✅
├── tests/
│   ├── unit/ (test utilities + screenshot service tests) ✅
│   ├── integration/ (MCP server tests with response format verification) ✅
│   ├── e2e/ (Docker integration tests) ✅
│   └── fixtures/ (HTML test pages) ✅
├── docs/
│   └── API.md (Complete API reference documentation) ✅
├── docker/
│   ├── Dockerfile (production) ✅
│   └── docker-compose.yml (development) ✅
├── README.md (User-friendly setup and usage guide) ✅
├── PROJECT_CONTEXT.md (Architecture and technical decisions) ✅
└── config files (package.json, tsconfig.json, biome.json) ✅
```

**Dependencies Installed**:
- Production: `@modelcontextprotocol/sdk@^1.0.6`, `playwright@^1.48.2`, `sharp@^0.34.2`, `zod@^3.25.28`
- Development: TypeScript, Biome, Node.js types

**Docker Environment** ✅:
- **Optimized Production Image**: Multi-stage Alpine Linux build (1.01GB, reduced from 2.39GB - 58% savings)
- System Chromium integration (no Playwright browser downloads)
- Development: Live code mounting, persistent browser cache
- Security: Non-root playwright user with proper permissions
- Health checks and container monitoring

**Core Playwright Service** ✅:
- **ScreenshotService class with advanced optimizations**
- **Page pooling system** with configurable pool size (default: 3 pages)
- **Browser session reuse** for improved performance (2x concurrent improvement)
- Support for different viewport sizes (configurable width/height)
- PNG, JPEG, and WebP format support with Sharp-based conversion
- Configurable page load strategies (networkidle/domcontentloaded)
- **Comprehensive error handling and logging** with categorization
- **Enhanced retry logic** with exponential backoff and browser crash recovery
- Full page and viewport screenshot capabilities
- Element-specific screenshot capture with CSS selectors
- **Intelligent browser lifecycle management** with automatic cleanup
- Advanced timeout handling for different operations
- **Cookie injection for authentication** with domain auto-derivation and timeout handling

**Performance & Caching** ✅:
- **ScreenshotCache class** with LRU eviction and configurable TTL
- **Performance testing suite** with benchmarking capabilities
- **Concurrent operation support** (13.70 shots/sec vs 6.64 sequential)
- **Memory efficiency optimization** (negative memory growth in tests)
- **Format performance optimization** (JPEG: 15.00 shots/sec, PNG: 13.95, WebP: 10.03)
- Cache hit ratio tracking and statistics
- Automatic expired entry cleanup

**Error Handling & Reliability** ✅:
- **Comprehensive logging system** with structured error categorization
- **Error severity classification** (low, medium, high, critical)
- **Recovery strategies** for different error types
- **Health monitoring** with detailed metrics collection
- **Browser crash recovery** with automatic reinitialization
- **Network and Docker error handling** with appropriate retry logic
- **Silent operation** (no console output to maintain MCP protocol compliance)

**Image Processing Service** ✅:
- Sharp-based format conversion for JPEG and WebP
- Quality-first capture strategy (PNG → conversion)
- Configurable quality settings for lossy formats
- Proper MIME type generation for all formats
- Optimal Playwright format selection

**MCP Server Implementation** ✅:
- Complete MCP protocol server setup with stdio transport
- Screenshot tool registered with proper schema and Zod validation
- Support for PNG, JPEG, and WebP format parameters
- Correct MCP response format with image content type and isError field
- Base64 image encoding with proper MIME types
- Parameter validation with reasonable defaults and limits
- Clean JSON-RPC communication (no console output interference)

**Testing Infrastructure** ✅:
- **143 tests passing** across all suites
- **76 unit tests** (including Logger, ImageProcessor, ScreenshotService, Cookie Utils, and Cookie Security tests)
- **46 integration tests** (including JPEG format support, error handling, cookie injection, and cookie security)
- **21 E2E tests** (format support, built server, full page, element screenshots, authentication scenarios)
- **6 performance benchmark tests** (sequential, concurrent, format comparison)
- Test fixtures with beautiful HTML pages
- Screenshot validation utilities
- Response format compliance testing
- **Comprehensive performance measurement** and memory efficiency testing
- **Cookie injection and security testing** with 24 comprehensive security tests

### Configuration Cleanup ✅

**Removed Unnecessary Files**:
- `install-global.sh` (global installation approach discontinued)
- `mcp-config.json` and `mcp-config-npm.json` (example configs removed)
- `CURSOR_CONFIG.md` (content moved to README.md)

**Simplified Configuration**:
- README.md now contains essential MCP setup instructions
- Removed NODE_ENV requirement (not used in code)
- Corrected package.json bin path to `dist/src/index.js`

**Comprehensive Documentation** ✅:
- Complete API reference with detailed parameter documentation (`docs/API.md`)
- 7 practical usage examples covering common scenarios
- Detailed MCP configuration instructions with environment variables
- Troubleshooting guide with common errors and solutions
- Performance optimization guidelines and format selection advice
- Response processing examples (base64 handling, metadata parsing)
- Development integration examples for CI/CD and testing
- User-friendly README.md with quick start guide
- Cross-referenced documentation with clear navigation

### Current Status: COMPLETE & PRODUCTION READY ✅

The MCP screenshot server is now **complete** and ready for production use with comprehensive CI/CD automation:

1. **MCP Protocol Compliance**: Fully compliant with MCP specification 2025-03-26
2. **Response Format**: Correct image content type with metadata
3. **Advanced Error Handling**: Comprehensive logging, categorization, and recovery strategies
4. **Clean Communication**: No console output interference (MCP stdio compatibility)
5. **Extensive Testing**: **143 tests passing** across all suites with performance benchmarks
6. **Multiple Format Support**: PNG, JPEG, and WebP with quality controls and performance optimization
7. **Complete Documentation**: API reference, usage examples, configuration guides, and troubleshooting
8. **Docker Optimization**: **58% image size reduction** (2.39GB → 1.01GB)
9. **Performance Optimization**: **2x concurrent improvement** (6.64 → 13.70 shots/sec)
10. **Advanced Features**: Page pooling, caching, browser session reuse, comprehensive monitoring
11. **CI/CD Pipeline**: Automated testing, security scanning, multi-platform builds, and release management
12. **Cookie Authentication**: Secure cookie-based authentication with comprehensive security measures

### CI/CD Pipeline ✅

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):
- **Multi-version testing**: Node.js 20, 22, and 23 compatibility
- **Quality gates**: Linting, formatting, and security scanning
- **Docker integration**: Container builds and E2E testing
- **Performance monitoring**: Automated benchmarking on pull requests
- **Security scanning**: npm audit and GitHub CodeQL analysis
- **Multi-architecture builds**: amd64 and arm64 Docker images
- **Release automation**: Automated GitHub releases with build artifacts
- **Build status badge**: Visible pipeline status in README

**Pipeline Features**:
- Cross-platform compatibility testing
- Comprehensive test coverage validation
- Docker image optimization and caching
- Performance regression detection
- Automated security vulnerability scanning
- Clean artifact generation for releases

### Performance Metrics ✅

| Feature | Measurement | Achievement |
|---------|-------------|-------------|
| **Docker Image Size** | 1.01GB (was 2.39GB) | **58% reduction** |
| **Sequential Performance** | 6.64 shots/sec | 33% improvement |
| **Concurrent Performance** | 13.70 shots/sec | **170% improvement** |
| **Memory Efficiency** | Negative growth (-1.58MB) | **Excellent** |
| **Format Performance** | JPEG: 15.00, PNG: 13.95, WebP: 10.03 shots/sec | **Optimized** |
| **Test Coverage** | 143 tests passing | **Comprehensive** |

## Development Environment Setup

### Prerequisites
- Node.js 20+
- Docker with compose support
- Git

### Quick Start Commands
```bash
# Install dependencies
npm install

# Install Playwright browsers (required for screenshots)
npx playwright install chromium
# OR use the convenient script:
npm run install-browsers

# Build project
npm run build

# Start MCP server
npm start

# Run all tests
npm test

# Docker development
npm run docker:dev
```

## Current Status

**All linting errors have been successfully resolved!** 🎉

The codebase now passes all linting checks with zero errors and zero warnings. Key improvements made:

### Type Safety Improvements
- **Replaced all `any` types** with proper TypeScript interfaces and types
- **Created comprehensive type definitions** in `src/types.ts`:
  - `LogContext` interface for structured logging (replaces `Record<string, any>`)
  - `TimeoutConfig`, `ScreenshotOptionsWithCookies`, `MockTestObjects` interfaces
  - Proper cookie and browser-related type definitions

### Code Quality Fixes
- **Removed static-only classes**: Converted `CookieUtils` class to exported functions
- **Eliminated `delete` operators**: Replaced with proper undefined assignments
- **Replaced `forEach` loops**: Converted all to `for...of` loops for better performance
- **Fixed import/export issues**: Added proper type imports and cleaned up module structure

### File-by-File Improvements
- **`src/logger.ts`**: Updated all method signatures to use `LogContext` instead of `any`
- **`src/cookie-utils.ts`**: Converted from static class to exported functions
- **`src/config.ts`**: Fixed syntax errors and removed `delete` operators
- **`src/mcp-server.ts`**: Replaced type casting with proper interfaces
- **`src/screenshot-service.ts`**: Fixed all `any` types with proper Playwright types
- **All test files**: Added proper interfaces and replaced `any` types with specific mocks

### Security & Maintainability
- **Enhanced type safety** prevents runtime errors and improves IDE support
- **Improved code readability** with explicit type definitions
- **Better error handling** with properly typed error objects
- **Maintained backward compatibility** while improving internal structure

The codebase is now in excellent condition with modern TypeScript best practices applied throughout.
