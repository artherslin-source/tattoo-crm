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

interface MemberResetResult {
  userId: string;
  name: string | null;
  email: string | null;
  oldPhone: string | null;
  phone: string | null;
  passwordReset: boolean;
  phoneChanged: boolean;
  phoneNormalized: boolean;
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

  /**
   * 會員 phone 正規化：保留數字並檢查長度（10~15）
   */
  private normalizePhoneDigits(raw: string | null | undefined): { digits: string | null; normalized: boolean } {
    if (!raw) return { digits: null, normalized: false };
    const trimmed = raw.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return { digits: null, normalized: false };
    const ok = /^\d{10,15}$/.test(digits);
    return { digits: ok ? digits : null, normalized: ok && digits !== trimmed };
  }

  /**
   * 生成不重複的測試會員手機號碼（格式：099xxxxxxxx）
   * - 避免與真實號碼混淆（以 099 開頭）
   */
  private async generateUniqueMemberPhone(tx: any, seed: number): Promise<string> {
    const prefix = '099';
    const maxAttempts = 200000;
    for (let k = 0; k < maxAttempts; k++) {
      const suffix = String((seed * 9973 + k) % 10000000).padStart(7, '0');
      const phone = `${prefix}${suffix}`; // 10 digits
      const existing = await tx.user.findUnique({ where: { phone } });
      if (!existing) return phone;
    }
    throw new Error('無法生成唯一的會員手機號碼（已達到最大嘗試次數）');
  }

  /**
   * 批次重設所有會員（MEMBER）的登入資料：
   * - phone：確保為純數字 10~15 碼且唯一（若原本格式不符，會產生新的 099xxxxxxxx）
   * - password：重設為 12345678
   * - isActive/status：測試資料用途，統一設為可登入（isActive=true, status=null）
   */
  async resetMembersLogin(): Promise<{
    success: boolean;
    defaultPassword: string;
    results: MemberResetResult[];
    summary: {
      total: number;
      passwordReset: number;
      phoneChanged: number;
      phoneNormalized: number;
      skipped: number;
      errors: number;
    };
  }> {
    console.log('🔧 開始批次重設會員登入...');

    const defaultPassword = '12345678';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const members = await this.prisma.user.findMany({
      where: { role: 'MEMBER' },
      select: { id: true, name: true, email: true, phone: true, isActive: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📊 找到 ${members.length} 位會員`);

    const results: MemberResetResult[] = [];
    let passwordResetCount = 0;
    let phoneChangedCount = 0;
    let phoneNormalizedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < members.length; i++) {
      const u = members[i];
      const result: MemberResetResult = {
        userId: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        oldPhone: u.phone ?? null,
        phone: u.phone ?? null,
        passwordReset: false,
        phoneChanged: false,
        phoneNormalized: false,
        skippedReason: null,
      };

      try {
        await this.prisma.$transaction(async (tx) => {
          // Normalize phone if possible, else generate a new one.
          const { digits, normalized } = this.normalizePhoneDigits(u.phone ?? undefined);
          let nextPhone: string | null = digits;
          let usedNormalized = normalized;

          // If digits is null OR already used by someone else, generate a new test phone
          if (!nextPhone) {
            nextPhone = await this.generateUniqueMemberPhone(tx, i + 1);
            usedNormalized = false;
          } else {
            const existing = await tx.user.findUnique({ where: { phone: nextPhone } });
            if (existing && existing.id !== u.id) {
              nextPhone = await this.generateUniqueMemberPhone(tx, i + 1);
              usedNormalized = false;
            }
          }

          const phoneChanged = (u.phone ?? null) !== nextPhone;
          if (phoneChanged) phoneChangedCount++;
          if (usedNormalized) phoneNormalizedCount++;

          await tx.user.update({
            where: { id: u.id },
            data: {
              phone: nextPhone,
              hashedPassword,
              isActive: true,
              status: null,
            },
          });

          result.phone = nextPhone;
          result.passwordReset = true;
          result.phoneChanged = phoneChanged;
          result.phoneNormalized = usedNormalized;
          passwordResetCount++;
        });

        results.push(result);
      } catch (error) {
        result.skippedReason = `錯誤: ${error instanceof Error ? error.message : String(error)}`;
        errorCount++;
        results.push(result);
        console.error(`❌ 處理失敗 MEMBER ${u.id}:`, error);
      }
    }

    // No skipping path currently, keep for compatibility / future.
    skippedCount = results.filter((r) => !!r.skippedReason).length;

    console.log(`\n✅ 會員批次重設完成！`);
    console.log(`📊 總計: ${members.length}`);
    console.log(`✅ 密碼重設: ${passwordResetCount}`);
    console.log(`📱 phone 變更: ${phoneChangedCount}`);
    console.log(`🧹 phone 正規化: ${phoneNormalizedCount}`);
    console.log(`⚠️  跳過: ${skippedCount}`);
    console.log(`❌ 錯誤: ${errorCount}`);

    return {
      success: true,
      defaultPassword,
      results,
      summary: {
        total: members.length,
        passwordReset: passwordResetCount,
        phoneChanged: phoneChangedCount,
        phoneNormalized: phoneNormalizedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    };
  }
}

