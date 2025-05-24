# BrowserLoop API Reference

## Overview

BrowserLoop is a Model Context Protocol (MCP) server that provides screenshot capture capabilities using Playwright. This document describes the complete API, including parameters, response formats, configuration options, and error handling.

## MCP Tool: `screenshot`

The `screenshot` tool captures screenshots of web pages and returns them as base64-encoded images.

### Tool Schema

```json
{
  "name": "screenshot",
  "description": "Capture a screenshot of a web page using Playwright",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "format": "uri",
        "description": "Target URL to capture (required)"
      },
      "width": {
        "type": "number",
        "minimum": 200,
        "maximum": 4000,
        "description": "Viewport width in pixels (optional, default: 1280)"
      },
      "height": {
        "type": "number",
        "minimum": 200,
        "maximum": 4000,
        "description": "Viewport height in pixels (optional, default: 720)"
      },
      "format": {
        "type": "string",
        "enum": ["webp", "png", "jpeg"],
        "description": "Image format (optional, default: 'webp')"
      },
      "quality": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "description": "Image quality for WebP/JPEG (optional, default: 80)"
      },
      "waitForNetworkIdle": {
        "type": "boolean",
        "description": "Wait for network idle before capture (optional, default: true)"
      },
      "timeout": {
        "type": "number",
        "minimum": 1000,
        "maximum": 120000,
        "description": "Timeout in milliseconds (optional, default: 30000)"
      },
      "fullPage": {
        "type": "boolean",
        "description": "Capture full page instead of viewport (optional, default: false)"
      },
      "userAgent": {
        "type": "string",
        "description": "Custom user agent string (optional)"
      },
      "selector": {
        "type": "string",
        "description": "CSS selector for element-specific screenshot (optional)"
      },
      "cookies": {
        "description": "Cookies for authentication (optional)",
        "oneOf": [
          {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "value": { "type": "string" },
                "domain": { "type": "string" },
                "path": { "type": "string" },
                "httpOnly": { "type": "boolean" },
                "secure": { "type": "boolean" },
                "expires": { "type": "number" },
                "sameSite": { "type": "string", "enum": ["Strict", "Lax", "None"] }
              },
              "required": ["name", "value"]
            }
          },
          {
            "type": "string",
            "description": "JSON string containing cookie array"
          }
        ]
      }
    },
    "required": ["url"]
  }
}
```

## Parameters

### Required Parameters

