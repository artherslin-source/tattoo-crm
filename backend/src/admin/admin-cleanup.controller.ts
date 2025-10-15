import { Controller, Post, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/cleanup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BOSS')
export class AdminCleanupController {
  constructor(private prisma: PrismaService) {}

  @Get('branches/analyze')
  async analyzeBranches() {
    console.log('🔍 開始分析分店...');

    const branches = await this.prisma.branch.findMany({
      include: {
        _count: {
          select: {
            appointments: true,
            orders: true,
            users: true,
            artists: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // 按名稱分組
    const branchesByName = branches.reduce((acc, branch) => {
      if (!acc[branch.name]) {
        acc[branch.name] = [];
      }
      acc[branch.name].push(branch);
      return acc;
    }, {} as Record<string, typeof branches>);

    const analysis: any[] = [];
    const toDelete: string[] = [];
    const toKeep: string[] = [];

    for (const [name, branchList] of Object.entries(branchesByName)) {
      if (branchList.length === 1) {
        toKeep.push(branchList[0].id);
        analysis.push({
          name,
          status: 'ok',
          count: 1,
          action: 'keep',
          branches: [
            {
              id: branchList[0].id,
              appointments: branchList[0]._count.appointments,
              orders: branchList[0]._count.orders,
              users: branchList[0]._count.users,
              artists: branchList[0]._count.artists,
            },
          ],
        });
      } else {
        const withData = branchList.filter(
          (b) =>
            b._count.appointments > 0 ||
            b._count.orders > 0 ||
            b._count.users > 0 ||
            b._count.artists > 0
        );

        const withoutData = branchList.filter(
          (b) =>
            b._count.appointments === 0 &&
            b._count.orders === 0 &&
            b._count.users === 0 &&
            b._count.artists === 0
        );

        if (withData.length > 0) {
          const keep = withData[0];
          toKeep.push(keep.id);

          // 標記其他有數據的也要刪除
          for (let i = 1; i < withData.length; i++) {
            toDelete.push(withData[i].id);
          }
        } else {
          const keep = branchList[0];
          toKeep.push(keep.id);
        }

        // 刪除所有無數據的（除了被保留的那個）
        for (const del of withoutData) {
          if (!toKeep.includes(del.id)) {
            toDelete.push(del.id);
          }
        }

        analysis.push({
          name,
          status: 'duplicate',
          count: branchList.length,
          withData: withData.length,
          withoutData: withoutData.length,
          toKeep: 1,
          toDelete: branchList.length - 1,
          branches: branchList.map((b) => ({
            id: b.id,
            action: toKeep.includes(b.id) ? 'keep' : 'delete',
            appointments: b._count.appointments,
            orders: b._count.orders,
            users: b._count.users,
            artists: b._count.artists,
          })),
        });
      }
    }

    return {
      total: branches.length,
      uniqueNames: Object.keys(branchesByName).length,
      toKeep: toKeep.length,
      toDelete: toDelete.length,
      analysis,
      deleteList: toDelete,
    };
  }

  @Post('branches/clean')
  async cleanBranches(@Query('confirm') confirm: string) {
    if (confirm !== 'true') {
      return {
        error: '請先使用 GET /admin/cleanup/branches/analyze 分析，然後使用 ?confirm=true 參數確認執行',
      };
    }

    console.log('🗑️ 開始清理冗餘分店...');

    // 先分析
    const analysis = await this.analyzeBranches();
    const toDelete = analysis.deleteList;

    if (toDelete.length === 0) {
      return {
        success: true,
        message: '沒有需要刪除的分店',
        deleted: 0,
      };
    }

    // 執行刪除
    const deleted: string[] = [];
    for (const id of toDelete) {
      try {
        await this.prisma.branch.delete({
          where: { id },
        });
        deleted.push(id);
        console.log(`   ✅ 已刪除: ${id}`);
      } catch (error: any) {
        console.error(`   ❌ 刪除失敗: ${id}`, error.message);
      }
    }

    // 驗證結果
    const finalBranches = await this.prisma.branch.findMany({
      include: {
        _count: {
          select: {
            appointments: true,
            orders: true,
            users: true,
            artists: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      deleted: deleted.length,
      deletedIds: deleted,
      remaining: finalBranches.length,
      branches: finalBranches.map((b) => ({
        id: b.id,
        name: b.name,
        appointments: b._count.appointments,
        orders: b._count.orders,
        users: b._count.users,
        artists: b._count.artists,
      })),
    };
  }
}

