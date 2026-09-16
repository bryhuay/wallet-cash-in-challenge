import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ResponseEnvelope } from '../interfaces/response-envelope.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = response.statusCode ?? 200;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        data: data ?? (null as unknown as T),
      })),
    );
  }
}
