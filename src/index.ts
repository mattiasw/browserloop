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

import { mcpServer } from './mcp-server.js';

function showHelp() {
  console.log(`
BrowserLoop - MCP Screenshot Server

A Model Context Protocol server for automated web page screenshot capture.

USAGE:
  browserloop [OPTIONS]

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
  - Cookie-based authentication
  - Configurable viewport sizes

EXAMPLES:
  # Start the MCP server (normal usage)
  browserloop

  # Show help
  browserloop --help

  # Show version
  browserloop --version

For more information, visit: https://github.com/yourusername/browserloop
`);
}

function showVersion() {
  // Show version - we'll use a fixed version since package.json import is complex in ES modules
  console.log('BrowserLoop v1.0.0');
}

async function startMcpServer() {
  try {
    await mcpServer.start();
  } catch (error) {
    process.exit(1);
  }
}

async function gracefulShutdown() {
  try {
    await mcpServer.cleanup();
  } catch (error) {
    // Silent cleanup
  }
  process.exit(0);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  showVersion();
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  process.exit(1);
});

// Start the MCP server
startMcpServer().catch((error) => {
  process.exit(1);
});
