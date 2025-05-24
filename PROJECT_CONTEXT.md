# Project Context & Architecture

## Project Goals

**Primary Goal**: Create an MCP (Model Context Protocol) server for taking screenshots of web pages using Playwright, allowing AI agents to automatically verify UI tasks by analyzing screenshots.

**Key Use Cases**:
- AI agent verification of localhost development servers
- Automated UI testing and validation
- Screenshot capture for web development workflows
- Integration with AI development tools for enhanced capabilities

**Why This Matters**: AI agents need to be able to "see" the results of UI changes they make. Screenshots provide visual feedback for AI-driven development tasks.

## Technical Architecture Decisions

### Core Technology Stack
- **Node.js 20+ with TypeScript**: Modern JavaScript runtime with strong typing
- **Playwright**: Browser automation for reliable screenshot capture
- **Sharp**: High-performance image processing for format conversion
- **Docker**: Containerized deployment for consistency across environments
- **MCP Protocol**: Standard protocol for AI tool integration

### Key Technical Decisions Made

**1. Docker-First Approach**
- **Why**: Ensures consistent browser environment across different systems
- **Benefits**: Eliminates "works on my machine" issues with Playwright browsers
- **Implementation**: Multi-stage Dockerfile with full Playwright dependencies

**2. Biome over ESLint + Prettier**
- **Why**: User preference for faster tooling
- **Configuration**: Comprehensive linting and formatting rules in `biome.json`

**3. Multiple Image Format Support (PNG, JPEG, WebP)**
- **Why**: Flexibility for different use cases and performance requirements
- **PNG**: Lossless quality for UI screenshots with text and sharp edges
- **JPEG**: Efficient compression for photographic content and gradients
- **WebP**: Best compression with good quality for modern browsers
- **Implementation**: Sharp-based image processing with quality-first capture strategy

**4. Node.js Built-in Test Runner**
- **Why**: No external test dependencies, modern Node.js feature
- **Benefits**: Faster setup, fewer dependencies to manage

**5. Host Networking in Docker**
- **Why**: Direct access to localhost development servers
- **Fallback**: Port mapping configuration for environments where host networking doesn't work

**6. Non-root Container Security**
- **Implementation**: Dedicated 'playwright' user in container
- **Benefits**: Security best practices, proper file permissions

**7. Quality-First Image Processing**
- **Strategy**: Always capture as PNG (highest quality), then convert to requested format
- **Benefits**: Maintains maximum image quality while supporting all formats
- **Implementation**: Sharp library for reliable cross-platform image conversion

## Current Implementation State

### Completed Components ✅

**Project Structure**:
```
browserloop/
├── src/
│   ├── index.ts (MCP server entry point) ✅
│   ├── mcp-server.ts (MCP server implementation) ✅
│   ├── screenshot-service.ts (Core Playwright Service) ✅
│   ├── types.ts (screenshot interfaces)
│   └── test-utils.ts (testing utilities)
├── tests/
│   ├── unit/ (test utilities + screenshot service tests) ✅
│   ├── integration/ (MCP server tests with response format verification) ✅
│   ├── e2e/ (Docker integration tests) ✅
│   └── fixtures/ (HTML test pages)
├── docker/
│   ├── Dockerfile (production)
│   └── docker-compose.yml (development)
└── config files (package.json, tsconfig.json, biome.json)
```

**Dependencies Installed**:
- Production: `@modelcontextprotocol/sdk@^1.0.6`, `playwright@^1.48.2`, `sharp@^0.34.2`, `zod@^3.25.28`
- Development: TypeScript, Biome, Node.js types

**Docker Environment**:
- Production image: Node.js 20 + Playwright + Chromium browser
- Development: Live code mounting, persistent browser cache
- Security: Non-root playwright user
- E2E tests: 3 passing integration tests ✅

