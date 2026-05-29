import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import {
  AssignPermissionsDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ── ROLES ──────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Создать роль' })
  @ApiCreatedResponse({ type: Role })
  createRole(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.createRole(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список ролей' })
  @ApiOkResponse({ type: [Role] })
  findAllRoles(): Promise<Role[]> {
    return this.rolesService.findAllRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить роль по ID' })
  @ApiOkResponse({ type: Role })
  findOneRole(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
    return this.rolesService.findOneRole(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить роль' })
  @ApiOkResponse({ type: Role })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить роль' })
  @ApiNoContentResponse()
  removeRole(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rolesService.removeRole(id);
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: 'Назначить права роли (полная замена)' })
  @ApiOkResponse({ type: Role })
  assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ): Promise<Role> {
    return this.rolesService.assignPermissions(id, dto);
  }

  // ── PERMISSIONS ────────────────────────────────────────────

  @Post('permissions')
  @ApiOperation({ summary: 'Создать право доступа' })
  @ApiCreatedResponse({ type: Permission })
  createPermission(@Body() dto: CreatePermissionDto): Promise<Permission> {
    return this.rolesService.createPermission(dto);
  }

  @Get('permissions/list')
  @ApiOperation({ summary: 'Список всех прав' })
  @ApiOkResponse({ type: [Permission] })
  findAllPermissions(): Promise<Permission[]> {
    return this.rolesService.findAllPermissions();
  }
}
