import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw an error if no token is provided
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, just return null
    // This allows the request to continue without authentication
    return user || null;
  }

  // Override canActivate to always allow the request through
  canActivate(context: ExecutionContext) {
    // Call parent canActivate which attempts to authenticate
    return super.canActivate(context) as Promise<boolean> | boolean;
  }

  // Override getRequest to handle the case where authentication fails
  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}

