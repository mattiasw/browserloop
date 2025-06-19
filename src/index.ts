#!/usr/bin/env node

/*
 * This file is part of BrowserLoop.
 *
 * BrowserLoop is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BrowserLoop is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with BrowserLoop. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * MCP Screenshot Server
 * A Model Context Protocol server for taking screenshots of web pages
 */

import { getPackageInfo } from './package-info.js';
import { mcpServer } from './mcp-server.js';

function detectNpxUsage() {
  // Detect if running via NPX by checking environment and process arguments
  const npm_execpath = process.env.npm_execpath || '';
  const npm_command = process.env.npm_command || '';
  return npm_execpath.includes('npx') || npm_command === 'exec';
}

function showHelp() {
  const { version, homepage, repository } = getPackageInfo();
  const isNpx = detectNpxUsage();

  console.log(`
BrowserLoop v${version} - MCP Screenshot Server

A Model Context Protocol server for automated web page screenshot capture.

USAGE:
  ${isNpx ? 'npx browserloop@latest [OPTIONS]' : 'browserloop [OPTIONS]'}

OPTIONS:
  --help      Show this help message
  --version   Show version information

DESCRIPTION:
  BrowserLoop is an MCP server that provides screenshot capabilities to AI agents
  and development tools. It communicates via stdin/stdout using the MCP protocol.

  The server supports:
  - High-quality screenshots using Playwright Chromium
  - Multiple image formats (WebP, PNG, JPEG)
  - Full page and element-specific capture
  - Cookie-based authentication with automatic file reloading
  - Configurable viewport sizes and quality settings

${
  isNpx
    ? `NPX USAGE:
  When using NPX, BrowserLoop will be downloaded and run directly:

  # Start the MCP server (recommended for AI tools)
  npx browserloop@latest

  # Show help
  npx browserloop@latest --help

  # Show version
  npx browserloop@latest --version

BROWSER REQUIREMENTS:
  BrowserLoop requires Chromium browser to be installed. If you encounter
  "Executable doesn't exist" errors, install the browser:

  # Install Chromium via Playwright (recommended)
  npx playwright install chromium

`
    : ''
}MCP INTEGRATION:
  Configure BrowserLoop in your AI development tool's MCP settings:

  For Cursor (~/.cursor/mcp.json):
  {
    "mcpServers": {
      "browserloop": {
        ${isNpx ? '"command": "npx",' : '"command": "browserloop",'}
        ${isNpx ? '"args": ["-y", "browserloop@latest"],' : '"args": [],'}
        "env": {
          "BROWSERLOOP_DEFAULT_COOKIES": "/path/to/cookies.json",
          "BROWSERLOOP_DEBUG": "true"
        }
      }
    }
  }

  For Claude Desktop:
  Add similar configuration to your MCP settings file.

  Note: The "-y" flag in NPX commands automatically accepts prompts,
  which is essential for MCP servers since they run non-interactively.

EXAMPLES:
  ${isNpx ? '# Start MCP server with NPX (most common usage)\n  npx browserloop@latest\n' : '# Start MCP server\n  browserloop\n'}
  # The server will communicate via stdin/stdout with your AI tool
  # Use cookie files for authenticated screenshots:
  # Set BROWSERLOOP_DEFAULT_COOKIES=/path/to/cookies.json

ENVIRONMENT VARIABLES:
  BROWSERLOOP_DEFAULT_COOKIES    Path to cookie file for authentication
  BROWSERLOOP_DEBUG             Enable debug logging to /tmp/browserloop.log
  BROWSERLOOP_DEFAULT_FORMAT    Image format (webp, png, jpeg)
  BROWSERLOOP_DEFAULT_QUALITY   Image quality 0-100 (default: 80)
  BROWSERLOOP_DEFAULT_WIDTH     Viewport width (default: 1280)
  BROWSERLOOP_DEFAULT_HEIGHT    Viewport height (default: 720)

For complete documentation and examples:
  ${homepage}

Issues and support:
  ${repository}/issues
`);
}

function showVersion() {
  const { version } = getPackageInfo();
  const isNpx = detectNpxUsage();

  console.log(`BrowserLoop v${version}`);
  if (isNpx) {
    console.log('Running via NPX - latest version downloaded automatically');
  }
}

