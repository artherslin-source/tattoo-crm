import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  async validate(payload: any) {
    console.log('🔍 JWT Strategy validate called with payload:', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      branchId: payload.branchId,
      iat: payload.iat,
      exp: payload.exp
    });

    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException('Invalid token payload');

    // Always re-fetch user from DB to enforce latest role/branch and block disabled accounts
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        branchId: true,
        isActive: true,
        status: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isActive || String(user.status || '').toUpperCase() === 'DISABLED') {
      throw new UnauthorizedException('Account disabled');
    }

    return {
      id: user.id,
      email: user.email ?? user.phone ?? payload.email ?? null,
      role: user.role ?? null,
      branchId: user.branchId ?? null,
      isActive: user.isActive,
      status: user.status ?? null,
    };
  }
}


