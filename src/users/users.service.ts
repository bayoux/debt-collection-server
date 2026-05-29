import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { AssignRolesDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  // ── Create ────────────────────────────────────────────────
  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (exists) throw new ConflictException('Username or email already taken');

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash: dto.password,   // hashed via @BeforeInsert
    });

    if (dto.roleIds?.length) {
      user.roles = await this.roleRepo.findByIds(dto.roleIds);
    }

    return this.userRepo.save(user);
  }

  // ── List ──────────────────────────────────────────────────
  async findAll(page = 1, pageSize = 20): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  // ── One ───────────────────────────────────────────────────
  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  // ── Update ────────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.password) user.passwordHash = dto.password;   // re-hashed by hook
    if (dto.username) user.username = dto.username;
    if (dto.email) user.email = dto.email;

    if (dto.roleIds !== undefined) {
      user.roles = await this.roleRepo.findByIds(dto.roleIds);
    }

    return this.userRepo.save(user);
  }

  // ── Delete ────────────────────────────────────────────────
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepo.remove(user);
  }

  // ── Assign roles ──────────────────────────────────────────
  async assignRoles(id: string, dto: AssignRolesDto): Promise<User> {
    const user = await this.findOne(id);
    const roles = await this.roleRepo.findByIds(dto.roleIds);
    user.roles = roles;
    return this.userRepo.save(user);
  }
}
