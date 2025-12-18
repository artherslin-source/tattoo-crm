import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { buildActorFromJwtUser, JwtUser } from './access.types';

/**
 * AccessGuard
 * - Assumes AuthGuard('jwt') already ran and populated request.user
 * - Normalizes legacy roles into the new 2-level access model: BOSS / ARTIST
 * - Attaches request.actor for downstream services (policy/scoping)
 */
@Injectable()
export class AccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser | undefined;

    if (!user?.id) {
      throw new ForbiddenException('User not found');
    }

    const actor = buildActorFromJwtUser(user);
    if (!actor) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // ARTIST must be scoped to a branch for this system’s data isolation rules.
    if (actor.role === 'ARTIST' && !actor.branchId) {
      throw new ForbiddenException('Artist must belong to a branch');
    }

    request.actor = actor;
    return true;
  }
}


