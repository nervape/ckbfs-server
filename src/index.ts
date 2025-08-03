import { Server } from './server';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  try {
    const server = new Server();
    await server.start();
  } catch (error) {
    logger.error('Failed to start application', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  process.exit(1);
});

// Start the application
main();
