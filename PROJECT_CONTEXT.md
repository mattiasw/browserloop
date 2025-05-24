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

**3. WebP Image Format**
- **Why**: Better compression than PNG (smaller file sizes for MCP transport)
- **Alternative**: Base64 encoding for MCP protocol compatibility

**4. Node.js Built-in Test Runner**
- **Why**: No external test dependencies, modern Node.js feature
- **Benefits**: Faster setup, fewer dependencies to manage

**5. Host Networking in Docker**
- **Why**: Direct access to localhost development servers
- **Fallback**: Port mapping configuration for environments where host networking doesn't work

**6. Non-root Container Security**
- **Implementation**: Dedicated 'playwright' user in container
- **Benefits**: Security best practices, proper file permissions

## Current Implementation State

### Completed Components ✅

**Project Structure**:
```
browserloop/
├── src/
│   ├── index.ts (screenshot service demo)
│   ├── screenshot-service.ts (Core Playwright Service) ✅
│   ├── types.ts (screenshot interfaces)
│   └── test-utils.ts (testing utilities)
├── tests/
│   ├── unit/ (test utilities + screenshot service tests) ✅
│   ├── integration/ (MCP server tests - placeholder)
│   ├── e2e/ (Docker integration tests) ✅
│   └── fixtures/ (HTML test pages)
├── docker/
│   ├── Dockerfile (production)
│   └── docker-compose.yml (development)
└── config files (package.json, tsconfig.json, biome.json)
```

**Dependencies Installed**:
- Production: `@modelcontextprotocol/sdk@^1.0.6`, `playwright@^1.48.2`
- Development: TypeScript, Biome, Node.js types

**Docker Environment**:
- Production image: Node.js 20 + Playwright + Chromium browser
- Development: Live code mounting, persistent browser cache
- Security: Non-root playwright user
- E2E tests: 3 passing integration tests ✅

**Core Playwright Service** ✅:
- ScreenshotService class with full functionality
- Support for different viewport sizes (configurable width/height)
- WebP and PNG format support with automatic conversion
- Configurable page load strategies (networkidle/domcontentloaded)
- Comprehensive error handling and resource cleanup
- Full page and viewport screenshot capabilities
- Browser session management with proper initialization
- Timeout handling and retry logic

**Testing Infrastructure**:
- 14 unit tests (test utilities + screenshot service) ✅
- 8 integration test placeholders
- 3 E2E Docker tests ✅
- Test fixtures with beautiful HTML pages
- Screenshot validation utilities

### Not Yet Implemented ❌

**MCP Server Implementation**:
- MCP protocol server setup
- Tool registration and schema definition
- Request/response handling
- Parameter validation for MCP tools

**Configuration & Advanced Features**:
- Environment variable support
- Configurable quality settings for different formats
- Element-specific screenshot capture
- Batch screenshot operations
- Screenshot comparison utilities

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

# Start development environment
npm run docker:dev

# Run all tests
npm run test:all

# Access container shell
npm run docker:dev:shell
```

### Docker Commands
- `npm run docker:build` - Build production image
- `npm run docker:dev` - Start development container
- `npm run docker:dev:stop` - Stop development container
- `npm run docker:dev:logs` - View container logs
- `npm run test:e2e` - Test Docker integration

### Test Commands
- `npm run test` - Unit + integration tests (compiled)
- `npm run test:unit` - Unit tests only
- `npm run test:e2e` - Docker integration tests
- `npm run test:all` - All tests including E2E

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

## Next Phase: MCP Server Implementation

### Immediate Tasks
1. Set up MCP protocol server with stdio transport
2. Define screenshot tool schema and parameters
3. Implement tool handler for screenshot requests
4. Add base64 image encoding for MCP responses
5. Add parameter validation and defaults

### Technical Considerations
- MCP protocol compliance and message handling
- Tool registration and capability advertisement
- Request validation and error responses
- Integration with existing ScreenshotService
- Configuration management for AI development tools

## Environment Notes

- **User OS**: Linux 6.11.0-26-generic
- **Node.js**: v20.17.0 (requires build step for TypeScript)
- **Shell**: /usr/bin/bash
- **Docker**: Compose v2 (new syntax: `docker compose`)

## Project File Structure Context

### Key Files to Understand
- `src/types.ts`: Screenshot interfaces and type definitions
- `src/screenshot-service.ts`: Core Playwright Service implementation
- `src/test-utils.ts`: Testing utilities with base64 validation
- `tests/unit/screenshot-service.test.ts`: Screenshot service unit tests
- `tests/fixtures/simple-page.html`: Beautiful test page for screenshots
- `docker/Dockerfile`: Production container with Playwright
- `docker/docker-compose.yml`: Development environment

### Important Implementation Details
- Using ES modules (`"type": "module"` in package.json)
- TypeScript compilation to `dist/` directory
- Biome configuration in `biome.json`
- Node.js version compatibility checks in `check-node.js`

This context should provide everything needed to continue development seamlessly in a new chat session.
