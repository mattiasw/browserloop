# BrowserLoop

A Model Context Protocol (MCP) server for taking screenshots of web pages using Playwright. This tool allows AI agents to automatically capture and analyze screenshots for UI verification tasks.

## Features

- 📸 High-quality screenshot capture using Playwright
- 🌐 Support for localhost and remote URLs
- 🐳 Docker containerization for consistent environments
- ⚡ WebP compression for efficient image transfer
- 🛡️ Secure non-root container execution
- 🤖 Full MCP protocol integration with AI development tools
- 🖼️ WebP format support for efficient image transfer
- 🔧 Configurable viewport sizes and capture options
- ⚡ TypeScript with Biome for fast development
- 🚀 Ready for Node.js native TypeScript support
- 🧪 Comprehensive testing with Node.js built-in test runner

## Installation

### Prerequisites

- Node.js 18+ (22.6+ recommended for native TypeScript support)
- Docker (for browser environment)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd browserloop

# Install dependencies
npm install

# Build the project (current approach)
npm run build
```

## Development

### Current Node.js versions (v18-v22.5)

```bash
# Start with build step
npm start

# Watch mode for development
npm run dev

# Format and lint code
npm run check
```

### Node.js v22.6+ (Native TypeScript Support)

```bash
# Direct TypeScript execution (requires --experimental-strip-types)
npm run start:ts

# Watch mode with direct TypeScript execution
npm run dev:ts
```

### Node.js v23.6+ (Default TypeScript Support)

```bash
# Direct TypeScript execution (no flags needed)
npm run start:native
```

Based on the [Node.js TypeScript documentation](https://nodejs.org/en/learn/typescript/run-natively), future versions will support TypeScript natively without compilation.

## Testing

The project uses Node.js's built-in test runner for fast, dependency-free testing.

### Running Tests

```bash
# Run all tests (builds first)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Check Node.js version compatibility
npm run check-node
```

### Direct TypeScript Testing (Node.js 22.6+)

```bash
# Run tests directly from TypeScript source
npm run test:ts
npm run test:unit:ts
npm run test:integration:ts
```

### Test Structure

```
tests/
├── unit/                    # Unit tests
│   └── test-utils.test.ts  # Test utility functions
├── integration/            # Integration tests
│   └── mcp-server.test.ts  # MCP server integration
└── fixtures/               # Test fixtures
    └── simple-page.html    # Simple HTML page for testing
```

## Usage

### With AI Development Tools

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "browserloop": {
      "command": "npx",
      "args": ["browserloop"],
      "env": {}
    }
  }
}
```

### Script Reference

| Script | Description | Node.js Version |
|--------|-------------|-----------------|
| `npm start` | Build and run (current default) | 18+ |
| `npm run start:ts` | Direct TS execution with flag | 22.6+ |
| `npm run start:native` | Direct TS execution (no flag) | 23.6+ |
| `npm run dev` | Watch mode with build | 18+ |
| `npm run dev:ts` | Watch mode direct TS | 22.6+ |
| `npm test` | Run all tests | 18+ |
| `npm run test:ts` | Run tests from TS source | 22.6+ |

## Project Structure

```
├── src/                  # Source code
│   ├── index.ts         # Main entry point
│   ├── types.ts         # TypeScript definitions
│   └── test-utils.ts    # Test utilities
├── tests/               # Test files
│   ├── e2e/            # End-to-end tests
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test fixtures
├── docker/             # Docker configuration
├── dist/               # Build output (current approach)
└── plan.md             # Development plan
```

## TODO

See `plan.md` for the complete implementation roadmap.

## License

MIT
