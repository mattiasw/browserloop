#!/usr/bin/env node

/**
 * MCP Screenshot Server
 * A Model Context Protocol server for taking screenshots of web pages
 */

console.log('MCP Screenshot Server starting...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Working directory:', process.cwd());

// For now, just keep the process alive for testing
function keepAlive() {
  console.log('Server running... (placeholder mode)');
}

// Keep process alive for development testing
setInterval(keepAlive, 5000);

console.log('Server initialized successfully');