#### `url` (string)
- **Description**: Target URL to capture
- **Format**: Valid URL (http:// or https://)
- **Examples**:
  - `"https://example.com"`
  - `"http://localhost:3000"`
  - `"https://github.com/user/repo"`

### Optional Parameters

#### `width` (number)
- **Description**: Viewport width in pixels
- **Range**: 200-4000
- **Default**: 1280 (configurable via `BROWSERLOOP_DEFAULT_WIDTH`)
- **Examples**: `1920`, `1366`, `375`

#### `height` (number)
- **Description**: Viewport height in pixels
- **Range**: 200-4000
- **Default**: 720 (configurable via `BROWSERLOOP_DEFAULT_HEIGHT`)
- **Examples**: `1080`, `768`, `667`

#### `format` (string)
- **Description**: Output image format
- **Values**: `"webp"`, `"png"`, `"jpeg"`
- **Default**: `"webp"` (configurable via `BROWSERLOOP_DEFAULT_FORMAT`)
- **Format Characteristics**:
  - **PNG**: Lossless compression, best for UI screenshots with text and sharp edges
  - **JPEG**: Lossy compression, best for photographic content and gradients
  - **WebP**: Modern format with superior compression and quality

#### `quality` (number)
- **Description**: Image quality for lossy formats (WebP, JPEG)
- **Range**: 1-100 (higher = better quality, larger file)
- **Default**: 80 (configurable via `BROWSERLOOP_DEFAULT_QUALITY`)
- **Note**: Ignored for PNG format (always lossless)

#### `waitForNetworkIdle` (boolean)
- **Description**: Wait for network requests to complete before capturing
- **Default**: `true` (configurable via `BROWSERLOOP_DEFAULT_WAIT_NETWORK_IDLE`)
- **Note**: `false` captures immediately after DOM content loaded

#### `timeout` (number)
- **Description**: Maximum time to wait for page load (milliseconds)
- **Range**: 1000-120000 (1 second to 2 minutes)
- **Default**: 30000 (configurable via `BROWSERLOOP_DEFAULT_TIMEOUT`)

#### `fullPage` (boolean)
- **Description**: Capture entire page height instead of just viewport
- **Default**: `false`
- **Note**: Ignores `height` parameter when `true`

#### `userAgent` (string)
- **Description**: Custom user agent string for the request
- **Default**: Browser default (configurable via `BROWSERLOOP_USER_AGENT`)
- **Examples**:
  - `"Mozilla/5.0 (Mobile Bot)"`
  - `"Custom Screenshot Bot 1.0"`

#### `selector` (string)
- **Description**: CSS selector to capture specific element instead of page
- **Examples**:
  - `"#main-content"`
  - `".hero-section"`
  - `"[data-testid='component']"`
- **Note**: Takes precedence over `fullPage` parameter

#### `cookies` (array or string)
- **Description**: Cookies for authentication
- **Details**:
  - **Array of cookie objects**: Direct JavaScript/JSON objects
  - **JSON string**: Stringified array of cookie objects

## Response Format

### Success Response

```json
{
  "content": [
    {
      "type": "image",
      "data": "base64-encoded-image-data",
      "mimeType": "image/webp"
    },
    {
      "type": "text",
      "text": "{\"metadata\": {...}}"
    }
  ],
  "isError": false
}
```

#### Image Content
- **type**: Always `"image"`
- **data**: Base64-encoded image data (without data URL prefix)
- **mimeType**: MIME type corresponding to format
  - `"image/png"` for PNG format
  - `"image/jpeg"` for JPEG format
  - `"image/webp"` for WebP format

#### Metadata Content
The text content contains JSON metadata with the following structure:

```json
{
  "metadata": {
    "width": 1280,
    "height": 720,
    "timestamp": 1640995200000,
    "url": "https://example.com",
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "configuration": {
      "retryCount": 3,
      "userAgent": "default"
    }
  }
}
```

### Error Response

```json
{
  "content": [{
    "type": "text",
    "text": "Screenshot capture failed: Error message"
  }],
  "isError": true
}
```

## Usage Examples

### Basic Screenshot

```javascript
// Natural language: "Take a screenshot of https://example.com"
{
  "url": "https://example.com"
}
```

### High-Resolution PNG

```javascript
// Natural language: "Take a high-quality PNG screenshot of the site"
{
  "url": "https://example.com",
  "width": 1920,
  "height": 1080,
  "format": "png"
}
```

### Mobile Viewport

```javascript
// Natural language: "Take a mobile screenshot"
{
  "url": "https://example.com",
  "width": 375,
  "height": 667,
  "format": "webp",
  "quality": 90
}
```

### Full Page Capture

```javascript
// Natural language: "Take a full page screenshot"
{
  "url": "https://example.com",
  "fullPage": true,
  "format": "png"
}
```

### Element-Specific Screenshot

```javascript
// Natural language: "Take a screenshot of the navigation menu"
{
  "url": "https://example.com",
  "selector": "nav.main-navigation",
  "format": "png"
}
```

### Localhost Development

```javascript
// Natural language: "Capture my local development server"
{
  "url": "http://localhost:3000",
  "width": 1440,
  "height": 900,
  "waitForNetworkIdle": false,
  "timeout": 10000
}
```

### Custom User Agent

```javascript
// Natural language: "Take a screenshot with mobile user agent"
{
  "url": "https://example.com",
  "width": 375,
  "height": 667,
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
}
```

## Configuration

BrowserLoop supports extensive configuration through environment variables in your MCP configuration.

### Environment Variables

| Variable | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `BROWSERLOOP_DEFAULT_WIDTH` | number | `1280` | 200-4000 | Default viewport width |
| `BROWSERLOOP_DEFAULT_HEIGHT` | number | `720` | 200-4000 | Default viewport height |
| `BROWSERLOOP_DEFAULT_FORMAT` | string | `"webp"` | webp, png, jpeg | Default image format |
| `BROWSERLOOP_DEFAULT_QUALITY` | number | `80` | 1-100 | Default image quality |
| `BROWSERLOOP_DEFAULT_TIMEOUT` | number | `30000` | 1000-120000 | Default timeout (ms) |
| `BROWSERLOOP_DEFAULT_WAIT_NETWORK_IDLE` | boolean | `true` | true/false | Wait for network idle |
| `BROWSERLOOP_USER_AGENT` | string | (none) | any | Custom user agent |
| `BROWSERLOOP_RETRY_COUNT` | number | `3` | 0-10 | Number of retries |
| `BROWSERLOOP_RETRY_DELAY` | number | `1000` | 100-10000 | Retry delay (ms) |

### MCP Configuration Example

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
        "BROWSERLOOP_USER_AGENT": "BrowserLoop Bot 1.0",
        "BROWSERLOOP_RETRY_COUNT": "5",
        "BROWSERLOOP_RETRY_DELAY": "2000"
      }
    }
  }
}
```

## Error Handling

### Common Errors

#### Invalid URL
```
Screenshot capture failed: Invalid URL format
```
- **Cause**: Malformed URL provided
- **Solution**: Ensure URL includes protocol (http:// or https://)

#### Network Timeout
```
Screenshot capture failed: Navigation timeout of 30000ms exceeded
```
- **Cause**: Page took too long to load
- **Solutions**:
  - Increase `timeout` parameter
  - Set `waitForNetworkIdle: false`
  - Check if URL is accessible

#### Element Not Found
```
Screenshot capture failed: Element not found: .selector
```
- **Cause**: CSS selector doesn't match any elements
- **Solution**: Verify selector exists on the page

#### Invalid Dimensions
```
Screenshot capture failed: Width must be at least 200
```
- **Cause**: Parameter outside valid range
- **Solution**: Use values within specified ranges

#### Browser Launch Failed
```
Screenshot capture failed: Failed to launch browser
```
- **Cause**: Browser dependencies missing or Docker issues
- **Solutions**:
  - Ensure Docker is running
  - Rebuild Docker image: `npm run docker:build`
  - Check browser dependencies in container

### Retry Logic

BrowserLoop automatically retries failed screenshot attempts:

- **Default**: 3 retries with 1000ms delay
- **Configurable**: Via `BROWSERLOOP_RETRY_COUNT` and `BROWSERLOOP_RETRY_DELAY`
- **Exponential backoff**: Not implemented (fixed delay)
- **Retryable errors**: Network timeouts, temporary browser issues
- **Non-retryable errors**: Invalid parameters, element not found

## Response Processing

### Base64 Handling

The image data is returned as pure base64 without data URL prefix:

```javascript
// Returned format
"data": "iVBORw0KGgoAAAANSUhEUgAA..."

