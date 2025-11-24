import { Body, Controller, HttpCode, HttpStatus, Post, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';

const RegisterSchema = z.object({
  phone: z.string().min(10).regex(/^[0-9]+$/, '手機號碼只能包含數字'),
  password: z.string().min(8),
  name: z.string().min(1),
  email: z.preprocess(
    (val) => val === undefined || val === null || val === '' ? undefined : val,
    z.string().email().optional()
  ),
});

const LoginSchema = z.object({
  phone: z.string().min(10).regex(/^[0-9]+$/, '手機號碼只能包含數字'),
  password: z.string().min(8),
});

const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const input = RegisterSchema.parse(body);
    return this.authService.register(input);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: unknown) {
    try {
      console.log('📥 收到登入請求:', { phone: (body as any)?.phone });
      
      // 驗證輸入格式
      let input;
      try {
        input = LoginSchema.parse(body);
      } catch (validationError) {
        console.error('❌ 輸入驗證失敗:', validationError);
        throw new BadRequestException('Invalid input format');
      }
      
      const result = await this.authService.login(input);
      console.log('📤 登入請求處理完成');
      return result;
    } catch (error) {
      console.error('❌ 登入請求處理失敗:', error);
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() body: { refreshToken?: string }) {
    if (!body?.refreshToken) {
      return { error: 'refreshToken is required' };
    }
    return this.authService.refresh(body.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() body: unknown) {
    console.log('🔐 /auth/change-password called by user:', req.user);
    
    if (!req.user || !req.user.id) {
      throw new Error('用戶認證失敗：缺少用戶 ID');
    }
    
    const input = ChangePasswordSchema.parse(body);
    return this.authService.changePassword(req.user.id, input.oldPassword, input.newPassword);
  }
}



