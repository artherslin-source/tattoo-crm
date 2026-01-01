import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface ArtistResetResult {
  artistId: string;
  userId: string;
  displayName: string | null;
  phone: string | null;
  branchName: string | null;
  passwordReset: boolean;
  phoneAssigned: boolean;
  skippedReason: string | null;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批次重設所有刺青師的登入密碼為 12345678
   * 並自動補齊缺少的手機號碼（生成 0900000xxx）
   */
  async resetArtistsLogin(): Promise<{
    success: boolean;
    defaultPassword: string;
    results: ArtistResetResult[];
    summary: {
      total: number;
      passwordReset: number;
      phoneAssigned: number;
      skipped: number;
      errors: number;
    };
  }> {
    console.log('🔧 開始批次重設刺青師登入...');

    const defaultPassword = '12345678';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // 查詢所有刺青師
    const artists = await this.prisma.artist.findMany({
      include: {
        user: true,
        branch: { select: { name: true } },
      },
    });

    console.log(`📊 找到 ${artists.length} 位刺青師`);

    const results: ArtistResetResult[] = [];
    let passwordResetCount = 0;
    let phoneAssignedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const artist of artists) {
      const result: ArtistResetResult = {
        artistId: artist.id,
        userId: artist.userId,
        displayName: artist.displayName,
        phone: artist.user.phone,
        branchName: artist.branch?.name || null,
        passwordReset: false,
        phoneAssigned: false,
        skippedReason: null,
      };

      try {
        // 檢查帳號是否停用
        if (!artist.user.isActive || String(artist.user.status || '').toUpperCase() === 'DISABLED') {
          result.skippedReason = '帳號已停用（未自動啟用）';
          skippedCount++;
          results.push(result);
          console.log(`⚠️  跳過已停用帳號: ${artist.displayName} (${artist.user.phone || 'no phone'})`);
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          const updateData: any = {
            hashedPassword,
          };

          // 檢查是否需要補手機號碼
          if (!artist.user.phone || artist.user.phone.trim() === '') {
            // 生成不重複的手機號碼
            const newPhone = await this.generateUniquePhone(tx);
            updateData.phone = newPhone;
            result.phone = newPhone;
            result.phoneAssigned = true;
            phoneAssignedCount++;
            console.log(`📱 為 ${artist.displayName} 分配手機號碼: ${newPhone}`);
          }

          // 更新用戶密碼（和手機號碼，如果需要）
          await tx.user.update({
            where: { id: artist.userId },
            data: updateData,
          });

          result.passwordReset = true;
          passwordResetCount++;
          console.log(`✅ 重設密碼: ${artist.displayName} (${result.phone})`);
        });

        results.push(result);
      } catch (error) {
        result.skippedReason = `錯誤: ${error instanceof Error ? error.message : String(error)}`;
        errorCount++;
        results.push(result);
        console.error(`❌ 處理失敗 ${artist.displayName}:`, error);
      }
    }

    console.log(`\n✅ 批次重設完成！`);
    console.log(`📊 總計: ${artists.length}`);
    console.log(`✅ 密碼重設: ${passwordResetCount}`);
    console.log(`📱 手機分配: ${phoneAssignedCount}`);
    console.log(`⚠️  跳過: ${skippedCount}`);
    console.log(`❌ 錯誤: ${errorCount}`);

    return {
      success: true,
      defaultPassword,
      results,
      summary: {
        total: artists.length,
        passwordReset: passwordResetCount,
        phoneAssigned: phoneAssignedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    };
  }

  /**
   * 生成不重複的手機號碼（格式：0900000xxx）
   */
  private async generateUniquePhone(tx: any): Promise<string> {
    const prefix = '0900000';
    const maxAttempts = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      // 生成 001-999 範圍的後綴
      const suffix = String(i + 1).padStart(3, '0');
      const phone = prefix + suffix;

      // 檢查是否已存在
      const existing = await tx.user.findUnique({
        where: { phone },
      });

      if (!existing) {
        return phone;
      }
    }

    throw new Error('無法生成唯一的手機號碼（已達到最大嘗試次數）');
  }
}

