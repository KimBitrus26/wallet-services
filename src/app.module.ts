import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletModule } from './wallet/wallet.module';
import { Wallet } from './wallet/entities/wallet.entity';
import { Transaction } from './wallet/entities/transaction.entity';
import { IdempotencyRecord } from './wallet/entities/idempotency-record.entity'

@Module({
  imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: 'wallet.db',
          entities: [Wallet, Transaction, IdempotencyRecord ],
          synchronize: true
        }),
        WalletModule
      
      ],
})
export class AppModule {}
