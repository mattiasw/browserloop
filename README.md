# BrowserLoop

[![CI/CD Pipeline](https://github.com/[USERNAME]/browserloop/actions/workflows/ci.yml/badge.svg)](https://github.com/[USERNAME]/browserloop/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server for taking screenshots of web pages using Playwright. This tool allows AI agents to automatically capture and analyze screenshots for UI verification tasks.

## Features

- 📸 High-quality screenshot capture using Playwright
- 🌐 Support for localhost and remote URLs
- 🐳 Docker containerization for consistent environments
- ⚡ PNG, JPEG, and WebP format support with configurable quality
- 🛡️ Secure non-root container execution
- 🤖 Full MCP protocol integration with AI development tools
- 🔧 Configurable viewport sizes and capture options
- 📱 Full page and element-specific screenshot capture
- ⚡ TypeScript with Biome for fast development
- 🧪 Comprehensive testing with Node.js built-in test runner

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for browser environment)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd browserloop

# Install dependencies
npm install

# Build the project
npm run build
```

### MCP Configuration

Add to your MCP configuration file (e.g. `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": [
        "/absolute/path/to/browserloop/dist/src/index.js"
      ],
      "description": "Screenshot capture server for web pages using Playwright"
    }
  }
}
```

**Replace `/absolute/path/to/browserloop/` with your actual project path.**

### Basic Usage

Once configured, you can use natural language commands in your AI tool:

```
Take a screenshot of https://example.com
Take a screenshot of https://example.com with width 1920 and height 1080
Take a screenshot of https://example.com in JPEG format with 95% quality
Take a full page screenshot of https://example.com
Take a screenshot of http://localhost:3000 to verify the UI changes
```

## Documentation

- **[Complete API Reference](docs/API.md)** - Detailed parameter documentation, examples, and response formats
- **[Project Context](PROJECT_CONTEXT.md)** - Architecture decisions and technical details

### Key API Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `url` | string | Target URL to capture (required) | - |
| `width` | number | Viewport width (200-4000) | 1280 |
| `height` | number | Viewport height (200-4000) | 720 |
| `format` | string | Image format (webp, png, jpeg) | webp |
| `quality` | number | Image quality (1-100) | 80 |
| `fullPage` | boolean | Capture full page | false |
| `selector` | string | CSS selector for element capture | - |

📖 **See [docs/API.md](docs/API.md) for complete parameter details, usage examples, and configuration options.**

## Configuration

### Environment Variables

Configure defaults using environment variables in your MCP configuration:

```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": ["/path/to/browserloop/dist/src/index.js"],
      "env": {
        "BROWSERLOOP_DEFAULT_WIDTH": "1920",
        "BROWSERLOOP_DEFAULT_HEIGHT": "1080",
        "BROWSERLOOP_DEFAULT_FORMAT": "png",
        "BROWSERLOOP_DEFAULT_QUALITY": "90",
        "BROWSERLOOP_USER_AGENT": "BrowserLoop Bot 1.0"
      }
    }
  }
}
```

**📖 See [docs/API.md#configuration](docs/API.md#configuration) for all configuration options.**

## Development

### Common Commands

```bash
# Start the server
npm start

# Run all tests
npm test

# Format and lint code
npm run check

# Clean build
npm run build:clean

# Docker development
npm run docker:dev
```

### Testing

```bash
# Run specific test suites
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests

# Check Node.js version compatibility
npm run check-node
```

### Docker Support

```bash
# Build and run with Docker
npm run docker:build
npm run docker:run

# Development with Docker
npm run docker:dev
npm run docker:dev:logs
npm run docker:dev:stop
```

## Troubleshooting

### Server Not Starting
1. Check Node.js version: `node --version` (requires 20+)
2. Verify build: `npm run build`
3. Test manually: `npm start`

### Network Issues
- For localhost screenshots, ensure the development server is running
- Check Docker networking if using containers

### Configuration Issues
- Ensure the path to `dist/src/index.js` is correct in your MCP config
- Check that the project is built with `npm run build`

**📖 See [docs/API.md#error-handling](docs/API.md#error-handling) for detailed error troubleshooting.**

## Project Structure

```
├── src/                  # Source code
│   ├── index.ts         # Main entry point
│   ├── mcp-server.ts    # MCP server implementation
│   ├── screenshot-service.ts # Playwright screenshot service
│   ├── config.ts        # Configuration management
│   ├── types.ts         # TypeScript definitions
│   └── test-utils.ts    # Test utilities
├── tests/               # Test files
│   ├── e2e/            # End-to-end tests
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test fixtures
├── docs/               # Documentation
│   └── API.md          # Complete API reference
├── docker/             # Docker configuration
├── dist/               # Build output
└── plan.md             # Development plan
```

## Contributing

1. **Formatting**: Uses Biome for linting and formatting
2. **Testing**: Add tests for new features, ensure all tests pass
3. **Documentation**: Update docs for API changes

```bash
# Before submitting changes
npm run check           # Lint and format
npm test               # Run all tests
npm run build          # Verify build
```

## License

MIT

---

**🚀 Ready to start? Check out the [Complete API Reference](docs/API.md) for detailed usage examples!**
