import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';
import { routes } from './routes.js';
import { logger } from '../services/logger.js';

export function createServer(bot) {
  const app = express();

  // Trust proxy (required for Render)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // Rate limiting for HTTP endpoints
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // Body parser with size limit
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true, limit: '256kb' }));

  // Request logging
  app.use((req, res, next) => {
    logger.debug({
      method: req.method,
      path: req.path,
      ip: req.ip
    }, 'HTTP request');
    next();
  });

  // Routes
  app.use(routes(bot));

  // Error handler
  app.use((err, req, res, next) => {
    logger.error({
      error: err.message,
      stack: err.stack,
      path: req.path
    }, 'HTTP error');

    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
