import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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
    
    return { 
      id: payload.sub, 
      email: payload.email, 
      role: payload.role,
      branchId: payload.branchId 
    };
  }
}


