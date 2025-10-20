import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ServicesService } from '../services/services.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { z } from 'zod';

const CreateServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().positive(),
  currency: z.string().default('TWD'),
  durationMin: z.number().int().positive(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

const UpdateServiceSchema = CreateServiceSchema.partial();

@Controller('admin/services')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('active') active?: string,
    @Query('sortBy') sortBy?: 'name' | 'price' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.services.findAll({});
  }

  @Post()
  async create(@Body() body: unknown) {
    const input = CreateServiceSchema.parse(body);
    return this.services.create(input);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateServiceSchema.parse(body);
    return this.services.update(id, input);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.services.delete(id);
  }

  // 新增：獲取服務項目圖片列表
  @Get('images')
  async getServiceImages(@Query('category') category?: string) {
    const fs = require('fs');
    const path = require('path');
    
    const servicesPath = join(process.cwd(), 'uploads', 'services');
    
    // 如果資料夾不存在，創建它
    if (!existsSync(servicesPath)) {
      mkdirSync(servicesPath, { recursive: true });
    }

    const images: Array<{
      filename: string;
      path: string;
      category: string;
      url: string;
      size: number;
      lastModified: Date;
    }> = [];

    // 定義分類資料夾
    const categories = category ? [category] : ['arm', 'leg', 'back', 'other'];
    
    for (const cat of categories) {
      const categoryPath = join(servicesPath, cat);
      
      if (existsSync(categoryPath)) {
        const files = fs.readdirSync(categoryPath);
        
        for (const file of files) {
          const filePath = join(categoryPath, file);
          const stats = fs.statSync(filePath);
          
          // 只處理圖片文件
          if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
            images.push({
              filename: file,
              path: `/uploads/services/${cat}/${file}`,
              category: cat,
              url: `/uploads/services/${cat}/${file}`,
              size: stats.size,
              lastModified: stats.mtime,
            });
          }
        }
      }
    }

    // 按修改時間排序（最新的在前）
    images.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return {
      images,
      categories: ['arm', 'leg', 'back', 'other'],
      total: images.length,
    };
  }

  // 新增：上傳服務項目圖片
  @Post('images/upload')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, callback) => {
        const category = req.body.category || 'other';
        const uploadPath = join(process.cwd(), 'uploads', 'services', category);
        
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        // 自動生成唯一檔名，不依賴原始檔名
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const ext = extname(file.originalname);
        const filename = `service-${timestamp}-${randomString}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return callback(new Error('只允許上傳圖片文件 (JPG, JPEG, PNG, GIF, WebP)'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async uploadServiceImage(
    @Body() body: { category: string },
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new Error('沒有上傳文件');
    }

    const category = body.category || 'other';
    const imageUrl = `/uploads/services/${category}/${file.filename}`;

    return {
      success: true,
      message: '圖片上傳成功',
      data: {
        filename: file.filename,
        originalName: file.originalname,
        category,
        url: imageUrl,
        size: file.size,
        displayName: file.originalname, // 用於前端顯示的名稱
      },
    };
  }

  // 新增：刪除服務項目圖片
  @Delete('images/:category/:filename')
  async deleteServiceImage(
    @Param('category') category: string,
    @Param('filename') filename: string
  ) {
    const fs = require('fs');
    const path = require('path');
    
    const imagePath = join(process.cwd(), 'uploads', 'services', category, filename);
    
    if (!existsSync(imagePath)) {
      throw new Error('圖片文件不存在');
    }

    try {
      fs.unlinkSync(imagePath);
      return {
        success: true,
        message: '圖片刪除成功',
      };
    } catch (error) {
      throw new Error('刪除圖片失敗');
    }
  }
}