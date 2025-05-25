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
