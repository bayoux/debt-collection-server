import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const user: User = ctx.switchToHttp().getRequest().user;
    const userRoleNames = user.roles?.map((r) => r.name) ?? [];
    return requiredRoles.some((r) => userRoleNames.includes(r));
  }
}
