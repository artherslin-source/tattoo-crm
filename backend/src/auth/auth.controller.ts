import { Body, Controller, HttpCode, HttpStatus, Post, Get, UseGuards, Req } from '@nestjs/common';
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
    const input = LoginSchema.parse(body);
    return this.authService.login(input);
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



