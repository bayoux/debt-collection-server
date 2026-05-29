import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function transformKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transformKeys);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc: Record<string, unknown>, [k, v]) => {
        acc[snakeToCamel(k)] = transformKeys(v);
        return acc;
      },
      {},
    );
  }
  return value;
}

@Injectable()
export class NormalizeBodyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const contentType = req.headers['content-type'] ?? '';
    if (req.body && typeof req.body === 'object' && contentType.includes('application/json')) {
      req.body = transformKeys(req.body);
    }
    next();
  }
}
