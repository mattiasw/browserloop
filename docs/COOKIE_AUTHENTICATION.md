# Cookie Authentication Guide

## 🎉 **NEW: Browser Extension Cookie Support**

**BrowserLoop now directly supports cookie formats exported from browser extensions!** No manual editing required.

### ✅ **Direct Browser Extension Import**

If you export cookies using browser extensions like [Cookie Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm), [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg), or similar tools, you can use the exported JSON directly:

```json
[
  {
    "name": "__Host-next-auth.csrf-token",
    "value": "actual-token-value",
    "domain": "app.example.com",
    "path": "/",
    "expires": -1,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  },
  {
    "name": "__Secure-next-auth.session-token",
    "value": "eyJhbGciOiJkaXIi...",
    "domain": "app.example.com",
    "path": "/",
    "expires": 1750704030.825311,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  }
]
```

**✅ What BrowserLoop automatically handles:**
- ✅ **Session cookies** (`expires: -1`) work correctly
- ✅ **Float timestamps** (like `1750704030.825311`) are handled properly
- ✅ **All security attributes** (`httpOnly`, `secure`, `sameSite`) are respected
- ✅ **Cookie prefixes** (`__Host-`, `__Secure-`) work with proper security enforcement
- ✅ **Domain validation** follows RFC 6265 (parent domain cookies supported)

**💡 Usage:**
```bash
# Save browser extension export as cookies.json
export BROWSERLOOP_DEFAULT_COOKIES="/path/to/cookies.json"

# Or use directly in MCP requests (pass the JSON array)
```

## Overview

BrowserLoop supports cookie-based authentication for capturing screenshots of login-protected pages during development. This is especially useful for testing authenticated areas of your applications.

## Quick Start

### Basic Usage

```javascript
{
  "url": "http://localhost:3000/dashboard",
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123xyz",
      "domain": "localhost"
    }
  ]
}
```

### Default Cookies Configuration

Set default cookies in your MCP configuration for persistent authentication:

#### Method 1: JSON File (Recommended)

Create a JSON file with your cookies:

```json
// ~/.config/browserloop/cookies.json
[
  {
    "name": "connect.sid",
    "value": "s:your-dev-session.signature",
    "domain": "localhost"
  },
  {
    "name": "csrf_token",
    "value": "your-csrf-token-here",
    "domain": "localhost",
    "path": "/admin"
  }
]
```

Then reference the file in your MCP configuration:

```json
{
  "mcpServers": {
    "browserloop": {
      "env": {
        "BROWSERLOOP_DEFAULT_COOKIES": "/home/username/.config/browserloop/cookies.json"
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
        "BROWSERLOOP_DEFAULT_COOKIES": "[{\"name\":\"dev_session\",\"value\":\"your_session_value\",\"domain\":\"localhost\"}]"
      }
    }
  }
}
```

**Benefits of File Path Method:**
- ✅ **Easy to edit** - Use your editor with JSON syntax highlighting
- ✅ **No escaping** - No need to escape quotes in JSON
- ✅ **Version control** - Can version control your cookie files
- ✅ **Validation** - Easy to validate JSON syntax
- ✅ **Readable** - Much cleaner MCP configuration

## Development Use Cases

### Local Development Server

Testing your app's authenticated routes:

```javascript
// Extract cookies from your dev environment
{
  "url": "http://localhost:3000/admin/dashboard",
  "cookies": [
    {
      "name": "connect.sid",
      "value": "s:your-session-id.signature",
      "domain": "localhost"
    }
  ]
}
```

### Staging Environment

```javascript
{
  "url": "https://staging.example.com/protected-area",
  "cookies": [
    {
      "name": "auth_token",
      "value": "eyJhbGciOiJIUzI1NiIs...",
      "domain": "staging.example.com",
      "secure": true
    }
  ]
}
```

### API Documentation Tools

Testing tools like Swagger UI or GraphQL Playground:

```javascript
{
  "url": "http://localhost:4000/graphql",
  "cookies": [
    {
      "name": "graphql_session",
      "value": "dev_token_123",
      "domain": "localhost"
    }
  ]
}
```

## Cookie Extraction for Development

### Method 1: Browser Dev Tools

1. **Login to your development app** in your browser
2. **Open Developer Tools** (F12)
3. **Go to Application tab** → **Cookies** → **localhost** (or your domain)
4. **Copy the session cookie values**

### Method 2: Browser Console

Run this in your browser console on your development site:

```javascript
// Extract all cookies for current domain
JSON.stringify(
  document.cookie.split(';').map(cookie => {
    const [name, value] = cookie.trim().split('=');
    return {
      name: name,
      value: value,
      domain: window.location.hostname
    };
  }).filter(c => c.name && c.value)
);
```

