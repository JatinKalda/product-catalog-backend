/**
 * Main application entry point
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import config from './config';
import logger from './logger';
import { createHealthRouter } from './routes/health';
import { createProductRouter } from './routes/products';
import { ProductService } from './services/productService';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL encoded body parser
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } })); // HTTP logging

// Initialize service layer
const productService = new ProductService(prisma);

// Routes
app.use('/health', createHealthRouter());
app.use('/products', createProductRouter(productService));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
if (require.main === module) {
  const port = config.server.port;
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`, { env: config.server.env });
  });
}

export default app;
