import { IsNumber, IsPositive, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class FundWalletDto {
  
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must have at most 2 decimal places' })
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'description cannot be blank' })
  description?: string;
}