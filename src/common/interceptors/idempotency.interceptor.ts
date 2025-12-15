import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyRecord } from '../../wallet/entities/idempotency-record.entity';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private idempotencyRepository: Repository<IdempotencyRecord>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      return next.handle();
    }

    // Check if this idempotency key has been used before
    const existingRecord = await this.idempotencyRepository.findOne({
      where: { idempotencyKey },
    });

    if (existingRecord) {
      // Check if the record has expired
      if (new Date() > existingRecord.expiresAt) {
        // Delete expired record and proceed
        await this.idempotencyRepository.delete({ idempotencyKey });
      } else {
        // Return cached response
        response.status(existingRecord.statusCode);
        return of(JSON.parse(existingRecord.response));
      }
    }

    // Process the request and cache the response
    return next.handle().pipe(
      tap(async (data) => {
        const statusCode = response.statusCode;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

        const record = this.idempotencyRepository.create({
          idempotencyKey,
          response: JSON.stringify(data),
          statusCode,
          expiresAt,
        });

        try {
          await this.idempotencyRepository.save(record);
        } catch (error) {
          // Handle race condition where another request with same key was processed
          if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
            // Key already exists, ignore
            return;
          }
          throw error;
        }
      }),
    );
  }
}