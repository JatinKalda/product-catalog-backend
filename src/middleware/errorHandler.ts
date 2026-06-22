/**
 * Global error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

/**
 * Express error handler middleware
 * Must be registered as the last middleware
 */
export function errorHandler(
  error: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
  });
}