async function startMcpServer() {
  try {
    await mcpServer.start();
  } catch (error) {
    const isNpx = detectNpxUsage();

    // Enhanced error messaging for common issues
    if (error instanceof Error) {
      // Check for browser-related errors
      if (
        error.message.includes("Executable doesn't exist") ||
        error.message.includes('Failed to launch browser') ||
        error.message.includes('chromium')
      ) {
        console.error(`
❌ Browser Installation Required

BrowserLoop requires Chromium browser to be installed.

${isNpx ? 'QUICK FIX for NPX users:' : 'QUICK FIX:'}
  ${isNpx ? 'npx playwright install chromium' : 'npm run install-browsers'}

${isNpx ? 'After installing, try again:' : 'After installing, restart the server:'}
  ${isNpx ? 'npx browserloop@latest' : 'browserloop'}

For more help: https://github.com/mattiasw/browserloop#readme
`);
        process.exit(1);
      }

      // Check for permission-related errors
      if (
        error.message.includes('EACCES') ||
        error.message.includes('permission denied')
      ) {
        console.error(`
❌ Permission Error

Unable to start BrowserLoop due to permission issues.

${isNpx ? 'For NPX users:' : 'Solutions:'}
  • Check file permissions in your working directory
  • Ensure you have write access to /tmp/browserloop.log
  ${isNpx ? '• Try running: npx browserloop@latest (without sudo)' : '• Avoid running with sudo unless necessary'}

For more help: https://github.com/mattiasw/browserloop#readme
`);
        process.exit(1);
      }

      // Generic error with helpful guidance
      console.error(`
❌ Failed to start BrowserLoop

Error: ${error.message}

${isNpx ? 'For NPX users:' : 'Troubleshooting:'}
  1. Ensure Chromium is installed: ${isNpx ? 'npx playwright install chromium' : 'npm run install-browsers'}
  2. Check Node.js version (requires 20+): node --version
  3. Verify file permissions in current directory
  4. ${isNpx ? 'Try latest version: npx browserloop@latest' : 'Try rebuilding: npm run build:clean'}

For detailed troubleshooting: https://github.com/mattiasw/browserloop#readme
`);
    }

    process.exit(1);
  }
}

async function gracefulShutdown() {
  try {
    await mcpServer.cleanup();
  } catch (_error) {
    // Silent cleanup - don't spam console during shutdown
  }
  process.exit(0);
}

// Enhanced command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);

  // Handle help flags
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Handle version flags
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  // Handle unknown arguments
  const unknownArgs = args.filter(
    (arg) =>
      !arg.startsWith('--help') &&
      !arg.startsWith('-h') &&
      !arg.startsWith('--version') &&
      !arg.startsWith('-v')
  );

  if (unknownArgs.length > 0) {
    const isNpx = detectNpxUsage();
    console.error(`
❌ Unknown arguments: ${unknownArgs.join(', ')}

${isNpx ? 'NPX Usage:' : 'Usage:'}
  ${isNpx ? 'npx browserloop@latest [OPTIONS]' : 'browserloop [OPTIONS]'}

Available options:
  --help, -h      Show help message
  --version, -v   Show version information

${isNpx ? 'Example:' : 'Examples:'}
  ${isNpx ? 'npx browserloop@latest --help' : 'browserloop --help'}
  ${isNpx ? 'npx browserloop@latest' : 'browserloop'}
`);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (_reason, _promise) => {
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const isNpx = detectNpxUsage();
  console.error(`
❌ Unexpected Error

An unexpected error occurred while running BrowserLoop.

${isNpx ? 'For NPX users:' : 'Troubleshooting:'}
  1. Try reinstalling: ${isNpx ? 'npx browserloop@latest' : 'npm install'}
  2. Check system requirements: Node.js 20+, Chromium browser
  3. Report the issue: https://github.com/mattiasw/browserloop/issues

Error details: ${error.message}
`);
  process.exit(1);
});

// Parse command line arguments first
parseArguments();

// Start the MCP server
startMcpServer().catch((_error) => {
  process.exit(1);
});
