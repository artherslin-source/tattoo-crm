import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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
    const existing = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) throw new BadRequestException('手機號碼已被註冊');
    const hashedPassword = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: input.phone,
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
      return this.issueTokens(payload.sub, payload.email, payload.role, payload.branchId);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
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



