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
