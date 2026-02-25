import express, { Express, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import config from 'config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from '../api/routes/index';

const express_ = ({ app } : { app: Express }) => {
  // 1. Middlewares básicos
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.enable('trust proxy');
  app.use(cors({ origin: '*', credentials: true }));
  if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

  /**
   * 2. Health Check endpoints
   */
  app.get('/status', (req, res) => {
    res.status(200).json({ status: 'success' });
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  /**
   * 3. Rutas de la API
   */
  app.use(config.get<string>('api.prefix'), routes());

  /**
   * 4. Catch Error 404 (SIEMPRE después de todas las rutas)
   */
  app.use((req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
  });

  /**
   * 5. Manejadores de Errores (Final del stack)
   */
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.name === 'UnauthorizedError') {
      return res.status(err.status).send({ message: err.message, error: err.error });
    }
    return next(err);
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    err.success = err.success || false;
    err.statusCode = err.statusCode || 500;
    res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      error: err.error || err.code
    });
  });
};
export default express_;