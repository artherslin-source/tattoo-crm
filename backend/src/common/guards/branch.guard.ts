import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // BOSS 可以訪問所有分店
    if (user.role === 'BOSS') {
      return true;
    }

    // 其他角色必須有 branchId
    if (!user.branchId) {
      throw new ForbiddenException('User must be assigned to a branch');
    }

    // 將用戶的分店 ID 添加到請求中，供後續使用
    request.userBranchId = user.branchId;
    return true;
  }
}