### Method 3: From Network Tab

1. **Open Network tab** in dev tools
2. **Make a request** to your authenticated endpoint
3. **Check request headers** for Cookie header
4. **Copy the cookie values**

## Cookie Formats

### Array of Objects (Recommended)

```javascript
{
  "url": "http://localhost:3000/admin",
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123",
      "domain": "localhost"
    },
    {
      "name": "csrf_token",
      "value": "xyz789",
      "domain": "localhost",
      "path": "/admin"
    }
  ]
}
```

### JSON String

```javascript
{
  "url": "http://localhost:3000/admin",
  "cookies": "[{\"name\":\"session_id\",\"value\":\"abc123\",\"domain\":\"localhost\"}]"
}
```

### Cookie Properties

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `name` | ✅ | Cookie name | `"session_id"` |
| `value` | ✅ | Cookie value | `"abc123xyz"` |
| `domain` | ❌ | Domain (auto-derived from URL) | `"localhost"` |
| `path` | ❌ | Path (defaults to "/") | `"/admin"` |
| `secure` | ❌ | HTTPS only | `true` |
| `httpOnly` | ❌ | HTTP only | `true` |

## Common Development Scenarios

### Express.js with express-session

```javascript
// Typical Express session cookie
{
  "name": "connect.sid",
  "value": "s:session-id.signature",
  "domain": "localhost"
}
```

### JWT Authentication

```javascript
// JWT stored in cookie
{
  "name": "jwt_token",
  "value": "eyJhbGciOiJIUzI1NiIs...",
  "domain": "localhost",
  "httpOnly": true
}
```

### Custom Auth Cookie

```javascript
// Custom authentication cookie
{
  "name": "auth_session",
  "value": "user123_authenticated",
  "domain": "localhost"
}
```

### Development with Docker

```javascript
// When your app runs in Docker
{
  "url": "http://localhost:8080/dashboard",
  "cookies": [
    {
      "name": "docker_session",
      "value": "container_session_123",
      "domain": "localhost"
    }
  ]
}
```

## Troubleshooting

### Common Issues

#### Screenshots show login page instead of authenticated content

**Solutions:**
1. **Check cookie expiration** - Re-login and extract fresh cookies
2. **Verify domain matches** - Use exact domain from URL
3. **Include all required cookies** - Some apps need multiple cookies

#### "Cookie validation failed" error

**Solutions:**
1. **Fix domain mismatch**:
   ```javascript
   // ✅ Correct for localhost:3000
   "domain": "localhost"

   // ❌ Wrong
   "domain": "localhost:3000"
   ```

2. **Check JSON format**:
   ```javascript
   // ✅ Valid JSON
   "[{\"name\":\"session\",\"value\":\"123\"}]"

   // ❌ Invalid JSON
   "[{name:session,value:123}]"
   ```

### Debug Mode

Enable debug logging to see cookie injection details:

```bash
export BROWSERLOOP_DEBUG=true
```

**Monitor debug logs:**
```bash
tail -f /tmp/browserloop.log
```

Debug logs include:
- Cookie loading and merging process
- Automatic file watching and refresh events
- Cookie injection and domain validation
- Screenshot operation details

**Note**: Logs are written to `/tmp/browserloop.log` (not console) for MCP compatibility.

## Security Notes

### Development Best Practices

1. **Use localhost/staging cookies only** - Never use production cookies
2. **Rotate development sessions** - Refresh cookies regularly
3. **Environment isolation** - Keep dev/staging/prod cookies separate
4. **Use HTTPS in staging** - Match production security settings

### Cookie Safety

- ✅ **Local development cookies** are safe to use
- ✅ **Staging environment cookies** are acceptable for testing
- ❌ **Production cookies** should never be used for screenshots
- ❌ **Personal account cookies** should not be shared

## Example: Full Development Workflow

### 1. Extract Development Session

```bash
# Login to your dev app at http://localhost:3000
# Open dev tools and copy session cookie
```

### 2. Configure Default Cookie

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

Reference in MCP configuration:
```json
{
  "mcpServers": {
    "browserloop": {
      "env": {
        "BROWSERLOOP_DEFAULT_COOKIES": "/home/username/.config/browserloop/cookies.json"
      }
    }
  }
}
```

### 3. Test Authenticated Pages

```
Take a screenshot of http://localhost:3000/admin/users
Take a screenshot of http://localhost:3000/dashboard
Take a screenshot of http://localhost:3000/settings
```

All requests automatically include your development session cookie!

---

For more details, see the [main API documentation](API.md).
