import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const CHANNELS = ['whatsapp', 'sms', 'telegram', 'email'] as const;

export class CreateNotificationTemplateDto {
  @ApiProperty({ example: 'Напоминание DPD 1-7 дней' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CHANNELS })
  @IsEnum(CHANNELS)
  channel: string;

  @ApiProperty({ example: 'Уважаемый {{full_name}}, ...' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: 'ru', default: 'ru' })
  @IsString()
  @IsOptional()
  language?: string;
}

export class SendNotificationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  debtCaseId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ enum: CHANNELS })
  @IsEnum(CHANNELS)
  channel: string;
}
