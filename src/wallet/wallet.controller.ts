import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferDto } from './dto/transfer-wallet.dto';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    const wallet = await this.walletService.createWallet(createWalletDto);
    return {
      success: true,
      message: 'Wallet created successfully',
      data: wallet,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllWallets() {
    const wallets = await this.walletService.getAllWallets();
    return {
      success: true,
      message: 'Wallets retrieved successfully',
      data: wallets,
    };
  }

  @Post(':id/fund')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(HttpStatus.OK)
  async fundWallet(
    @Param('id') id: string,
    @Body() fundWalletDto: FundWalletDto,
  ) {

    const result = await this.walletService.fundWallet(id, fundWalletDto);
    return {
      success: true,
      message: 'Wallet funded successfully',
      data: {
        wallet: result.wallet,
        transaction: result.transaction,
      },
    };
  }

  @Post('transfer')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(HttpStatus.OK)
  async transfer(@Body() transferDto: TransferDto) {
    const result = await this.walletService.transfer(transferDto);
    return {
      success: true,
      message: 'Transfer completed successfully',
      data: {
        sourceWallet: result.sourceWallet,
        destinationWallet: result.destinationWallet,
        transactions: result.transactions,
      },
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getWalletDetails(@Param('id') id: string) {
    const result = await this.walletService.getWalletDetails(id);
    return {
      success: true,
      message: 'Wallet details retrieved successfully',
      data: {
        wallet: result.wallet,
        transactions: result.transactions,
      },
    };
  }
}