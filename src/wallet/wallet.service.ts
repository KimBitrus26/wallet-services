import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferDto } from './dto/transfer-wallet.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,

    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,

    private dataSource: DataSource,
  ) {}

  async createWallet(createWalletDto: CreateWalletDto): Promise<Wallet> {

    // check if similar wallet exists with same currency but for the purpose of this assessment, allow multiple wallets with same currency
    // const currency = createWalletDto.currency?.toUpperCase();
    // const existingWallet = await this.walletRepository.findOne({ where: { currency } });
    // if (existingWallet) {
    //   throw new BadRequestException(`Wallet with currency ${currency} already exists`);
    // }

    const wallet = this.walletRepository.create({
      currency: createWalletDto.currency?.toUpperCase(),
      balance: 0,
    });
    
    return await this.walletRepository.save(wallet);
  }

  async fundWallet(walletId: string, fundWalletDto: FundWalletDto): Promise<{ wallet: Wallet; transaction: Transaction }> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the wallet row for update to avoid race condition. lock if posgres or mysql is used
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        // lock: { mode: 'pessimistic_write' },  TODO lock if posgres or mysql is used
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet with ID ${walletId} not found`);
      }

      const balanceBefore = Number(wallet.balance);
      const amount = Number(fundWalletDto.amount);
      const balanceAfter = balanceBefore + amount;

      // Update wallet balance
      wallet.balance = balanceAfter;
      await queryRunner.manager.save(Wallet, wallet);

      // Create transaction records
      const reference = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        reference: reference,
        description: fundWalletDto.description || 'Wallet funding',
        status: TransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();

      return { wallet, transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async transfer(transferDto: TransferDto): Promise<{ sourceWallet: Wallet; destinationWallet: Wallet; transactions: Transaction[] }> {
    if (transferDto.sourceWalletId === transferDto.destinationWalletId) {
      throw new BadRequestException('Source and destination wallets cannot be the same');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock both wallets in consistent order (by ID) 
      const walletIds = [transferDto.sourceWalletId, transferDto.destinationWalletId].sort();
      
      const [wallet1, wallet2] = await Promise.all([
        queryRunner.manager.findOne(Wallet, {
          where: { id: walletIds[0] },
        //   lock: { mode: 'pessimistic_write' }, TODO lock if postgres or mysql is used
        }),
        queryRunner.manager.findOne(Wallet, {
          where: { id: walletIds[1] },
        //   lock: { mode: 'pessimistic_write' }, TODO lock if postgres or mysql is used
        }),
      ]);

      const sourceWallet = wallet1?.id === transferDto.sourceWalletId ? wallet1 : wallet2;
      const destinationWallet = wallet1?.id === transferDto.destinationWalletId ? wallet1 : wallet2;

      if (!sourceWallet) {
        throw new NotFoundException(`Source wallet with ID ${transferDto.sourceWalletId} not found`);
      }

      if (!destinationWallet) {
        throw new NotFoundException(`Destination wallet with ID ${transferDto.destinationWalletId} not found`);
      }

      if (sourceWallet.currency !== destinationWallet.currency) {
        throw new BadRequestException('Cannot transfer between wallets with different currencies');
      }

      const amount = Number(transferDto.amount);
      const sourceBalanceBefore = Number(sourceWallet.balance);

      if (sourceBalanceBefore < amount) {
        throw new BadRequestException(`Insufficient balance. Available: ${sourceBalanceBefore}, Required: ${amount}`);
      }

      const destinationBalanceBefore = Number(destinationWallet.balance);

      // Update balances
      sourceWallet.balance = sourceBalanceBefore - amount;
      destinationWallet.balance = destinationBalanceBefore + amount;

      await queryRunner.manager.save(Wallet, [sourceWallet, destinationWallet]);

      // Create transaction records
      const reference = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const debitTransaction = queryRunner.manager.create(Transaction, {
        walletId: sourceWallet.id,
        type: TransactionType.DEBIT,
        amount: amount,
        balanceBefore: sourceBalanceBefore,
        balanceAfter: sourceWallet.balance,
        reference: reference,
        description: transferDto.description || `Transfer to ${destinationWallet.id}`,
        status: TransactionStatus.COMPLETED,
      });

      const creditTransaction = queryRunner.manager.create(Transaction, {
        walletId: destinationWallet.id,
        type: TransactionType.CREDIT,
        amount: amount,
        balanceBefore: destinationBalanceBefore,
        balanceAfter: destinationWallet.balance,
        reference: reference,
        description: transferDto.description || `Transfer from ${sourceWallet.id}`,
        status: TransactionStatus.COMPLETED,
      });

      const transactions = await queryRunner.manager.save(Transaction, [debitTransaction, creditTransaction]);

      await queryRunner.commitTransaction();

      return { sourceWallet, destinationWallet, transactions };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletDetails(walletId: string): Promise<{ wallet: Wallet; transactions: Transaction[] }> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    const transactions = await this.transactionRepository.find({
      where: { walletId: walletId },
      order: { createdAt: 'DESC' },
    });

    return { wallet, transactions };
  }

  async getAllWallets(): Promise<Wallet[]> {
    return await this.walletRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
