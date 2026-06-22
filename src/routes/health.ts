/**
 * Health check endpoint
 */

import { Router, Request, Response } from 'express';

export function createHealthRouter(): Router {
  const router = Router();

  /**
   * GET /health
   * Simple health check endpoint for monitoring and load balancers
   */
  router.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
