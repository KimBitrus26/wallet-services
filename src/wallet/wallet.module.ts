import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyRecord } from './entities/idempotency-record.entity';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, IdempotencyRecord]),
  ],
  controllers: [WalletController],
  providers: [WalletService, IdempotencyInterceptor],
  exports: [WalletService],
})
export class WalletModule {}