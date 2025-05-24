#!/usr/bin/env node

/**
 * MCP Screenshot Server
 * A Model Context Protocol server for taking screenshots of web pages
 */

import { mcpServer } from './mcp-server.js';

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
startMcpServer()
  .catch((error) => {
    process.exit(1);
  });
