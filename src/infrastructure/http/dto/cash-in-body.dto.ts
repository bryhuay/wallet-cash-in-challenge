import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class CashInBodyDto {
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsString()
  @IsNotEmpty()
  payment_method!: string;
}
