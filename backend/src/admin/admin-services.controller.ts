import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ServicesService } from '../services/services.service';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { z } from 'zod';

// 嘗試將瀏覽器上傳時以 latin1/ISO-8859-1 編碼的檔名轉為 UTF-8（支援繁體中文）
function normalizeFilename(name: string): string {
  try {
    // 若本身就是 ASCII 或已是 UTF-8，直接回傳
    if (/^[\x00-\x7F]+$/.test(name)) return name;
    // 嘗試以 latin1 轉為 UTF-8
    const converted = Buffer.from(name, 'latin1').toString('utf8');
    // 若轉換後包含中日韓統一表意文字，視為正常中文
    if (/[\u4E00-\u9FFF]/.test(converted)) return converted;
    // 否則回傳原值
    return name;
  } catch {
    return name;
  }
}

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
    try {
      return await this.services.delete(id);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('刪除服務時發生未知錯誤');
    }
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
      originalName?: string;
      displayName?: string;
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
            // 嘗試讀取同名的中繼資料 (原始檔名)
            let originalName: string | undefined;
            let displayName: string | undefined;
            try {
              const metaPath = `${filePath}.meta.json`;
              if (existsSync(metaPath)) {
                const raw = fs.readFileSync(metaPath, 'utf-8');
                const meta = JSON.parse(raw);
                const o = meta.originalName || meta.displayName;
                const d = meta.displayName || meta.originalName;
                originalName = o ? normalizeFilename(o) : undefined;
                displayName = d ? normalizeFilename(d) : undefined;
              }
            } catch {}

            images.push({
              filename: file,
              path: `/uploads/services/${cat}/${file}`,
              category: cat,
              url: `/uploads/services/${cat}/${file}`,
              size: stats.size,
              lastModified: stats.mtime,
              originalName,
              displayName,
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

  // 新增：批次上傳服務項目圖片
  @Post('images/batch-upload')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 }
  ], {
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
  async batchUploadServiceImages(
    @Body() body: { category: string },
    @UploadedFiles() files: { images?: Express.Multer.File[] }
  ) {
    if (!files.images || files.images.length === 0) {
      throw new Error('沒有上傳文件');
    }

    const category = body.category || 'other';
    const uploadedImages = [];

    const fs = require('fs');
    for (const file of files.images) {
      const imageUrl = `/uploads/services/${category}/${file.filename}`;
      // 寫入中繼資料檔 (保存原始檔名)
      try {
        const metaPath = join(process.cwd(), 'uploads', 'services', category, `${file.filename}.meta.json`);
        const originalName = normalizeFilename(file.originalname);
        fs.writeFileSync(metaPath, JSON.stringify({ originalName, displayName: originalName }, null, 2));
      } catch {}
      uploadedImages.push({
        filename: file.filename,
        originalName: normalizeFilename(file.originalname),
        category,
        url: imageUrl,
        size: file.size,
        displayName: normalizeFilename(file.originalname),
      });
    }

    return {
      success: true,
      message: `成功上傳 ${uploadedImages.length} 張圖片`,
      data: uploadedImages,
      total: uploadedImages.length,
    };
  }

  // 保留原有的單張上傳API
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

    // 寫入中繼資料檔 (保存原始檔名)
    try {
      const fs = require('fs');
      const metaPath = join(process.cwd(), 'uploads', 'services', category, `${file.filename}.meta.json`);
      const originalName = normalizeFilename(file.originalname);
      fs.writeFileSync(metaPath, JSON.stringify({ originalName, displayName: originalName }, null, 2));
    } catch {}

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