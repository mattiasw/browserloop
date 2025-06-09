# BrowserLoop Project Context

## Project Overview

**BrowserLoop** is a production-ready Model Context Protocol (MCP) server for automated web page screenshot capture and console log reading. It enables AI agents to programmatically capture screenshots and read browser console logs for UI verification, authenticated page testing, and development workflows.

### Key Characteristics
- **Version**: 1.0.6 (published on npm)
- **License**: GNU Affero General Public License v3.0 or later (AGPL-3.0+)
- **Language**: TypeScript with Node.js 20+
- **Architecture**: MCP server with Playwright browser automation
- **Status**: **Production Ready** with comprehensive testing and CI/CD pipeline

### Core Value Proposition
- **Seamless AI Integration**: Native MCP protocol support for Cursor, Claude Desktop, and other AI tools
- **Authenticated Screenshots**: Advanced cookie-based authentication with automatic file monitoring
- **Console Log Reading**: Capture browser console logs for debugging and analysis
- **Developer-Friendly**: Hot-reloading cookie files, comprehensive debugging, and Docker containerization
- **Enterprise-Ready**: Comprehensive error handling, retry logic, and security hardening

## Architecture Overview

### Core System Components

#### 1. **MCP Protocol Layer** (`src/mcp-server.ts`)
- **Purpose**: Model Context Protocol server implementation with two tools: `screenshot` and `read_console`
- **Key Features**: Tool registration, parameter validation, stdio transport
- **Critical Design**: Zero console output to maintain MCP protocol compatibility
- **Lines**: 487 lines with comprehensive input validation

#### 2. **Screenshot Engine** (`src/screenshot-service.ts`)
- **Purpose**: Core screenshot capture using Playwright Chromium
- **Key Features**: Dynamic configuration refresh, cookie injection, multiple capture modes
- **Critical Design**: Fetches fresh configuration for each request (no stale data)
- **Lines**: 1343 lines with comprehensive error handling and retry logic

#### 3. **Console Log Service** (`src/console-service.ts`)
- **Purpose**: Browser console log capture and sanitization
- **Key Features**: Real-time log collection, sensitive data masking, configurable log levels
- **Critical Design**: Listens for console events before navigation to capture all logs
- **Lines**: 809 lines with comprehensive filtering and security features

#### 4. **Dynamic Configuration System** (`src/config.ts`)
- **Purpose**: Environment-based configuration with real-time file monitoring
- **Key Features**:
  - **Automatic File Watching**: Monitors cookie files with fs.watch() and 1000ms debouncing
  - **Watcher Recreation**: Survives editor file replacement (rename events)
  - **Atomic Updates**: Configuration replacement prevents partial updates
  - **Security**: Never logs sensitive cookie values
- **Lines**: 783 lines with comprehensive file watching and error handling

#### 5. **File-Based Logging System** (`src/file-logger.ts`)
- **Purpose**: Debug logging that doesn't interfere with MCP stdio protocol
- **Key Features**: Writes to `/tmp/browserloop.log`, automatic log path detection
- **Critical Design**: Completely silent console operation for MCP compatibility
- **Lines**: 113 lines with robust file system error handling

#### 6. **Advanced Cookie System** (`src/cookie-utils.ts`)
- **Purpose**: Authentication cookie management with modern browser support
- **Key Features**:
  - **Browser Extension Compatibility**: Direct import from Cookie Editor, EditThisCookie
  - **Modern Cookie Support**: `__Host-`, `__Secure-` prefixes, RFC 6265 compliance
  - **Domain Filtering**: Automatic filtering by domain for multi-site cookie files
  - **Security**: Comprehensive sanitization and validation
- **Lines**: 303 lines with extensive validation and filtering logic

## Key Environment Variables

### **Authentication**
- `BROWSERLOOP_DEFAULT_COOKIES`: Path to cookie file or JSON string for default authentication
- `BROWSERLOOP_DISABLE_FILE_WATCHING`: Set to "true" to disable automatic file monitoring

### **Debugging & Development**
- `BROWSERLOOP_DEBUG`: Enable debug logging to `/tmp/browserloop.log`
- `BROWSERLOOP_ENABLE_METRICS`: Enable error metrics collection (default: true)

### **Console Log Configuration**
- `BROWSERLOOP_CONSOLE_LOG_LEVELS`: Comma-separated list of log levels to capture (default: "log,info,warn,error,debug")
- `BROWSERLOOP_SANITIZE_LOGS`: Enable/disable sensitive data sanitization (default: true)
- `BROWSERLOOP_MAX_LOG_SIZE`: Maximum total log size in bytes (default: 1048576 - 1MB)

