import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodObject } from 'zod';
import logger from '../../utils/pino';

export const validate =
    (schema: ZodObject) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                params: req.params,
                query: req.query,
                body: req.body,
            });

            next();
        } catch (err: any) {
            if (err instanceof ZodError) {
                // Log validation errors with context
                logger.warn(
                    {
                        path: req.path,
                        method: req.method,
                        params: req.params,
                        validationErrors: err.issues,
                    },
                    'Validation error: Invalid request parameters',
                );

                return res.status(400).json({
                    status: 'fail',
                    error: err,
                });
            }
            next(err);
        }
    };