// To use as data URL
const dataUrl = `data:${response.content[0].mimeType};base64,${response.content[0].data}`;

// To decode as buffer (Node.js)
const buffer = Buffer.from(response.content[0].data, 'base64');
```

### Metadata Parsing

The metadata is provided as JSON string in the text content:

```javascript
const metadata = JSON.parse(response.content[1].text).metadata;
console.log(`Captured ${metadata.width}x${metadata.height} image at ${new Date(metadata.timestamp)}`);
```

## Performance Considerations

### Format Selection

- **PNG**: Largest files, highest quality, best for UI/text
- **JPEG**: Medium files, good quality, best for photos
- **WebP**: Smallest files, excellent quality, best overall choice

### Quality Settings

- **80**: Good balance of quality and file size (default)
- **90-95**: High quality for important screenshots
- **60-70**: Acceptable quality for previews/thumbnails
- **100**: Maximum quality (WebP/JPEG only)

### Viewport Size Impact

- Larger viewports increase processing time and file size
- Consider using standard resolutions: 1280x720, 1920x1080, 375x667
- Full page screenshots can be significantly larger

### Network Optimization

- Set `waitForNetworkIdle: false` for faster captures of static content
- Reduce `timeout` for known fast-loading pages
- Use localhost URLs when possible for development workflows

## Development Integration

### CI/CD Usage

```bash
# Environment variables for CI
export BROWSERLOOP_DEFAULT_TIMEOUT=10000
export BROWSERLOOP_RETRY_COUNT=1
export BROWSERLOOP_DEFAULT_FORMAT=png

# Start server
npm start
```

### Testing Integration

```javascript
// Example test usage
const screenshot = await mcpClient.callTool('screenshot', {
  url: 'http://localhost:3000',
  format: 'png',
  waitForNetworkIdle: false
});

