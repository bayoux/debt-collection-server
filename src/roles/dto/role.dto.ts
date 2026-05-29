import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'supervisor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Read-only analytics access' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class AssignPermissionsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}

export class CreatePermissionDto {
  @ApiProperty({ example: 'can_view_reports' })
  @IsString()
  @IsNotEmpty()
  codename: string;

  @ApiPropertyOptional({ example: 'Can view analytics reports' })
  @IsOptional()
  @IsString()
  description?: string;
}
