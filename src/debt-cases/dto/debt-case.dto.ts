import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { DebtCaseStatus } from '../entities/debt-case.entity';

export class CreateDebtCaseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  debtorId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  assignedAgentId?: string;

  @ApiProperty({ example: 15000.0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2025-05-31' })
  @IsDateString()
  dueDate: string;
}

export class ImportDebtCaseRowDto {
  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+996700123456' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'ivan@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+996700123456' })
  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsString()
  @IsOptional()
  telegramId?: string;

  @ApiProperty({ example: 15000.0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2025-05-31' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedAgentId?: string;
}

export class ImportDebtCaseResultDto {
  @ApiProperty()
  imported: number;

  @ApiProperty()
  skipped: number;

  @ApiProperty()
  errors: { row: number; field: string; message: string }[];
}

export class UpdateDebtCaseDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional({ enum: ['new', 'in_progress', 'promised', 'closed', 'overdue'] })
  @IsEnum(['new', 'in_progress', 'promised', 'closed', 'overdue'])
  @IsOptional()
  status?: DebtCaseStatus;
}