**Core Playwright Service** ✅:
- ScreenshotService class with full functionality
- Support for different viewport sizes (configurable width/height)
- PNG, JPEG, and WebP format support with Sharp-based conversion
- Configurable page load strategies (networkidle/domcontentloaded)
- Comprehensive error handling and resource cleanup
- Full page and viewport screenshot capabilities
- Element-specific screenshot capture with CSS selectors
- Browser session management with proper initialization
- Timeout handling and retry logic

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
- 31 unit tests passing (including ImageProcessor tests)
- 32 integration tests passing (including JPEG format support)
- 7 E2E format support tests passing
- 4 built server E2E tests passing
- Test fixtures with beautiful HTML pages
- Screenshot validation utilities
- Response format compliance testing
- Comprehensive format conversion testing

### Configuration Cleanup ✅

**Removed Unnecessary Files**:
- `install-global.sh` (global installation approach discontinued)
- `mcp-config.json` and `mcp-config-npm.json` (example configs removed)
- `CURSOR_CONFIG.md` (content moved to README.md)

**Simplified Configuration**:
- README.md now contains essential MCP setup instructions
- Removed NODE_ENV requirement (not used in code)
- Corrected package.json bin path to `dist/src/index.js`

### Current Status: PRODUCTION READY ✅

The MCP screenshot server is now fully functional and ready for production use:

1. **MCP Protocol Compliance**: Fully compliant with MCP specification 2025-03-26
2. **Response Format**: Correct image content type with metadata
3. **Error Handling**: Proper error responses with isError field
4. **Clean Communication**: No console output interference
5. **Comprehensive Testing**: All 74 tests passing across all suites
6. **Multiple Format Support**: PNG, JPEG, and WebP with quality controls
7. **Documentation**: Complete setup and usage instructions

## Development Environment Setup

### Prerequisites
- Node.js 20+
- Docker with compose support
- Git

### Quick Start Commands
```bash
# Install dependencies
npm install

# Build project
npm run build

# Start MCP server
npm start

# Run all tests
npm test

# Docker development
npm run docker:dev
```

### MCP Configuration
Add to your AI tool's MCP config:
```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": ["/path/to/browserloop/dist/src/index.js"],
      "description": "Screenshot capture server for web pages using Playwright"
    }
  }
}
```

## User's Coding Standards & Preferences

### Code Style (from custom instructions)
- **Functions**: Use full function declarations, not arrow functions (except inline callbacks)
- **Quotes**: Single quotes for strings
- **Semicolons**: End lines with semicolons
- **Line length**: Wrap at 80 characters
- **Function order**: Define functions after their usage location
- **Comments**: Minimal commenting - use clear names and code structure instead

### Formatting
- Prettier-style formatting via Biome
- Consistent indentation and spacing
- Clean import organization

## Future Enhancement Opportunities

While the core functionality is complete, these optional enhancements could be added:

- [ ] **Performance & Reliability**
  - [ ] Browser session reuse for better performance
  - [ ] Connection pooling for high-volume usage
  - [ ] Retry logic for network failures
  - [ ] Browser crash recovery

- [ ] **Documentation & Deployment**
  - [ ] Performance optimization guide
  - [ ] CI/CD pipeline setup
  - [ ] NPM package publishing

## Environment Notes

- **User OS**: Linux 6.11.0-26-generic
- **Node.js**: v20.17.0 (requires build step for TypeScript)
- **Shell**: /usr/bin/bash
- **Docker**: Compose v2 (new syntax: `docker compose`)

## Project File Structure Context

### Key Files to Understand
- `src/mcp-server.ts`: Complete MCP server implementation with proper response format
- `src/screenshot-service.ts`: Core Playwright service with all screenshot functionality
- `src/types.ts`: Screenshot interfaces and type definitions
- `tests/integration/mcp-server.test.ts`: MCP server tests including response format verification
- `README.md`: Complete setup and usage documentation
- `docker/Dockerfile`: Production container with Playwright
- `docker/docker-compose.yml`: Development environment

### Important Implementation Details
- Using ES modules (`"type": "module"` in package.json)
- TypeScript compilation to `dist/` directory with proper source structure
- Biome configuration in `biome.json`
- Node.js version compatibility checks in `check-node.js`
- Clean JSON-RPC communication without console output interference

This project is now production-ready and provides a complete MCP screenshot server solution.
