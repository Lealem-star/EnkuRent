import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';
import { startCronJobs } from './jobs/estateCron.js';

const PORT = config.port || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Enqopa RentPro API server running on http://localhost:${PORT}`);
  console.log(`📡 Health endpoint available at http://localhost:${PORT}/api/health`);
  console.log(`🔒 Allowed CORS Client URL: ${config.clientUrl}`);

  // Initialize scheduled background jobs
  try {
    startCronJobs();
  } catch (cronError) {
    console.error('Failed to initialize scheduled jobs:', cronError);
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Prisma database client disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
