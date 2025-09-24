import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { BRANCH_SCOPE_KEY } from '../decorators/branch-scope.decorator';

@Injectable()
export class BranchScopeInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 檢查是否需要分店篩選
    const needsBranchScope = this.reflector.getAllAndOverride<boolean>(
      BRANCH_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (needsBranchScope && user && user.role !== 'BOSS') {
      // 為非 BOSS 用戶添加分店篩選條件
      const userBranchId = user.branchId;
      
      // 修改查詢參數以包含分店篩選
      if (request.method === 'GET') {
        request.query = {
          ...request.query,
          branchId: userBranchId,
        };
      }
    }

    return next.handle();
  }
}
