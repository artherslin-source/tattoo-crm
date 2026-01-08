import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { normalizePhoneDigits } from '../common/utils/phone';

interface RegisterDto {
  phone: string;
  password: string;
  name: string;
}

interface LoginDto {
  phone: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const phone = normalizePhoneDigits(input.phone);
    if (!phone) throw new BadRequestException('手機號碼格式不正確（需 10~15 位數字）');
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) throw new BadRequestException('手機號碼已被註冊');
    const hashedPassword = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone,
        email: null,
        hashedPassword,
        name: input.name,
      },
    });
    return this.issueTokens(user.id, user.phone || '', user.role || 'USER');
  }

  async login(input: LoginDto) {
    console.log(`🔐 嘗試登入: ${input.phone}`);
    
    try {
      // 查找用戶
      const user = await this.prisma.user.findUnique({ 
        where: { phone: input.phone },
        include: { branch: true }
      });
      
      if (!user) {
        console.log(`❌ 用戶不存在: ${input.phone}`);
        throw new UnauthorizedException('User not found');
      }

      // Block disabled accounts (matches JwtStrategy behavior)
      if (!user.isActive || String(user.status || '').toUpperCase() === 'DISABLED') {
        console.log(`❌ 帳號已停用: ${input.phone}`);
        throw new UnauthorizedException('Account disabled');
      }
      
      console.log(`✅ 找到用戶: ${user.phone}, ID: ${user.id}`);
      
      // 驗證密碼
      let passwordValid = false;
      try {
        passwordValid = await bcrypt.compare(input.password, user.hashedPassword);
      } catch (bcryptError) {
        console.error('❌ bcrypt.compare 錯誤:', bcryptError);
        throw new UnauthorizedException('Invalid credentials');
      }
      
      if (!passwordValid) {
        console.log(`❌ 密碼錯誤: ${input.phone}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      
      console.log(`✅ 密碼驗證成功: ${input.phone}`);
      
      // 更新最後登入時間
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
        console.log(`✅ 更新最後登入時間: ${user.phone}`);
      } catch (updateError) {
        console.error('⚠️ 更新最後登入時間失敗:', updateError);
        // 不影響登入流程，繼續執行
      }
      
      // 簽發 JWT tokens
      try {
        const tokens = await this.issueTokens(user.id, user.phone || user.email || '', user.role || 'USER', user.branchId || undefined);
        console.log(`✅ 登入成功: ${user.phone}`);
        return tokens;
      } catch (jwtError) {
        console.error('❌ JWT 簽發失敗:', jwtError);
        throw new UnauthorizedException('Token generation failed');
      }
      
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('❌ 登入過程發生未預期錯誤:', error);
      throw new UnauthorizedException('Login failed');
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      
      // 從資料庫重新獲取用戶信息，確保使用最新的 phone 和 role
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { branch: true }
      });
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive || String(user.status || '').toUpperCase() === 'DISABLED') {
        throw new UnauthorizedException('Account disabled');
      }
      
      // 使用 phone 或 email 作為標識（優先使用 phone）
      const identifier = user.phone || user.email || '';
      return this.issueTokens(user.id, identifier, user.role || 'USER', user.branchId || undefined);
    } catch (error) {
      console.error('❌ Refresh token 驗證失敗:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    if (!userId) throw new UnauthorizedException('User not found');
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId },
      include: { branch: true }
    });
    if (!user) throw new UnauthorizedException('User not found');
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branch: user.branch,
      phone: user.phone,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!isOldPasswordValid) {
      throw new BadRequestException('舊密碼不正確');
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedPassword: hashedNewPassword },
    });
    
    return { success: true };
  }

  /**
   * 初始化 BOSS 帳號
   * 用於修復或創建 BOSS 帳號，確保可以登入
   */
  async fixAdminArtistPhones() {
    console.log('🔧 開始更新管理員和刺青師的手機號碼...\n');

    const results: any = {
      boss: null,
      managers: [],
      artists: [],
      errors: [],
    };

    try {
      // 1. 更新 BOSS 帳號
      console.log('📱 更新 BOSS 帳號...');
      const boss = await this.prisma.user.findFirst({
        where: { role: 'BOSS' },
      });

      if (boss) {
        // 檢查目標手機號碼是否已被其他用戶使用
        const existingUser = await this.prisma.user.findUnique({
          where: { phone: '0988666888' },
        });

        if (existingUser && existingUser.id !== boss.id) {
          const msg = `手機號碼 0988666888 已被用戶 ${existingUser.name} (${existingUser.id}) 使用，跳過更新`;
          console.log(`⚠️  ${msg}`);
          results.errors.push(msg);
        } else {
          await this.prisma.user.update({
            where: { id: boss.id },
            data: { phone: '0988666888' },
          });
          console.log(`✅ BOSS 帳號 (${boss.name}) 手機號碼已更新為：0988666888`);
          results.boss = { name: boss.name, phone: '0988666888', status: 'updated' };
        }
      } else {
        const msg = '未找到 BOSS 帳號';
        console.log(`⚠️  ${msg}`);
        results.errors.push(msg);
      }

      // 2. 更新分店經理
      console.log('\n📱 更新分店經理...');
      const managers = await this.prisma.user.findMany({
        where: { role: 'BRANCH_MANAGER' },
        include: { branch: true },
      });

      const managerPhones: Record<string, string> = {
        '三重店經理': '0911111111',
        '東港店經理': '0922222222',
      };

      for (const manager of managers) {
        const targetPhone = managerPhones[manager.name || ''];
        if (targetPhone) {
          // 檢查目標手機號碼是否已被其他用戶使用
          const existingUser = await this.prisma.user.findUnique({
            where: { phone: targetPhone },
          });

          if (existingUser && existingUser.id !== manager.id) {
            const msg = `手機號碼 ${targetPhone} 已被用戶 ${existingUser.name} (${existingUser.id}) 使用，跳過更新`;
            console.log(`⚠️  ${msg}`);
            results.errors.push(msg);
            results.managers.push({ name: manager.name, phone: targetPhone, status: 'skipped', reason: msg });
          } else {
            await this.prisma.user.update({
              where: { id: manager.id },
              data: { phone: targetPhone },
            });
            console.log(`✅ ${manager.name} (${manager.branch?.name || '未知分店'}) 手機號碼已更新為：${targetPhone}`);
            results.managers.push({ name: manager.name, branch: manager.branch?.name, phone: targetPhone, status: 'updated' });
          }
        } else {
          const msg = `未找到 ${manager.name} 的對應手機號碼配置`;
          console.log(`⚠️  ${msg}`);
          results.errors.push(msg);
          results.managers.push({ name: manager.name, status: 'not_found', reason: msg });
        }
      }

      // 3. 更新刺青師
      console.log('\n📱 更新刺青師...');
      const artists = await this.prisma.artist.findMany({
        include: {
          user: true,
          branch: true,
        },
      });

      const artistPhones: Record<string, string> = {
        '陳震宇': '0933333333',
        '黃晨洋': '0944444444',
        '林承葉': '0955555555',
      };

      for (const artist of artists) {
        const targetPhone = artistPhones[artist.displayName || ''];
        if (targetPhone) {
          // 檢查目標手機號碼是否已被其他用戶使用
          const existingUser = await this.prisma.user.findUnique({
            where: { phone: targetPhone },
          });

          if (existingUser && existingUser.id !== artist.user.id) {
            const msg = `手機號碼 ${targetPhone} 已被用戶 ${existingUser.name} (${existingUser.id}) 使用，跳過更新`;
            console.log(`⚠️  ${msg}`);
            results.errors.push(msg);
            results.artists.push({ name: artist.displayName, phone: targetPhone, status: 'skipped', reason: msg });
          } else {
            await this.prisma.user.update({
              where: { id: artist.user.id },
              data: { phone: targetPhone },
            });
            console.log(`✅ ${artist.displayName} (${artist.branch?.name || '未知分店'}) 手機號碼已更新為：${targetPhone}`);
            results.artists.push({ name: artist.displayName, branch: artist.branch?.name, phone: targetPhone, status: 'updated' });
          }
        } else {
          const msg = `未找到 ${artist.displayName} 的對應手機號碼配置`;
          console.log(`⚠️  ${msg}`);
          results.errors.push(msg);
          results.artists.push({ name: artist.displayName, status: 'not_found', reason: msg });
        }
      }

      console.log('\n✅ 手機號碼更新完成！');

      return {
        success: true,
        message: '手機號碼更新完成',
        results,
        accountList: {
          BOSS: '0988666888',
          '三重店經理': '0911111111',
          '東港店經理': '0922222222',
          '陳震宇': '0933333333',
          '黃晨洋': '0944444444',
          '林承葉': '0955555555',
        },
        defaultPassword: '12345678',
      };
    } catch (error) {
      console.error('❌ 更新失敗:', error);
      results.errors.push(`更新失敗: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async initBossAccount() {
    const bossPhone = '0988666888';
    const bossPassword = '12345678';
    const bossEmail = 'admin@test.com';

    try {
      console.log('🔧 開始初始化 BOSS 帳號...');

      // 先檢查是否已存在該手機號碼的用戶
      let existingUser = await this.prisma.user.findUnique({
        where: { phone: bossPhone }
      });

      if (existingUser) {
        console.log(`✅ 找到現有用戶（手機: ${bossPhone}），更新為 BOSS...`);
        const hashedPassword = await bcrypt.hash(bossPassword, 12);
        existingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: 'BOSS',
            hashedPassword: hashedPassword,
            email: bossEmail,
            name: 'Super Admin',
            isActive: true,
          }
        });
        return {
          success: true,
          message: 'BOSS 帳號已更新',
          phone: existingUser.phone,
          email: existingUser.email,
        };
      }

      // 檢查是否已有 BOSS 帳號
      const existingBoss = await this.prisma.user.findFirst({
        where: { role: 'BOSS' }
      });

      if (existingBoss) {
        console.log(`✅ 找到現有 BOSS 帳號，更新手機號碼...`);
        const hashedPassword = await bcrypt.hash(bossPassword, 12);
        const updated = await this.prisma.user.update({
          where: { id: existingBoss.id },
          data: {
            phone: bossPhone,
            email: bossEmail,
            hashedPassword: hashedPassword,
            name: 'Super Admin',
            isActive: true,
          }
        });
        return {
          success: true,
          message: 'BOSS 帳號已更新',
          phone: updated.phone,
          email: updated.email,
        };
      }

      // 創建新的 BOSS 帳號
      console.log('⚠️ 未找到 BOSS 帳號，正在創建...');
      const hashedPassword = await bcrypt.hash(bossPassword, 12);
      const newBoss = await this.prisma.user.create({
        data: {
          phone: bossPhone,
          email: bossEmail,
          hashedPassword: hashedPassword,
          name: 'Super Admin',
          role: 'BOSS',
          isActive: true,
        }
      });

      return {
        success: true,
        message: 'BOSS 帳號已創建',
        phone: newBoss.phone,
        email: newBoss.email,
      };
    } catch (error) {
      console.error('❌ 初始化 BOSS 帳號失敗:', error);
      throw error;
    }
  }

  private async issueTokens(userId: string, email: string, role: string, branchId?: string) {
    try {
      console.log(`🔑 開始簽發 JWT tokens for user: ${email}`);
      
      // 檢查 JWT secrets 是否存在
      if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
        console.error('❌ JWT secrets 未設定');
        throw new Error('JWT secrets not configured');
      }
      
      const access = await this.jwtService.signAsync(
        { sub: userId, email, role, branchId },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
      );
      
      const refresh = await this.jwtService.signAsync(
        { sub: userId, email, role, branchId },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_TTL || '7d' },
      );
      
      console.log(`✅ JWT tokens 簽發成功 for user: ${email}`);
      return { accessToken: access, refreshToken: refresh };
    } catch (error) {
      console.error('❌ JWT tokens 簽發失敗:', error);
      throw error;
    }
  }
}



