import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessActor } from './access.types';

export const Actor = createParamDecorator((_data: unknown, ctx: ExecutionContext): AccessActor => {
  const request = ctx.switchToHttp().getRequest();
  return request.actor as AccessActor;
});


