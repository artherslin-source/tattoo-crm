import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Req, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminArtistsService } from './admin-artists.service';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { z } from 'zod';

const CreateArtistSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  branchId: z.string().optional(),
  speciality: z.string().optional(),
  portfolioUrl: z.string().optional(),
  active: z.boolean().optional(),
});

const UpdateArtistSchema = CreateArtistSchema.partial();

@Controller('admin/artists')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminArtistsController {
  constructor(
    private readonly adminArtistsService: AdminArtistsService,
    private readonly prisma: PrismaService,
    private readonly branchesService: BranchesService
  ) {}

  @Get('direct-test')
  async directTest() {
    console.log('🧪 Direct Prisma test');
    return this.prisma.artist.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('branches')
  async getBranches(@Req() req: any) {
    console.log('🎯 AdminArtistsController.getBranches called');
    console.log('🔍 User info:', { role: req.user?.role, branchId: req.user?.branchId });
    
    // 如果是分店經理，只返回自己的分店
    if (req.user?.role === 'BRANCH_MANAGER' && req.user?.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: req.user.branchId },
        select: { id: true, name: true }
      });
      return branch ? [branch] : [];
    }
    
    // BOSS 可以看到所有分店
    return this.branchesService.list();
  }

  @Get()
  async findAll(@Req() req: any) {
    console.log('🎯 AdminArtistsController.findAll called');
    console.log('🔍 User info:', { role: req.user?.role, branchId: req.user?.branchId });
    try {
      console.log('🔧 Trying to call adminArtistsService.findAll()');
      return this.adminArtistsService.findAll(req.user?.role, req.user?.branchId);
    } catch (error) {
      console.log('❌ Error calling adminArtistsService:', error);
      console.log('🔧 Trying direct Prisma query as fallback');
      return this.prisma.artist.findMany({
        include: { 
          user: true,
          branch: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: any) {
    const input = CreateArtistSchema.parse(body);
    
    // 如果是 BOSS，需要指定 branchId；如果是 BRANCH_MANAGER，使用自己的 branchId
    const branchId = input.branchId || req.user.branchId;
    
    if (!branchId) {
      throw new Error('需要指定分店 ID');
    }

    return this.adminArtistsService.create({
      name: input.name,
      email: input.email,
      password: 'temp_password_12345678', // 臨時密碼，需要後續修改
      branchId,
      speciality: input.speciality,
      portfolioUrl: input.portfolioUrl,
    });
  }

  @Get(':id/portfolio')
  async getArtistPortfolio(@Param('id') id: string, @Req() req: any) {
    // 驗證該刺青師是否存在
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: { id: true, branchId: true }
    });

    if (!artist) {
      throw new NotFoundException('刺青師不存在');
    }

    // 如果是分店經理，驗證是否為同分店
    if (req.user?.role === 'BRANCH_MANAGER' && req.user?.branchId !== artist.branchId) {
      throw new ForbiddenException('無權限查看此刺青師的作品');
    }

    // 獲取作品列表
    return this.prisma.portfolioItem.findMany({
      where: { artistId: id },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminArtistsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    console.log('🎯 AdminArtistsController.update called with:', { id, body });
    const input = UpdateArtistSchema.parse(body);
    console.log('🔍 Parsed input:', input);

    const result = await this.adminArtistsService.update(id, {
      name: input.name,
      email: input.email,
      branchId: input.branchId,
      speciality: input.speciality,
      portfolioUrl: input.portfolioUrl,
      active: input.active,
    });
    
    console.log('✅ Update result:', result);
    return result;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.adminArtistsService.delete(id);
  }

  // 上傳刺青師照片（允許管理員和刺青師自己上傳）
  @Post('upload-photo')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BOSS', 'BRANCH_MANAGER', 'ARTIST')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (req, file, callback) => {
        try {
          const uploadPath = join(process.cwd(), 'uploads', 'artists');
          
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          callback(null, uploadPath);
        } catch (error) {
          console.error('❌ 創建上傳目錄失敗:', error);
          callback(new Error('無法創建上傳目錄'), '');
        }
      },
      filename: (req, file, callback) => {
        try {
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 8);
          const ext = extname(file.originalname || '');
          const filename = `artist-${timestamp}-${randomString}${ext}`;
          callback(null, filename);
        } catch (error) {
          console.error('❌ 生成檔名失敗:', error);
          callback(new Error('無法生成檔名'), '');
        }
      },
    }),
    fileFilter: (req, file, callback) => {
      try {
        if (!file || !file.originalname) {
          return callback(new Error('文件資訊不完整'), false);
        }
        
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return callback(new Error('只允許上傳圖片文件 (JPG, JPEG, PNG, GIF, WebP)'), false);
        }
        callback(null, true);
      } catch (error) {
        console.error('❌ 文件過濾失敗:', error);
        callback(new Error('文件驗證失敗'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    try {
      if (!file) {
        throw new BadRequestException('沒有選擇要上傳的圖片文件');
      }

      const imageUrl = `/uploads/artists/${file.filename}`;
      
      console.log('✅ 刺青師照片上傳成功:', {
        filename: file.filename,
        url: imageUrl,
        size: file.size
      });
      
      return {
        success: true,
        message: '照片上傳成功',
        url: imageUrl,
        filename: file.filename,
      };
    } catch (error) {
      console.error('❌ 照片上傳錯誤:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || '照片上傳失敗，請檢查文件格式和大小（最大 10MB）'
      );
    }
  }
}
