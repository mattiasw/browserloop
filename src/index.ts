#!/usr/bin/env node

/**
 * MCP Screenshot Server
 * A Model Context Protocol server for taking screenshots of web pages
 */

import { screenshotService } from './screenshot-service.js';

console.log('MCP Screenshot Server starting...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Working directory:', process.cwd());

async function demonstrateScreenshotService() {
  try {
    console.log('Initializing screenshot service...');
    await screenshotService.initialize();

    if (screenshotService.isHealthy()) {
      console.log('Screenshot service is healthy and ready');

      // For demonstration, we can test with a simple data URL
      // This avoids network dependencies during development
      const testOptions = {
        url: 'data:text/html,<html><body><h1>Test Page</h1><p>Screenshot service is working!</p></body></html>',
        width: 800,
        height: 600,
        format: 'webp' as const,
        quality: 80
      };

      console.log('Taking test screenshot...');
      const result = await screenshotService.takeScreenshot(testOptions);

      console.log('Screenshot captured successfully:');
      console.log('- MIME Type:', result.mimeType);
      console.log('- Dimensions:', `${result.width}x${result.height}`);
      console.log('- Data size:', `${result.data.length} characters`);
      console.log('- Timestamp:', new Date(result.timestamp).toISOString());

    } else {
      console.log('Screenshot service is not healthy');
    }

  } catch (error) {
    console.error('Error demonstrating screenshot service:');
    console.error('Error message:', (error as Error)?.message || 'Unknown error');
    console.error('Error stack:', (error as Error)?.stack || 'No stack trace');
    console.error('Full error object:', error);
  }
}

async function gracefulShutdown() {
  console.log('Shutting down...');
  try {
    await screenshotService.cleanup();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

console.log('Setting up screenshot service demonstration...');

// Run demonstration
demonstrateScreenshotService()
  .then(() => {
    console.log('Screenshot service demonstration completed');

    // For development, keep process alive
    function keepAlive() {
      if (screenshotService.isHealthy()) {
        console.log('Server running... (screenshot service ready)');
      } else {
        console.log('Server running... (screenshot service not ready)');
      }
    }

    // Keep process alive for development testing
    const keepAliveInterval = setInterval(keepAlive, 10000);

    console.log('Server initialized successfully');
  })
  .catch((error) => {
    console.error('Fatal error during demonstration setup:', error);
    process.exit(1);
  });
