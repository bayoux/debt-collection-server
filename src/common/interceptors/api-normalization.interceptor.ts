import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transformKeys);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc: Record<string, unknown>, [k, v]) => {
        acc[camelToSnake(k)] = transformKeys(v);
        return acc;
      },
      {},
    );
  }
  return value;
}

function addPaginationLinks(
  data: Record<string, unknown>,
  req: Request,
): Record<string, unknown> {
  if (!('count' in data) || !('results' in data)) return data;

  const page = parseInt((req.query['page'] as string) ?? '1', 10);
  const pageSize = parseInt((req.query['page_size'] as string) ?? '20', 10);
  const totalPages = Math.ceil((data.count as number) / pageSize);

  const buildUrl = (p: number): string => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    params.set('page', String(p));
    return `${req.protocol}://${req.get('host')}${req.path}?${params.toString()}`;
  };

  return {
    count: data.count,
    next: page < totalPages ? buildUrl(page + 1) : null,
    previous: page > 1 ? buildUrl(page - 1) : null,
    results: data.results,
  };
}

@Injectable()
export class ApiNormalizationInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      map((data: unknown) => {
        if (data === null || data === undefined) return data;

        // Serialize entities to plain objects (resolves Dates, drops undefined)
        const plain = JSON.parse(JSON.stringify(data)) as unknown;

        // Add next/previous to paginated responses
        const withLinks =
          plain !== null &&
          typeof plain === 'object' &&
          !Array.isArray(plain) &&
          'count' in (plain as object)
            ? addPaginationLinks(plain as Record<string, unknown>, req)
            : plain;

        return transformKeys(withLinks);
      }),
    );
  }
}
