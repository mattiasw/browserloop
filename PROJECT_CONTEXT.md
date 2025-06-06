# BrowserLoop Project Context

## Project Overview

**BrowserLoop** is a production-ready Model Context Protocol (MCP) server that provides automated web page screenshot capture for AI development tools. It enables AI agents to programmatically capture screenshots for UI verification, authenticated page testing, and development workflows.

### Key Characteristics
- **License**: GNU Affero General Public License v3.0 or later (AGPL-3.0+)
- **Language**: TypeScript with Node.js 20+
- **Architecture**: MCP server with Playwright browser automation
- **Status**: **Production Ready** with comprehensive testing and CI/CD pipeline

### Core Value Proposition
- **Seamless AI Integration**: Native MCP protocol support for Cursor, Claude Desktop, and other AI tools
- **Authenticated Screenshots**: Advanced cookie-based authentication with automatic file monitoring
- **Developer-Friendly**: Hot-reloading cookie files, comprehensive debugging, and Docker containerization
- **Enterprise-Ready**: Comprehensive error handling, retry logic, and security hardening

## Architecture Overview

### Core System Components

#### 1. **MCP Protocol Layer** (`src/mcp-server.ts`)
- **Purpose**: Model Context Protocol server implementation
- **Key Features**: Tool registration, parameter validation, stdio transport
- **Critical Design**: Zero console output to maintain MCP protocol compatibility
- **Lines**: 316 lines with comprehensive input validation

#### 2. **Screenshot Engine** (`src/screenshot-service.ts`)
- **Purpose**: Core screenshot capture using Playwright Chromium
- **Key Features**: Dynamic configuration refresh, cookie injection, multiple capture modes
- **Critical Design**: Fetches fresh configuration for each request (no stale data)
- **Lines**: 1338 lines with comprehensive error handling and retry logic

#### 3. **Dynamic Configuration System** (`src/config.ts`)
- **Purpose**: Environment-based configuration with real-time file monitoring
- **Key Features**:
  - **Automatic File Watching**: Monitors cookie files with fs.watch() and 1000ms debouncing
  - **Watcher Recreation**: Survives editor file replacement (rename events)
  - **Atomic Updates**: Configuration replacement prevents partial updates
  - **Security**: Never logs sensitive cookie values
- **Lines**: 670 lines with comprehensive file watching and error handling

#### 4. **File-Based Logging System** (`src/file-logger.ts`)
- **Purpose**: Debug logging that doesn't interfere with MCP stdio protocol
- **Key Features**: Writes to `/tmp/browserloop.log`, automatic log path detection
- **Critical Design**: Completely silent console operation for MCP compatibility
- **Lines**: 112 lines with robust file system error handling

#### 5. **Advanced Cookie System** (`src/cookie-utils.ts`)
- **Purpose**: Authentication cookie management with modern browser support
- **Key Features**:
  - **Browser Extension Compatibility**: Direct import from Cookie Editor, EditThisCookie
  - **Modern Cookie Support**: `__Host-`, `__Secure-` prefixes, RFC 6265 compliance
  - **Domain Filtering**: Automatic filtering by domain for multi-site cookie files
  - **Security**: Comprehensive sanitization and validation
- **Lines**: 210 lines with extensive validation and filtering logic

## Major Technical Achievements

### 🔄 **Automatic Cookie File Reloading** *(Signature Feature)*
**The Problem**: MCP servers cache configuration at startup, requiring manual restarts when authentication cookies expire.

**The Solution**: Real-time file monitoring system that automatically detects cookie file changes and refreshes configuration within 1-2 seconds.

**Technical Implementation**:
- **File Watcher**: Uses Node.js `fs.watch()` with 1000ms debouncing
- **Editor Compatibility**: Handles rename events (VS Code, vim file replacement)
- **Dynamic Configuration**: ScreenshotService fetches fresh config for each screenshot
- **MCP Safety**: All logging via file system to prevent stdio protocol interference

**Result**: Zero-downtime authentication updates - edit your cookie file and screenshots immediately use the new authentication.

### 🛡️ **MCP Protocol Compatibility** *(Critical Infrastructure)*
**The Problem**: Console logging was breaking MCP's JSON-based stdio communication with "Unexpected token" errors.

