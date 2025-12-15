import { IsString,  Length, Matches, IsNotEmpty } from 'class-validator';

export class CreateWalletDto {
  @IsNotEmpty({ message: 'Currency cannot be blank' })
  @IsString({ message: 'Currency must be a string' }) 
  @Length(3, 3, { message: 'Currency must be exactly 3 characters' }) // e.g. NGN, USD, EUR
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters (e.g. NGN, USD, EUR)' })
  currency: string;
}