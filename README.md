# BrowserLoop

[![CI/CD Pipeline](https://github.com/mattiasw/browserloop/actions/workflows/ci.yml/badge.svg)](https://github.com/mattiasw/browserloop/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/browserloop.svg)](https://www.npmjs.com/package/browserloop)
[![npm downloads](https://img.shields.io/npm/dm/browserloop.svg)](https://www.npmjs.com/package/browserloop)

A Model Context Protocol (MCP) server for taking screenshots of web pages using Playwright. This tool allows AI agents to automatically capture and analyze screenshots for UI verification or other tasks.

**NOTE:** Almost all of the code in this repository has been auto-generated. That means you should probably not trust it too much. That being said, it does work and I'm using it myself.

**NOTE:** If the documentation is incorrect, please let me know or send a PR. If you too want to use a code generation tool to update the code for this project, `PROJECT_CONTEXT.md` has been used as context to give a good overview of the various parts of the project. It might be a bit messy now but it's a good starting point and you're welcome to update it.

## Features

- 📸 High-quality screenshot capture using Playwright
- 🌐 Support for localhost and remote URLs
- 🍪 Cookie-based authentication for protected pages
- 🐳 Docker containerization for consistent environments
- ⚡ PNG, JPEG, and WebP format support with configurable quality
- 🛡️ Secure non-root container execution
- 🤖 Full MCP protocol integration with AI development tools
- 🔧 Configurable viewport sizes and capture options
- 📱 Full page and element-specific screenshot capture
- ⚡ TypeScript with Biome for fast development
- 🧪 Comprehensive testing with Node.js built-in test runner

## Quick Start

### 📦 NPX Usage (Recommended)

**The easiest way to get started - no installation required!**

```bash
# Install Chromium browser (one-time setup)
npx playwright install chromium

# Test that BrowserLoop works
npx browserloop@latest --version
```

**That's it!** The latest version of BrowserLoop will be downloaded and executed automatically. Perfect for MCP users who want zero-maintenance screenshots.

#### MCP Configuration

Add BrowserLoop to your MCP configuration file (e.g. `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "browserloop": {
      "command": "npx",
      "args": ["-y", "browserloop@latest"],
      "description": "Screenshot capture server for web pages using Playwright"
    }
  }
}
```

**💡 Using `@latest` ensures you always get the newest features and bug fixes automatically.**

#### 🚀 One-Click Install for Cursor

Add BrowserLoop to Cursor with a single click using this deeplink:

**[🔗 Add BrowserLoop to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=BrowserLoop&config=eyJjb21tYW5kIjoibnB4IC15IGJyb3dzZXJsb29wQGxhdGVzdCIsImRlc2NyaXB0aW9uIjoiU2NyZWVuc2hvdCBjYXB0dXJlIHNlcnZlciBmb3Igd2ViIHBhZ2VzIHVzaW5nIFBsYXl3cmlnaHQifQ==)**

This deeplink will automatically configure BrowserLoop in your Cursor MCP settings with the optimal configuration using npx and the latest version.

**Prerequisites:** Make sure you have Chromium installed first:
```bash
npx playwright install chromium
```

### Browser Installation Requirements

**🚨 Critical:** BrowserLoop requires Chromium to be installed via Playwright before it can take screenshots.

#### First-Time Setup (All Users)

**Install Chromium browser:**
```bash
npx playwright install chromium
```

**Verify installation:**
```bash
# Check Playwright installation
npx playwright --version

# Test BrowserLoop (if using NPX)
npx browserloop@latest --version
```



### 🐳 Docker Alternative

**For containerized environments:**

```bash
# Pull and run with Docker
docker run --rm --network host browserloop

# Or use docker-compose for development
git clone <repository-url>
cd browserloop
docker-compose -f docker/docker-compose.yml up
```

### 💻 Development Installation

**For contributors or advanced users who want to build from source:**

```bash
# Clone the repository
git clone <repository-url>
cd browserloop

# Install dependencies
npm install

# Install Playwright browsers (required for screenshots)
npx playwright install chromium
# OR use the convenient script:
npm run install-browsers

# Build the project
npm run build
```

#### MCP Configuration for Development

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
- **[📚 Complete API Reference](docs/API.md)** - Detailed parameter documentation, examples, and response formats

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
| `BROWSERLOOP_DEBUG` | `false` | Enable debug logging to `/tmp/browserloop.log` |
| `BROWSERLOOP_ENABLE_METRICS` | `true` | Enable error metrics collection |
| `BROWSERLOOP_DISABLE_FILE_WATCHING` | `false` | Disable automatic cookie file monitoring |

#### Debug Logging

When `BROWSERLOOP_DEBUG=true`, detailed logs are written to `/tmp/browserloop.log` including:
- Cookie file loading and automatic refresh events
- File watching status and recreation events
- Screenshot operation details
- Configuration changes and errors

**Monitor logs in real-time:**
```bash
tail -f /tmp/browserloop.log
```

**Note**: Logs are written to a file (not console) to maintain compatibility with MCP's stdio protocol.

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

### Common Issues

**"Executable doesn't exist" Error**
```bash
# Install Chromium browser (most common fix)
npx playwright install chromium
```

**MCP Server Not Starting**
1. **Test manually**: `npx browserloop@latest --version`
2. **Verify requirements**:
   - Node.js 20+: `node --version`
   - npm: `npm --version`
   - npx: `npx --version`
3. **Check MCP config JSON syntax**

**Screenshots Show Login Pages**
- Use cookie authentication (see [Cookie Authentication Guide](docs/COOKIE_AUTHENTICATION.md))
- Check cookie expiration and domain settings

**Network/Connection Issues**
- Test with external URLs first: `https://example.com`
- For localhost: ensure your dev server is running
- Check firewall settings

**Updating BrowserLoop**
- **NPX**: Automatically uses latest version with `@latest` - no manual updates needed!
- **Check current version**: `npx browserloop@latest --version`

### Quick Diagnosis

```bash
# Test complete setup
node --version && npm --version
npx playwright --version

# Test BrowserLoop
npx browserloop@latest --version
```

**Enable debug logging:**
Set `BROWSERLOOP_DEBUG=true` in your MCP config and monitor `/tmp/browserloop.log`

**📖 See [docs/API.md#error-handling](docs/API.md#error-handling) for detailed troubleshooting.**

## License

BrowserLoop is licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

### What this means:

- ✅ **Free to use** - Personal and commercial use allowed
- ✅ **Free to modify** - You can adapt the code to your needs
- ✅ **Free to distribute** - Share copies with others
- ✅ **Patent protection** - Contributors provide patent grants
- ⚠️ **Copyleft** - Derivative works must also be open source under AGPL-3.0
- ⚠️ **Network clause** - If you run a modified version on a server, you must provide source code to users

### For Network Services

**Important**: If you modify BrowserLoop and run it as a network service (e.g., web app, API server, or cloud service), the AGPL requires you to:

1. Offer the complete source code to all users of your service
2. Include a prominent notice about how users can access the source
3. Use a compatible license for the entire service

### License Files

- [LICENSE](LICENSE) - Full license text

### Commercial Use

Organizations can use BrowserLoop under the AGPL for commercial purposes, but must comply with the copyleft requirements. If you need to keep modifications private, consider:

1. Using BrowserLoop without modifications
2. Contributing improvements back to the community
3. Contacting the maintainers about potential alternative licensing arrangements

For questions about licensing, please open an issue or contact the maintainers.