### **Performance & Reliability**
- `BROWSERLOOP_RETRY_COUNT`: Number of retry attempts (default: 3)
- `BROWSERLOOP_RETRY_DELAY`: Delay between retries in milliseconds (default: 1000)

### **Image Configuration**
- `BROWSERLOOP_DEFAULT_FORMAT`: Default image format - webp, png, jpeg (default: webp)
- `BROWSERLOOP_DEFAULT_QUALITY`: Default image quality 0-100 (default: 80)
- `BROWSERLOOP_DEFAULT_WIDTH`: Default viewport width 200-4000 (default: 1280)
- `BROWSERLOOP_DEFAULT_HEIGHT`: Default viewport height 200-4000 (default: 720)

## File Structure & Key Components

### **Entry Points & Core**
```
src/index.ts              # Application entry point with CLI support (344 lines)
src/mcp-server.ts          # MCP protocol implementation (487 lines)
src/screenshot-service.ts  # Core screenshot engine (1343 lines)
src/console-service.ts     # Console log capture service (809 lines)
src/config.ts             # Dynamic configuration system (783 lines)
```

### **Support Systems**
```
src/types.ts              # Comprehensive TypeScript definitions (539 lines)
src/file-logger.ts        # File-based logging system (113 lines)
src/cookie-utils.ts       # Advanced cookie management (303 lines)
src/logger.ts             # Structured logging and metrics (397 lines)
src/cache.ts              # Caching system (247 lines)
src/performance.ts        # Performance monitoring (285 lines)
src/image-processor.ts    # Image processing with Sharp (91 lines)
src/test-utils.ts         # Testing utilities (212 lines)
```

### **Configuration & Deployment**
```
docker/Dockerfile         # Multi-stage production build
biome.json                # Linting and formatting configuration
tsconfig.json             # TypeScript compilation settings
package.json              # Dependencies and scripts (v1.0.6)
```

### **Comprehensive Testing**
```
tests/unit/               # Unit tests for all core components
tests/integration/        # MCP protocol integration tests
tests/e2e/                # End-to-end tests including Docker and NPX workflow
tests/performance/        # Performance benchmarking
tests/fixtures/           # Test HTML pages and mock data
```

## Current Production Features

### ✅ **Core Functionality** (100% Complete)
- **Screenshot Capture**: High-quality capture with Playwright Chromium
- **Console Log Reading**: Real-time browser console log capture with sanitization
- **Multiple Formats**: WebP, PNG, JPEG with quality control
- **Flexible Capture**: Viewport, full-page, and element-specific screenshots
- **MCP Integration**: Complete Model Context Protocol implementation with two tools

### ✅ **Authentication & Security** (100% Complete)
- **Cookie Authentication**: Complete injection system with security hardening
- **Modern Cookie Support**: `__Host-`, `__Secure-`, browser extension compatibility
- **Domain Filtering**: Automatic filtering for multi-site cookie files
- **Console Log Sanitization**: Masks sensitive data while preserving message structure
- **Security**: No sensitive data logging, comprehensive input validation

### ✅ **Configuration & Reliability** (100% Complete)
- **Environment Configuration**: All parameters configurable via environment variables
- **Automatic File Watching**: Real-time cookie file monitoring with watcher recreation
- **Error Handling**: Comprehensive error categories with recovery strategies
- **Retry Logic**: Configurable retry count and delay with exponential backoff

### ✅ **Deployment & Operations** (100% Complete)
- **NPM Distribution**: Published as `browserloop` package on npm registry
- **Global Installation**: `npm install -g browserloop` for permanent installation
- **NPX Support**: `npx -y browserloop@latest` for on-demand execution
- **Docker Integration**: Multi-stage build with security best practices
- **CI/CD Pipeline**: GitHub Actions with automated npm publishing
- **File-Based Logging**: Debug logging to `/tmp/browserloop.log`

## Major Technical Achievements

### 🔄 **Automatic Cookie File Reloading** *(Signature Feature)*
Real-time file monitoring system that automatically detects cookie file changes and refreshes configuration within 1-2 seconds, eliminating the need for manual MCP server restarts when authentication cookies expire.