**The Solution**: Complete separation of debug logging from MCP transport:
- **File-Based Logging**: All debug output to `/tmp/browserloop.log`
- **Silent Operation**: Zero console output in production mode
- **Full Debugging**: Rich debug information available via file monitoring

**Result**: Reliable MCP communication with comprehensive debugging capabilities.

### 🍪 **Modern Cookie Authentication** *(Advanced Feature)*
**The Problem**: Complex authentication scenarios with modern web applications.

**The Solution**: Comprehensive cookie support system:
- **Browser Extension Import**: Direct compatibility with popular cookie export tools
- **Modern Standards**: `__Host-`, `__Secure-` prefixes, session cookies, float timestamps
- **Domain Intelligence**: RFC 6265 compliant domain matching and filtering
- **Multi-Site Support**: Single cookie file can contain cookies for multiple domains

**Result**: Works with any authentication system from simple session cookies to complex enterprise SSO.

## File Structure & Key Components

### **Entry Points & Core**
```
src/index.ts              # Application entry point with graceful shutdown
src/mcp-server.ts          # MCP protocol implementation (316 lines)
src/screenshot-service.ts  # Core screenshot engine (1338 lines)
src/config.ts             # Dynamic configuration system (670 lines)
```

### **Support Systems**
```
src/file-logger.ts        # File-based logging system (112 lines)
src/cookie-utils.ts       # Advanced cookie management (210 lines)
src/types.ts              # Comprehensive TypeScript definitions (406 lines)
src/logger.ts             # Structured logging and metrics (402 lines)
src/image-processor.ts    # Image processing with Sharp (89 lines)
```

### **Configuration & Deployment**
```
docker/Dockerfile         # Multi-stage production build
biome.json                # Linting and formatting configuration
tsconfig.json             # TypeScript compilation settings
package.json              # Dependencies and scripts
```

### **Comprehensive Testing**
```
tests/unit/               # 87 unit tests (all passing)
tests/integration/        # 32 integration tests (MCP protocol)
tests/e2e/                # 11 end-to-end tests (format support)
tests/performance/        # Performance benchmarking
tests/fixtures/           # Test HTML pages and mock data
```

## Current Development Status

### ✅ **Production Features Complete**

#### **npm Distribution & Automation** *(100% Complete)*
- ✅ **npm Package**: Published and available at https://www.npmjs.com/package/browserloop
- ✅ **Global Installation**: `npm install -g browserloop` for permanent installation
- ✅ **NPX Support**: `npx -y browserloop@latest` for on-demand execution
- ✅ **Automated CI/CD**: GitHub Actions automatically publishes releases to npm
- ✅ **Version Management**: Automated semantic versioning with `npm run version:patch/minor/major`
- ✅ **Release Documentation**: Complete automation guide and troubleshooting

#### **Core Functionality** *(100% Complete)*
- ✅ **Screenshot Capture**: High-quality capture with Playwright Chromium
- ✅ **Multiple Formats**: WebP, PNG, JPEG with quality control
- ✅ **Flexible Capture**: Viewport, full-page, and element-specific screenshots
- ✅ **MCP Integration**: Complete Model Context Protocol implementation

#### **Authentication & Security** *(100% Complete)*
- ✅ **Cookie Authentication**: Complete injection system with security hardening
- ✅ **Modern Cookie Support**: `__Host-`, `__Secure-`, browser extension compatibility
- ✅ **Domain Filtering**: Automatic filtering for multi-site cookie files
- ✅ **Security**: No sensitive data logging, comprehensive input validation

#### **Configuration & Reliability** *(100% Complete)*
- ✅ **Environment Configuration**: All parameters configurable via environment variables
- ✅ **Automatic File Watching**: Real-time cookie file monitoring with watcher recreation
- ✅ **Error Handling**: 8 error categories with recovery strategies
- ✅ **Retry Logic**: Configurable retry count and delay with exponential backoff

#### **Deployment & Operations** *(100% Complete)*
- ✅ **Docker Integration**: Multi-stage build with security best practices
- ✅ **CI/CD Pipeline**: GitHub Actions with comprehensive testing
- ✅ **File-Based Logging**: Debug logging to `/tmp/browserloop.log`
- ✅ **Health Monitoring**: Container health checks and metrics collection

### 🎯 **Recent Major Developments**

