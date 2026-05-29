import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDebtorDto {
  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+996700123456' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  telegramId?: string;
}

export class UpdateDebtorDto extends PartialType(CreateDebtorDto) {}
