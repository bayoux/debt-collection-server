import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsUUID } from 'class-validator';

const CHANNELS = ['whatsapp', 'sms', 'telegram', 'email'] as const;

export class CreateScheduledTaskDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  debtCaseId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ enum: CHANNELS })
  @IsEnum(CHANNELS)
  channel: string;

  @ApiProperty({ example: '2025-06-01T10:00:00Z' })
  @IsISO8601()
  scheduledAt: string;
}
