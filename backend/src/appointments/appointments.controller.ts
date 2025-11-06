import { Body, Controller, Get, Post, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { AppointmentsService } from './appointments.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

const CreateAppointmentSchema = z.object({
  contactId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  artistId: z.string().optional(),
  serviceId: z.string().optional(),
  branchId: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  notes: z.string().optional(),
});

const CreatePublicAppointmentSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  artistId: z.string(),
  serviceId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
});

const UpdateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']),
});

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  // 公開預約端點（不需要認證）
  @Post('public')
  async createPublic(@Body() body: unknown) {
    const input = CreatePublicAppointmentSchema.parse(body);
    
    // 根據 artistId 獲取分店 ID
    const artist = await this.appointments['prisma'].artist.findUnique({
      where: { userId: input.artistId },
      select: { branchId: true }
    });
    
    if (!artist?.branchId) {
      throw new Error('無法找到指定的刺青師或分店');
    }
    
    // 創建臨時用戶或使用現有用戶
    let userId: string;
    const existingUser = await this.appointments['prisma'].user.findFirst({
      where: { email: input.email }
    });
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // 創建臨時用戶
      const tempUser = await this.appointments['prisma'].user.create({
        data: {
          email: input.email,
          name: input.name,
          phone: input.phone,
          role: 'MEMBER',
          branchId: artist.branchId,
          hashedPassword: 'temp-password', // 臨時密碼，用戶需要後續設定
        }
      });
      userId = tempUser.id;
    }
    
    return this.appointments.create({
      userId,
      artistId: input.artistId,
      serviceId: input.serviceId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      notes: input.notes,
      branchId: artist.branchId,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: any, @Body() body: unknown) {
    try {
      const input = CreateAppointmentSchema.parse(body);
      
      // 獲取用戶的分店 ID
      let branchId = req.user.branchId || input.branchId;
      
      // 如果用戶沒有分店 ID，嘗試從 artist 獲取
      if (!branchId && input.artistId) {
        const artist = await this.appointments['prisma'].artist.findUnique({
          where: { userId: input.artistId },
          select: { branchId: true }
        });
        branchId = artist?.branchId;
      }
      
      if (!branchId) {
        throw new Error('無法確定分店，請聯繫管理員');
      }
      
      // 處理客戶資訊和 contact
      let userId: string;
      let contactId: string | undefined = input.contactId;
      
      // 如果有 contactId，直接使用
      if (contactId) {
        // 驗證 contact 存在
        const contact = await this.appointments['prisma'].contact.findUnique({
          where: { id: contactId }
        });
        if (!contact) {
          throw new Error('指定的聯絡記錄不存在');
        }
        
        // 從 contact 創建或查找用戶
        if (contact.email) {
          const existingUser = await this.appointments['prisma'].user.findFirst({
            where: { email: contact.email }
          });
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
            // 創建新客戶
            const tempUser = await this.appointments['prisma'].user.create({
              data: {
                email: contact.email,
                name: contact.name,
                phone: contact.phone,
                role: 'MEMBER',
                branchId: branchId,
                hashedPassword: 'temp-password', // 臨時密碼，用戶需要後續設定
              }
            });
            userId = tempUser.id;
          }
        } else {
          userId = req.user.id;
        }
      } else if (input.name && input.email) {
        // 沒有 contactId 但有客戶資訊，自動創建 contact
        const newContact = await this.appointments['prisma'].contact.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone || '',
            notes: input.notes || '',
            branchId: branchId,
            status: 'PENDING',
          }
        });
        contactId = newContact.id;
        
        // 創建或查找用戶
        const existingUser = await this.appointments['prisma'].user.findFirst({
          where: { email: input.email }
        });
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          // 創建新客戶
          const tempUser = await this.appointments['prisma'].user.create({
            data: {
              email: input.email,
              name: input.name,
              phone: input.phone,
              role: 'MEMBER',
              branchId: branchId,
              hashedPassword: 'temp-password', // 臨時密碼，用戶需要後續設定
            }
          });
          userId = tempUser.id;
        }
      } else {
        // 沒有客戶資訊，使用管理員的 userId（用於內部預約）
        userId = req.user.id;
      }
      
      return this.appointments.create({
        userId,
        artistId: input.artistId,
        serviceId: input.serviceId,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        notes: input.notes,
        branchId,
        contactId: contactId,
      });
    } catch (error) {
      console.error('Create appointment error:', error);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async my(@Req() req: any) {
    console.log('🔐 /appointments/my called by user:', req.user);
    
    if (!req.user || !req.user.id) {
      throw new Error('用戶認證失敗：缺少用戶 ID');
    }
    
    console.log('📋 查詢用戶預約，userId:', req.user.id);
    const appointments = await this.appointments.myAppointments(req.user.id);
    console.log('✅ 返回預約數量:', appointments.length);
    
    return appointments;
  }

  // 管理員專用：查詢所有預約（必須放在 @Get(':id') 之前）
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('BOSS', 'BRANCH_MANAGER')
  async findAllAppointments(@Req() req: any) {
    return this.appointments.findAll(req.user.role, req.user.branchId);
  }

  // 管理員專用：更新預約狀態
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('BOSS', 'BRANCH_MANAGER')
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateStatusSchema.parse(body);
    return this.appointments.updateStatus(id, input.status);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appointments.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateAppointmentSchema.parse(body);
    return this.appointments.update(id, input.status);
  }
}



