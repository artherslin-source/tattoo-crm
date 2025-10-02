import { Body, Controller, HttpCode, HttpStatus, Post, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
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
      console.log('📥 收到登入請求:', { email: (body as any)?.email });
      
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
    const input = ChangePasswordSchema.parse(body);
    return this.authService.changePassword(req.user.userId, input.oldPassword, input.newPassword);
  }
}



