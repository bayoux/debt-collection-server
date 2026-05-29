import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;        // user uuid
  username: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    if (payload.type !== 'access') throw new UnauthorizedException();
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');
    return user;
  }
}
