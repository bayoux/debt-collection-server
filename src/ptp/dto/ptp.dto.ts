import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePtpDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  debtCaseId: string;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  promiseDate: string;

  @ApiProperty({ example: 15000.0 })
  @IsNumber()
  @IsPositive()
  promisedAmount: number;
}

export class UpdatePtpStatusDto {
  @ApiProperty({ enum: ['kept', 'broken'] })
  @IsEnum(['kept', 'broken'])
  status: 'kept' | 'broken';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}