#### **Automatic Cookie File Reloading** *(Completed January 2025)*
- **Impact**: Eliminates manual MCP server restarts for authentication updates
- **Implementation**: File watching with fs.watch(), debouncing, and watcher recreation
- **Testing**: 10 comprehensive unit tests covering all edge cases
- **Result**: Production-ready automatic configuration refresh

#### **MCP Protocol Compatibility Fix** *(Completed January 2025)*
- **Impact**: Resolved "Unexpected token" JSON parsing errors in Cursor MCP
- **Implementation**: Complete elimination of console output in favor of file logging
- **Testing**: All 87 unit tests pass with silent operation
- **Result**: Reliable MCP communication in all AI development tools

#### **Configuration System Simplification** *(Completed January 2025)*
- **Impact**: Simplified configuration by removing redundant BROWSERLOOP_SILENT
- **Implementation**: File logging independent of "silent" mode
- **Testing**: All tests updated to work with simplified configuration
- **Result**: Cleaner, more intuitive configuration system

## Key Environment Variables

### **Authentication**
- `BROWSERLOOP_DEFAULT_COOKIES`: Path to cookie file or JSON string for default authentication
- `BROWSERLOOP_DISABLE_FILE_WATCHING`: Set to "true" to disable automatic file monitoring

### **Debugging & Development**
- `BROWSERLOOP_DEBUG`: Enable debug logging to `/tmp/browserloop.log`
- `BROWSERLOOP_ENABLE_METRICS`: Enable error metrics collection (default: true)

### **Performance & Reliability**
- `BROWSERLOOP_RETRY_COUNT`: Number of retry attempts (default: 3)
- `BROWSERLOOP_RETRY_DELAY`: Delay between retries in milliseconds (default: 1000)

### **Image Configuration**
- `BROWSERLOOP_DEFAULT_FORMAT`: Default image format - webp, png, jpeg (default: webp)
- `BROWSERLOOP_DEFAULT_QUALITY`: Default image quality 0-100 (default: 80)
- `BROWSERLOOP_DEFAULT_WIDTH`: Default viewport width 200-4000 (default: 1280)
- `BROWSERLOOP_DEFAULT_HEIGHT`: Default viewport height 200-4000 (default: 720)

## Testing & Quality Assurance

### **Comprehensive Test Coverage**
- **Unit Tests**: 87 tests covering all core functionality
- **Integration Tests**: 32 tests for MCP protocol compliance
- **E2E Tests**: 11 tests for format support and Docker integration
- **Performance Tests**: Benchmarking and optimization verification

### **Quality Metrics**
- **All Tests Passing**: 100% test success rate maintained
- **Zero Console Output**: MCP protocol compliance verified
- **File Watching Coverage**: 10 dedicated tests for automatic reloading
- **Error Handling**: Comprehensive coverage of failure scenarios

### **CI/CD Pipeline**
- **GitHub Actions**: Automated testing on multiple environments
- **Docker Testing**: Container build and deployment verification
- **Code Quality**: Biome linting and formatting enforcement
- **Security**: No sensitive data exposure in logs or tests

## Usage in AI Development

### **Supported AI Tools**
- **Cursor IDE**: Primary integration via `~/.cursor/mcp.json`
- **Claude Desktop**: MCP settings configuration
- **Custom AI Tools**: Direct MCP protocol integration

### **AI Agent Capabilities Enabled**
- **UI Verification**: Compare implementations against designs
- **Development Testing**: Capture authenticated areas during development
- **Responsive Testing**: Verify UI across different viewport sizes
- **Visual Documentation**: Create visual records of development progress
- **Regression Testing**: Automated visual change detection

### **Example MCP Configuration**
```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": ["dist/src/index.js"],
      "env": {
        "BROWSERLOOP_DEFAULT_COOKIES": "/path/to/cookies.json",
        "BROWSERLOOP_DEBUG": "true"
      }
    }
  }
}
```

## Development Workflow

### **Available Scripts**
- `npm run build`: TypeScript compilation
- `npm run test`: Complete test suite (unit + integration + e2e)
- `npm run docker:build`: Docker container build
- `npm run lint` / `npm run format`: Code quality checks

### **Development Guidelines**
- **TypeScript First**: Strict typing throughout codebase
- **Error Handling**: Comprehensive categorization and recovery
- **Security Focus**: No sensitive data in logs, proper validation
- **MCP Compatibility**: Silent operation maintaining protocol integrity

