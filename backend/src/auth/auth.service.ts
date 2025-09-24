import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new BadRequestException('Email already registered');
    const hashedPassword = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        hashedPassword,
        name: input.name,
        phone: input.phone ?? null,
      },
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({ 
      where: { email: input.email },
      include: { branch: true }
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.hashedPassword);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    
    // Update lastLogin timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    
    return this.issueTokens(user.id, user.email, user.role, user.branchId || undefined);
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
    const access = await this.jwtService.signAsync(
      { sub: userId, email, role, branchId },
      { secret: process.env.JWT_ACCESS_SECRET as string, expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
    );
    const refresh = await this.jwtService.signAsync(
      { sub: userId, email, role, branchId },
      { secret: process.env.JWT_REFRESH_SECRET as string, expiresIn: process.env.JWT_REFRESH_TTL || '7d' },
    );
    return { accessToken: access, refreshToken: refresh };
  }
}



