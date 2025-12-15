import { IsNumber, IsPositive, IsUUID, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class TransferDto {
  @IsUUID('4', { message: 'Sender wallet ID must be a valid UUID' })
  sourceWalletId: string;

  @IsUUID('4', { message: 'Receiver wallet ID must be a valid UUID' })
  destinationWalletId: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must have at most 2 decimal places' })
  @IsPositive({ message: 'Amount must greater than zero' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateIf((o) => o.sourceWalletId === o.destinationWalletId)
  @IsString({ message: 'Source and destination wallets cannot be the same' })
  sameWalletValidation?: string;
}