import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
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

  @ApiPropertyOptional({ example: 'Уведомление о задолженности', description: 'Тема письма (только для email)' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'Уважаемый {{full_name}}, у вас задолженность {{amount}} сом.' })
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

  @ApiPropertyOptional({ example: 'debtor@example.com', description: 'Email получателя (обязательно для channel=email)' })
  @ValidateIf((o) => o.channel === 'email')
  @IsEmail()
  recipientEmail?: string;

  @ApiPropertyOptional({ example: 'Уведомление о задолженности', description: 'Тема письма (переопределяет тему из шаблона)' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({
    example: { full_name: 'Иван Иванов', amount: '5000' },
    description: 'Переменные для подстановки в шаблон ({{key}} → value)',
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
