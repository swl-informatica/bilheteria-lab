import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { AppError, validationError } from './errors';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { eventsRouter } from './routes/events';
import { ordersRouter } from './routes/orders';

// Logs method, path, status and duration of each request.
function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    const path = req.originalUrl.split('?')[0];
    console.log(`${req.method} ${path} ${res.statusCode} ${elapsed.toFixed(1)}ms`);
  });
  next();
}

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);
  if (config.corsOrigin) {
    app.use(cors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) }));
  }
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/auth', authRouter);
  app.use('/events', eventsRouter);
  app.use('/orders', ordersRouter);
  app.use('/admin', adminRouter);

  app.use((_req, _res, next) => {
    next(new AppError('NOT_FOUND'));
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.status).json(err.toBody());
      return;
    }
    const bodyError = err as { type?: string };
    if (bodyError?.type === 'entity.parse.failed' || bodyError?.type === 'entity.too.large') {
      res.status(400).json(validationError({}).toBody());
      return;
    }
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(`Erro não tratado: ${message}`);
    const internal = new AppError('INTERNAL_ERROR');
    res.status(internal.status).json(internal.toBody());
  });

  return app;
}
