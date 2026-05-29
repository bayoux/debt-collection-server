import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
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
