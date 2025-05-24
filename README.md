# BrowserLoop

A Model Context Protocol (MCP) server for taking screenshots of web pages using Playwright. This tool allows AI agents to automatically capture and analyze screenshots for UI verification tasks.

## Features

- 📸 High-quality screenshot capture using Playwright
- 🌐 Support for localhost and remote URLs
- 🐳 Docker containerization for consistent environments
- ⚡ WebP and PNG format support with configurable quality
- 🛡️ Secure non-root container execution
- 🤖 Full MCP protocol integration with AI development tools
- 🔧 Configurable viewport sizes and capture options
- ⚡ TypeScript with Biome for fast development
- 🧪 Comprehensive testing with Node.js built-in test runner

## Installation

### Prerequisites

- Node.js 20+
- Docker (for browser environment)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd browserloop

# Install dependencies
npm install

# Build the project
npm run build
```

## MCP Configuration

Add to your MCP configuration file (usually `~/.cursor/mcp-config.json`):

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

### Alternative: NPM Command Configuration

```json
{
  "mcpServers": {
    "browserloop": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/absolute/path/to/browserloop",
      "description": "Screenshot capture server for web pages using Playwright"
    }
  }
}
```

### Configuration with Environment Variables

To customize default settings, use the `env` property in your MCP configuration:

```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": [
        "/absolute/path/to/browserloop/dist/src/index.js"
      ],
      "env": {
        "BROWSERLOOP_DEFAULT_WIDTH": "1920",
        "BROWSERLOOP_DEFAULT_HEIGHT": "1080",
        "BROWSERLOOP_DEFAULT_FORMAT": "png",
        "BROWSERLOOP_USER_AGENT": "Mozilla/5.0 (Custom Bot)",
        "BROWSERLOOP_RETRY_COUNT": "5"
      },
      "description": "Screenshot capture server for web pages using Playwright"
    }
  }
}
```

## Configuration

Browserloop supports configuration through environment variables using the `env` property in your MCP configuration. All settings have sensible defaults and are optional.

### Environment Variables

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `BROWSERLOOP_DEFAULT_WIDTH` | Default viewport width | `1280` | 200-4000 |
| `BROWSERLOOP_DEFAULT_HEIGHT` | Default viewport height | `720` | 200-4000 |
| `BROWSERLOOP_DEFAULT_FORMAT` | Default image format | `webp` | `webp`, `png` |
| `BROWSERLOOP_DEFAULT_QUALITY` | Default image quality | `80` | 1-100 |
| `BROWSERLOOP_DEFAULT_TIMEOUT` | Default timeout (ms) | `30000` | 1000-120000 |
| `BROWSERLOOP_DEFAULT_WAIT_NETWORK_IDLE` | Wait for network idle | `true` | `true`, `false`, `1`, `0`, `yes`, `no` |
| `BROWSERLOOP_USER_AGENT` | Custom user agent string | (none) | Any valid user agent string |
| `BROWSERLOOP_RETRY_COUNT` | Number of retries for failed screenshots | `3` | 0-10 |
| `BROWSERLOOP_RETRY_DELAY` | Delay between retries (ms) | `1000` | 100-10000 |

## Usage in AI Tools

Once configured, you can use natural language commands:

```
Take a screenshot of https://example.com
Take a screenshot of https://example.com with width 1920 and height 1080
Take a full page screenshot of https://example.com
Take a screenshot of http://localhost:3000 to verify the UI changes
```

### Tool Parameters

- **url** (required): Target URL to capture
- **width** (optional): Viewport width (default: 1280)
- **height** (optional): Viewport height (default: 720)
- **format** (optional): Image format - 'webp' or 'png' (default: 'webp')
- **quality** (optional): Image quality 1-100 for WebP (default: 80)
- **waitForNetworkIdle** (optional): Wait for network idle (default: true)
- **timeout** (optional): Timeout in milliseconds (default: 30000)
- **fullPage** (optional): Take full page screenshot (default: false)

## Development

```bash
# Start the server
npm start

# Watch mode for development
npm run dev

# Format and lint code
npm run check

# Clean build
npm run build:clean
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Check Node.js version compatibility
npm run check-node
```

## Docker Support

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

## Project Structure

```
├── src/                  # Source code
│   ├── index.ts         # Main entry point
│   ├── mcp-server.ts    # MCP server implementation
│   ├── screenshot-service.ts # Playwright screenshot service
│   ├── types.ts         # TypeScript definitions
│   └── test-utils.ts    # Test utilities
├── tests/               # Test files
│   ├── e2e/            # End-to-end tests
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test fixtures
├── docker/             # Docker configuration
├── dist/               # Build output
└── plan.md             # Development plan
```

## License

MIT
