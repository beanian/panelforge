import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from './errors';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError(
          400,
          'Validation failed: ' + result.error.errors.map((e) => e.message).join(', '),
        ),
      );
    }
    (req as any)[source] = result.data;
    next();
  };
}