### **Debugging Workflow**
1. Set `BROWSERLOOP_DEBUG=true` in environment
2. Monitor logs: `tail -f /tmp/browserloop.log`
3. Test cookie file changes in real-time
4. Verify automatic configuration refresh

## Technical Dependencies

### **Runtime Dependencies**
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **playwright**: Browser automation (Chromium)
- **sharp**: Image processing and optimization
- **zod**: Runtime type validation and schema enforcement

### **Development Dependencies**
- **@biomejs/biome**: Fast linting and formatting
- **typescript**: Type system and compilation
- **@types/node**: Node.js type definitions
- **lint-staged** + **husky**: Git hooks for quality enforcement

### **System Requirements**
- **Node.js 20+**: Runtime environment
- **Docker**: For containerized deployment
- **Chromium**: Browser engine (installed via Playwright)

## NPX Distribution Status

### **Package Name Availability** *(Completed January 2025)*
- ✅ **Primary Name Available**: `browserloop` is available on npm registry
- ✅ **Alternative Names Available**: `browser-loop` also available if needed
- ✅ **No Naming Conflicts**: No existing packages with similar functionality
- ✅ **Publishing Rights Confirmed**: User logged in as `mattiasw` on npm
- ✅ **Package Configuration**: Already configured with bin entry in package.json

### **NPM Publishing Configuration** *(Completed January 2025)*
- ✅ **Files Array**: Configured to include only essential files (dist/src, README.md, LICENSE, NOTICE)
- ✅ **PublishConfig**: Set to public access on npm registry
- ✅ **Repository Info**: GitHub repository URLs configured for npm page
- ✅ **Package Metadata**: Homepage and bug tracker URLs added
- ✅ **Package Size**: Optimized to 72.5 kB tarball with 323.6 kB unpacked
- ✅ **Binary Entry**: Confirmed working with proper help/version output

### **Browser Error Handling** *(Simplified January 2025)*
- ✅ **Documentation-First Approach**: Relies on Playwright's clear default error "Executable doesn't exist"
- ✅ **Simplified Codebase**: Removed complex detection in favor of comprehensive README documentation
- ✅ **NPX-Focused**: Installation guidance optimized for `npx -y browserloop@latest` usage pattern

### **Enhanced Browser Installation Documentation** *(Completed January 2025)*
- ✅ **NPX Usage Section**: Comprehensive guide for MCP users with one-command setup
- ✅ **OS-Specific Instructions**: Detailed platform-specific guidance for Linux, macOS, Windows
- ✅ **Browser Installation Requirements**: Critical setup section with verification steps
- ✅ **Enhanced Troubleshooting**: Comprehensive browser-related error diagnosis and solutions
- ✅ **MCP Configuration Examples**: Both NPX and development installation configurations
- ✅ **Quick Diagnosis Commands**: Step-by-step verification workflow for complete setup

### **TypeScript Pre-build Implementation** *(Completed January 2025)*
- ✅ **Automatic Build Hooks**: Added `prepublishOnly` and `prepack` npm lifecycle hooks
- ✅ **Build Validation**: Comprehensive validation scripts to ensure dist/ contains all required files
- ✅ **Security Validation**: Automated checks to prevent sensitive files in build output
- ✅ **Package Size Optimization**: 72.7 kB tarball (324.3 kB unpacked) with all compiled TypeScript
- ✅ **NPX Compatibility**: Full dist/ folder inclusion ensures `npx -y browserloop@latest` works immediately
- ✅ **CI/CD Integration**: Build hooks ensure consistent package state for all publishing methods

### **Enhanced CLI for NPX Usage Patterns** *(Completed January 2025)*
- ✅ **Dynamic Version Reading**: Automatically reads version from package.json at runtime (handles both dev and dist)
- ✅ **NPX Detection**: Smart detection of NPX usage via environment variables (`npm_execpath`, `npm_command`)
- ✅ **Context-Aware Help**: Different help text for NPX vs direct usage with appropriate commands
- ✅ **Browser Installation Guidance**: Clear instructions for Chromium installation with NPX-specific commands
- ✅ **MCP Integration Examples**: Complete configuration examples for Cursor and Claude Desktop
- ✅ **Enhanced Error Handling**: Specific error messages for browser installation, permissions, and unknown arguments
- ✅ **Environment Variables Documentation**: Complete list of configuration options in help text
- ✅ **Repository Links**: Dynamic GitHub URLs from package.json for documentation and issue reporting