### 🛡️ **MCP Protocol Compatibility** *(Critical Infrastructure)*
Complete separation of debug logging from MCP transport using file-based logging (`/tmp/browserloop.log`) to prevent interference with JSON-based stdio communication.

### 🍪 **Modern Cookie Authentication** *(Advanced Feature)*
Comprehensive cookie support system with browser extension import, modern standards (`__Host-`, `__Secure-` prefixes), domain intelligence, and multi-site support.

### 📄 **Console Log Reading** *(Latest Feature)*
Advanced browser console log capture with real-time collection, sensitive data sanitization, configurable log levels, and optimized timing strategy for comprehensive log coverage.

## Testing & Quality Assurance

### **Test Coverage**
- **Unit Tests**: Comprehensive coverage of all core functionality
- **Integration Tests**: MCP protocol compliance verification
- **E2E Tests**: Format support, Docker integration, and NPX workflow testing
- **Performance Tests**: Benchmarking and optimization verification

### **Quality Metrics**
- **All Tests Passing**: 100% test success rate maintained
- **Zero Console Output**: MCP protocol compliance verified
- **File Watching Coverage**: Dedicated tests for automatic reloading
- **Error Handling**: Comprehensive coverage of failure scenarios

## Usage in AI Development

### **Supported AI Tools**
- **Cursor IDE**: Primary integration via `~/.cursor/mcp.json`
- **Claude Desktop**: MCP settings configuration
- **Custom AI Tools**: Direct MCP protocol integration

### **AI Agent Capabilities Enabled**
- **UI Verification**: Compare implementations against designs
- **Console Debugging**: Capture JavaScript errors and debug information
- **Development Testing**: Capture authenticated areas during development
- **Responsive Testing**: Verify UI across different viewport sizes
- **Visual Documentation**: Create visual records of development progress

### **Example MCP Configuration**
```json
{
  "mcpServers": {
    "browserloop": {
      "command": "npx",
      "args": ["-y", "browserloop@latest"],
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
- `npm run version:patch/minor/major`: Automated versioning and publishing

### **Development Guidelines**
- **TypeScript First**: Strict typing throughout codebase
- **Error Handling**: Comprehensive categorization and recovery
- **Security Focus**: No sensitive data in logs, proper validation
- **MCP Compatibility**: Silent operation maintaining protocol integrity
- **Testing**: Comprehensive test coverage for all new features

### **Debugging Workflow**
1. Set `BROWSERLOOP_DEBUG=true` in environment
2. Monitor logs: `tail -f /tmp/browserloop.log`
3. Test cookie file changes in real-time
4. Verify automatic configuration refresh

## Technical Dependencies

### **Runtime Dependencies**
- **@modelcontextprotocol/sdk**: MCP protocol implementation (^1.12.1)
- **playwright**: Browser automation (^1.48.2)
- **sharp**: Image processing and optimization (^0.34.2)
- **zod**: Runtime type validation and schema enforcement (^3.25.56)

### **Development Dependencies**
- **@biomejs/biome**: Fast linting and formatting (^1.9.4)
- **typescript**: Type system and compilation (^5.7.2)
- **@types/node**: Node.js type definitions (^22.15.30)
- **husky** + **lint-staged**: Git hooks for quality enforcement

### **System Requirements**
- **Node.js 20+**: Runtime environment
- **Docker**: For containerized deployment (optional)
- **Chromium**: Browser engine (auto-installed via Playwright)

## Current Status & Next Steps

**BrowserLoop is production-ready and fully operational with both screenshot and console log reading capabilities.**

### **Recent Completions**
- ✅ Console log reading tool implementation with sanitization
- ✅ NPM package distribution with automated CI/CD
- ✅ Comprehensive security audit with excellent results
- ✅ Complete test coverage including NPX workflow verification

### **Potential Future Enhancements**
- **Advanced Selectors**: XPath support for complex element targeting
- **Batch Operations**: Multiple screenshots in single MCP request
- **Storage Backends**: Alternative storage beyond base64 responses
- **Performance Monitoring**: Enhanced metrics and alerting
- **Additional Formats**: Support for PDF, SVG output formats

### **Maintenance Priorities**
1. **Dependency Updates**: Keep Playwright and other dependencies current
2. **Security Updates**: Regular security audit and updates
3. **Performance Optimization**: Monitor and optimize capture times
4. **Documentation**: Keep API documentation and examples current

**The system provides a seamless experience for AI agents working with authenticated web applications, automatically adapting to authentication changes without requiring manual intervention or server restarts.**
