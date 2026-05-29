import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'agent_ivanov' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'ivanov@bank.kg' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 's3cr3t123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    example: ['uuid-role-1'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  roleIds?: string[];
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class AssignRolesDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('all', { each: true })
  roleIds: string[];
}