expect(screenshot.isError).toBe(false);
expect(screenshot.content[0].mimeType).toBe('image/png');
```

## Cookie Authentication

BrowserLoop supports cookie-based authentication for capturing screenshots of login-protected pages. This feature enables you to capture authenticated content by injecting session cookies into the browser context.

**📖 For comprehensive cookie extraction guides, browser extension recommendations, and step-by-step instructions for popular sites, see the [Cookie Authentication Guide](COOKIE_AUTHENTICATION.md).**

### Cookie Parameter

The `cookies` parameter accepts either:
1. **Array of cookie objects**: Direct JavaScript/JSON objects
2. **JSON string**: Stringified array of cookie objects

#### Cookie Object Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ | Cookie name |
| `value` | string | ✅ | Cookie value |
| `domain` | string | ❌ | Cookie domain (auto-derived from URL if not provided) |
| `path` | string | ❌ | Cookie path (defaults to '/') |
| `httpOnly` | boolean | ❌ | HTTP-only flag |
| `secure` | boolean | ❌ | Secure flag |
| `expires` | number | ❌ | Expiration timestamp |
| `sameSite` | string | ❌ | SameSite policy ('Strict', 'Lax', 'None') |

### Example Usage

#### Array Format
```javascript
{
  "url": "https://app.example.com/dashboard",
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123xyz789",
      "domain": "app.example.com",
      "path": "/",
      "httpOnly": true,
      "secure": true
    },
    {
      "name": "auth_token",
      "value": "eyJhbGciOiJIUzI1NiIs...",
      "httpOnly": true
    }
  ]
}
```

#### JSON String Format
```javascript
{
  "url": "https://app.example.com/dashboard",
  "cookies": "[{\"name\":\"session_id\",\"value\":\"abc123xyz789\",\"domain\":\"app.example.com\"}]"
}
```

**See the [Cookie Authentication Guide](COOKIE_AUTHENTICATION.md) for detailed extraction instructions and more examples.**

## 🔒 Security Considerations

### Cookie Security

**⚠️ CRITICAL SECURITY WARNINGS:**

1. **Sensitive Data Exposure**: Cookie values contain authentication tokens and session IDs. Never log, store, or expose these values in error messages or debugging output.

2. **Memory Safety**: BrowserLoop automatically clears cookie values from memory after use, but you should also ensure your AI tool/application doesn't persist sensitive cookie data.

3. **Domain Validation**: Cookies are validated against the target URL domain to prevent cookie injection attacks. Only cookies matching the target domain are accepted.

4. **Transport Security**: Always use HTTPS URLs when dealing with authentication cookies to prevent interception.

### Security Features

BrowserLoop implements multiple security measures:

#### Input Validation
- **Cookie limits**: Maximum 50 cookies per request
- **Size limits**: Cookie values limited to 4KB (RFC compliance)
- **Character validation**: Cookie names and domains restricted to safe characters
- **Pattern detection**: Automatic rejection of suspicious patterns (script tags, JavaScript URLs, etc.)

#### Memory Protection
- **Automatic cleanup**: Cookie values are overwritten in memory after use
- **Error sanitization**: Error messages never expose actual cookie values
- **Secure logging**: Only metadata (lengths, counts) are logged, never actual values

#### Domain Security
- **Domain matching**: Cookies are validated against target URL domain
- **Subdomain support**: Allows `.domain.com` patterns for legitimate use cases
- **localhost handling**: Special handling for development environments (localhost, 127.0.0.1)

### Best Practices

#### 1. Cookie Extraction
Use browser developer tools or browser extensions to extract cookies:

```javascript
// In browser console (for manual extraction)
document.cookie.split(';').map(c => {
  const [name, value] = c.trim().split('=');
  return { name, value };
});
```

#### 2. Secure Storage
- **Never commit**: Don't store cookies in version control
- **Environment variables**: Use secure environment storage for sensitive tokens
- **Temporary use**: Delete or rotate authentication cookies regularly

#### 3. Error Handling
```javascript
// Good: Handle authentication failures gracefully
try {
  const result = await screenshot({ url, cookies });
} catch (error) {
  if (error.message.includes('Cookie injection failed')) {
    // Handle authentication error without exposing cookie values
    console.log('Authentication failed - check cookie validity');
  }
}
```

#### 4. Development vs Production
```javascript
// Development: More lenient domain validation
cookies: [{ name: 'dev_session', value: 'xxx', domain: 'localhost' }]

// Production: Strict domain matching
cookies: [{ name: 'session', value: 'xxx', domain: 'app.example.com', secure: true }]
```

### Security Limitations

#### What BrowserLoop CANNOT Protect Against:
- **AI tool data persistence**: If your AI tool stores cookie data, BrowserLoop cannot control that
- **Network interception**: Use HTTPS to prevent cookie interception
- **Client-side vulnerabilities**: Ensure your extraction method is secure
- **Cookie lifetime**: BrowserLoop doesn't manage cookie expiration

#### Recommended Additional Security:
- **Token rotation**: Regularly refresh authentication tokens
- **Minimal permissions**: Use cookies with least-privilege access
- **Session monitoring**: Monitor for unauthorized access to authenticated accounts
- **Audit logging**: Log authentication attempts (without cookie values)
