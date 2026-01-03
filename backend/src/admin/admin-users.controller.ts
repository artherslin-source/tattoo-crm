import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import { isBoss, type AccessActor } from '../common/access/access.types';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * 批次重設所有刺青師的登入密碼為 12345678
   * 並自動補齊缺少的手機號碼
   * 
   * 僅限 BOSS 使用
   * 
   * @example
   * POST /admin/users/artists/reset-login
   * 
   * Response:
   * {
   *   "success": true,
   *   "defaultPassword": "12345678",
   *   "results": [
   *     {
   *       "artistId": "xxx",
   *       "userId": "xxx",
   *       "displayName": "陳震宇",
   *       "phone": "0933333333",
   *       "branchName": "三重店",
   *       "passwordReset": true,
   *       "phoneAssigned": false,
   *       "skippedReason": null
   *     }
   *   ],
   *   "summary": {
   *     "total": 10,
   *     "passwordReset": 9,
   *     "phoneAssigned": 2,
   *     "skipped": 1,
   *     "errors": 0
   *   }
   * }
   */
  @Post('artists/reset-login')
  async resetArtistsLogin(@Actor() actor: AccessActor) {
    // 僅 BOSS 可執行此操作
    if (!isBoss(actor)) {
      throw new Error('只有 BOSS 可以執行批次重設刺青師登入');
    }

    console.log(`🔐 BOSS ${actor.id} 觸發批次重設刺青師登入`);

    const result = await this.adminUsersService.resetArtistsLogin();

    return {
      ...result,
      message: '批次重設完成',
      verificationSteps: [
        {
          step: 1,
          title: '刺青師登入驗證',
          description: '從結果清單中挑選 2-3 位刺青師，使用手機號碼和預設密碼登入',
          expectedResult: '能成功登入並進入 /artist/calendar 頁面',
        },
        {
          step: 2,
          title: '權限檢查',
          description: '登入後檢查 GET /auth/me，確認 role 為 ARTIST',
          expectedResult: '返回正確的 role 和 branchId',
        },
        {
          step: 3,
          title: '頁面訪問測試',
          description: '嘗試訪問 /admin/* 路徑',
          expectedResult: '應被拒絕訪問（403 或重定向）',
        },
      ],
    };
  }

  /**
   * 批次重設所有會員（MEMBER）的登入資料：
   * - phone：確保為純數字 10~15 碼且唯一（若原本格式不符，會產生新的 099xxxxxxxx）
   * - password：重設為 12345678
   *
   * 僅限 BOSS 使用
   *
   * @example
   * POST /admin/users/members/reset-login
   */
  @Post('members/reset-login')
  async resetMembersLogin(@Actor() actor: AccessActor, @Body() _body: unknown) {
    if (!isBoss(actor)) {
      throw new Error('只有 BOSS 可以執行批次重設會員登入');
    }

    console.log(`🔐 BOSS ${actor.id} 觸發批次重設會員登入`);
    const result = await this.adminUsersService.resetMembersLogin();

    return {
      ...result,
      message: '批次重設完成',
      note: '測試資料用途：此操作會重設所有 MEMBER 的密碼為 12345678，並修正 phone 為可登入格式。',
    };
  }
}