### **Existing MCP Ecosystem Analysis**
- **Similar Packages Identified**:
  - `@executeautomation/playwright-mcp-server` - General Playwright MCP server
  - `@playwright/mcp` - Official Playwright MCP tools
  - `@agentdeskai/browser-tools-mcp` - Browser tools MCP server
  - `playwright-mcp` - Basic Playwright ModelContext integration
- **Differentiation**: BrowserLoop focuses specifically on screenshot capture with advanced cookie authentication and automatic file reloading
- **Market Position**: Unique positioning for authenticated screenshot scenarios

## Next Steps & Future Enhancements

### **Potential Areas for Enhancement**
1. **Advanced Selectors**: XPath support for complex element targeting
2. **Batch Operations**: Multiple screenshots in single MCP request
3. **Storage Backends**: Alternative storage beyond base64 responses
4. **Performance Monitoring**: Enhanced metrics and alerting
5. **Additional Formats**: Support for additional image formats (PDF, SVG)

### **Maintenance Priorities**
1. **Dependency Updates**: Keep Playwright and other dependencies current
2. **Security Updates**: Regular security audit and updates
3. **Performance Optimization**: Monitor and optimize screenshot capture times
4. **Documentation**: Keep API documentation and examples current

## Current State Summary

**BrowserLoop is production-ready with comprehensive automatic cookie file reloading capabilities and NPX distribution preparation underway.**

**Key Achievements**:
- ✅ **Zero-downtime authentication updates** via automatic file watching
- ✅ **Reliable MCP protocol communication** with file-based logging
- ✅ **Modern authentication support** compatible with browser extensions
- ✅ **Comprehensive testing** with 100% test success rate
- ✅ **Enterprise-ready deployment** with Docker and CI/CD pipeline
- ✅ **NPX Distribution Ready**: Package name `browserloop` available on npm registry

### **NPX Workflow Testing** *(Completed January 2025)*
- ✅ **Local Package Testing**: Created and tested package tarball with `npm pack`
- ✅ **Global Installation Simulation**: Verified npx workflow with `npm install -g`
- ✅ **NPX Environment Detection**: Tested NPX-specific help text and version output
- ✅ **MCP Server Startup**: Verified silent startup without console interference
- ✅ **Comprehensive Test Suite**: Added 10 automated tests for NPX workflow verification
- ✅ **Help Command Testing**: Verified context-aware help for NPX vs direct usage
- ✅ **Version Command Testing**: Verified NPX detection in version output
- ✅ **Error Handling Testing**: Verified graceful handling of invalid arguments
- ✅ **Package Size Optimization**: 75.5 kB tarball with 336.1 kB unpacked size
- ✅ **CI Integration**: Added `test:e2e:npx` script to comprehensive test suite

### **NPX Documentation** *(Completed January 2025)*
- ✅ **README NPX Section**: Comprehensive Quick Start section with NPX as "recommended" approach
- ✅ **Browser Installation Guide**: Clear `npx playwright install chromium` instructions
- ✅ **MCP Configuration Examples**: Ready-to-use NPX configuration for Cursor and Claude Desktop
- ✅ **Troubleshooting Commands**: NPX-specific diagnostic commands throughout documentation
- ✅ **No Additional Documentation Needed**: Existing README.md provides complete NPX coverage

### **Security Audit** *(Completed January 2025)*
- ✅ **Dependencies Vulnerability Scan**: 0 vulnerabilities found via `npm audit`
- ✅ **Package Integrity Check**: 75.5 kB optimized package with only essential files
- ✅ **Source Code Security Review**: No hardcoded secrets, safe file operations, proper input validation
- ✅ **Cookie Security Implementation**: Data sanitization, secure defaults, comprehensive validation
- ✅ **Browser Security**: Official Playwright distribution, proper context isolation
- ✅ **Security Documentation**: Comprehensive SECURITY_AUDIT.md with findings and recommendations
- ✅ **Security Validation**: All automated security checks pass
- ✅ **Risk Assessment**: LOW risk level, APPROVED for production deployment

**Current Development Focus**: Security audit completed with excellent results. Ready for next step: publish to npm registry with proper versioning.

**The system now provides a seamless experience for AI agents working with authenticated web applications, automatically adapting to authentication changes without requiring manual intervention or server restarts.**
