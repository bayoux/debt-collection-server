import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import {
  AssignPermissionsDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
  ) {}

  // ── Roles ─────────────────────────────────────────────────
  async createRole(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Role "${dto.name}" already exists`);
    return this.roleRepo.save(this.roleRepo.create(dto));
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({ order: { name: 'ASC' } });
  }

  async findOneRole(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOneRole(id);
    Object.assign(role, dto);
    return this.roleRepo.save(role);
  }

  async removeRole(id: string): Promise<void> {
    const role = await this.findOneRole(id);
    await this.roleRepo.remove(role);
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto): Promise<Role> {
    const role = await this.findOneRole(id);
    role.permissions = await this.permRepo.findByIds(dto.permissionIds);
    return this.roleRepo.save(role);
  }

  // ── Permissions ───────────────────────────────────────────
  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const exists = await this.permRepo.findOne({ where: { codename: dto.codename } });
    if (exists) throw new ConflictException(`Permission "${dto.codename}" already exists`);
    return this.permRepo.save(this.permRepo.create(dto));
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permRepo.find({ order: { codename: 'ASC' } });
  }
}
