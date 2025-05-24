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

### 🔐 Cookie Authentication

BrowserLoop supports cookie-based authentication for capturing screenshots of login-protected pages during development:

```
Take a screenshot of http://localhost:3000/admin/dashboard using these cookies: [{"name":"connect.sid","value":"s:session-id.signature","domain":"localhost"}]
```

**📖 For cookie extraction methods and development workflows, see:**

**📖 [Cookie Authentication Guide](docs/COOKIE_AUTHENTICATION.md)**

Common development use cases:
- Local development servers with authentication
- Staging environment testing
- API documentation tools (Swagger, GraphQL Playground)
- Custom web applications during development
- Admin panels and protected routes

## Documentation

- **[🔐 Cookie Authentication Guide](docs/COOKIE_AUTHENTICATION.md)** - Complete guide for authenticated screenshots
- **[🐛 Debugging Guide](docs/DEBUGGING.md)** - Troubleshooting cookie issues and general debugging
- **[📚 Complete API Reference](docs/API.md)** - Detailed parameter documentation, examples, and response formats
- **[🔧 Project Context](PROJECT_CONTEXT.md)** - Architecture decisions and technical details

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

BrowserLoop can be configured using environment variables:

### Basic Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSERLOOP_DEFAULT_WIDTH` | `1280` | Default viewport width (200-4000) |
| `BROWSERLOOP_DEFAULT_HEIGHT` | `720` | Default viewport height (200-4000) |
| `BROWSERLOOP_DEFAULT_FORMAT` | `webp` | Default image format (`webp`, `png`, `jpeg`) |
| `BROWSERLOOP_DEFAULT_QUALITY` | `80` | Default image quality (0-100) |
| `BROWSERLOOP_DEFAULT_TIMEOUT` | `30000` | Default timeout in milliseconds |
| `BROWSERLOOP_USER_AGENT` | - | Custom user agent string |

### Authentication Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSERLOOP_DEFAULT_COOKIES` | - | Default cookies as file path or JSON string (see [Cookie Authentication Guide](docs/COOKIE_AUTHENTICATION.md)) |

### Performance & Reliability

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSERLOOP_RETRY_COUNT` | `3` | Number of retry attempts for failed operations |
| `BROWSERLOOP_RETRY_DELAY` | `1000` | Delay between retries in milliseconds |

### Logging & Debugging

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSERLOOP_DEBUG` | `false` | Enable debug logging |
| `BROWSERLOOP_SILENT` | `true` | Disable console output in production |
| `BROWSERLOOP_ENABLE_METRICS` | `true` | Enable error metrics collection |

### Example MCP Configuration with Default Cookies

#### Method 1: JSON File (Recommended)

Create a cookies file:
```json
// ~/.config/browserloop/cookies.json
[
  {
    "name": "connect.sid",
    "value": "s:your-dev-session.signature",
    "domain": "localhost"
  }
]
```

Reference in MCP config:
```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": ["dist/src/mcp-server.js"],
      "env": {
        "BROWSERLOOP_DEFAULT_COOKIES": "/home/username/.config/browserloop/cookies.json",
        "BROWSERLOOP_DEFAULT_FORMAT": "webp",
        "BROWSERLOOP_DEFAULT_QUALITY": "85"
      }
    }
  }
}
```

#### Method 2: JSON String (Legacy)

```json
{
  "mcpServers": {
    "browserloop": {
      "command": "node",
      "args": ["dist/src/mcp-server.js"],
      "env": {
        "BROWSERLOOP_DEFAULT_COOKIES": "[{\"name\":\"session_id\",\"value\":\"your_session_value\",\"domain\":\"example.com\"},{\"name\":\"auth_token\",\"value\":\"your_auth_token\"}]",
        "BROWSERLOOP_DEFAULT_FORMAT": "webp",
        "BROWSERLOOP_DEFAULT_QUALITY": "85"
      }
    }
  }
}
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

### Cookie Issues
- Can't pass cookies via MCP protocol? Use default cookies configuration
- Screenshots show login pages? Check cookie expiration and domain settings
- Need to debug cookie loading? Enable debug logging

**📖 See [docs/API.md#error-handling](docs/API.md#error-handling) for detailed error troubleshooting.**
