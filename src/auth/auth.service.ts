import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto, TokenPairDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt-access.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  // ── Login ─────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<TokenPairDto> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
    });

    if (!user || !(await user.validatePassword(dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return this.generateTokens(user);
  }

  // ── Refresh ───────────────────────────────────────────────
  async refresh(userId: string): Promise<Pick<TokenPairDto, 'access'>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const access = this.signAccess(user);
    return { access };
  }

  // ── Token generation ──────────────────────────────────────
  private generateTokens(user: User): TokenPairDto {
    return {
      access: this.signAccess(user),
      refresh: this.signRefresh(user),
    };
  }

  private buildPayload(user: User, type: 'access' | 'refresh'): JwtPayload {
    return {
      sub: user.id,
      username: user.username,
      roles: user.roles?.map((r) => r.name) ?? [],
      permissions: user.permissions,
      type,
    };
  }

  private signAccess(user: User): string {
    return this.jwtService.sign(this.buildPayload(user, 'access'), {
      secret: this.cfg.get('JWT_ACCESS_SECRET'),
      expiresIn: this.cfg.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  private signRefresh(user: User): string {
    return this.jwtService.sign(this.buildPayload(user, 'refresh'), {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  // ── Me ────────────────────────────────────────────────────
  async getMe(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
