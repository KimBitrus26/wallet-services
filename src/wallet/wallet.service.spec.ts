import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: Repository<Wallet>;
  let transactionRepository: Repository<Transaction>;
  let dataSource: DataSource;

  const mockWalletRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockTransactionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: mockWalletRepository },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get(getRepositoryToken(Wallet));
    transactionRepository = module.get(getRepositoryToken(Transaction));
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should create a wallet with specified currency', async () => {
      const createWalletDto = { currency: 'EUR' };
      const mockWallet = { id: '123', currency: 'EUR', balance: 0 };
      mockWalletRepository.create.mockReturnValue(mockWallet);
      mockWalletRepository.save.mockResolvedValue(mockWallet);

      const result = await service.createWallet(createWalletDto);

      expect(mockWalletRepository.create).toHaveBeenCalledWith({ currency: 'EUR', balance: 0 });
      expect(result.currency).toBe('EUR');
    });
  });

  describe('fundWallet', () => {
    it('should fund a wallet successfully', async () => {
      const walletId = '123';
      const fundWalletDto = { amount: 100 };
      const mockWallet = { id: walletId, balance: 50 };
      const mockTransaction = { id: 'txn-123', walletId, amount: 100, balanceBefore: 50, balanceAfter: 150 };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockImplementation(async (entity) => {
        if (entity.id === walletId || entity instanceof Wallet) return { ...mockWallet, balance: 150 };
        return mockTransaction;
      });

      const result = await service.fundWallet(walletId, fundWalletDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.wallet.balance).toBe(150);
      expect(result.transaction).toEqual(mockTransaction);
    });

    it('should throw NotFoundException if wallet does not exist', async () => {
      const walletId = '123';
      const fundWalletDto = { amount: 100 };
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.fundWallet(walletId, fundWalletDto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getWalletDetails', () => {
    it('should return wallet details with transactions', async () => {
      const walletId = '123';
      const mockWallet = { id: walletId, balance: 100, currency: 'USD' };
      const mockTransactions = [{ id: 'txn-1', amount: 50 }, { id: 'txn-2', amount: 50 }];

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockTransactionRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.getWalletDetails(walletId);

      expect(result.wallet).toEqual(mockWallet);
      expect(result.transactions).toEqual(mockTransactions);
      expect(mockTransactionRepository.find).toHaveBeenCalledWith({
        where: { walletId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw NotFoundException if wallet does not exist', async () => {
      const walletId = '123';
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(service.getWalletDetails(walletId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('transfer', () => {
    it('should throw BadRequestException if source and destination are the same', async () => {
      const transferDto = { sourceWalletId: '123', destinationWalletId: '123', amount: 50 };
      await expect(service.transfer(transferDto)).rejects.toThrow(BadRequestException);
    });
  });
});
