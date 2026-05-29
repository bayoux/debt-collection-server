import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

const CHANNELS = ['whatsapp', 'sms', 'telegram', 'email'] as const;

export class CreateIntegrationConfigDto {
  @ApiProperty({ enum: CHANNELS })
  @IsEnum(CHANNELS)
  channel: string;

  @ApiProperty({ example: 'ch2d' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: 'secret-api-key', format: 'password' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
