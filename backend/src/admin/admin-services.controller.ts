import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, Req, ForbiddenException, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessGuard } from '../common/access/access.guard';
import { ServicesService } from '../services/services.service';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { z } from 'zod';
import { calculatePriceAndDuration, getAddonTotal } from '../cart/pricing';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import type { Response } from 'express';

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

const QuoteSchema = z.object({
  selectedVariants: z.record(z.string(), z.any()).optional().default({}),
});

@Controller('admin/services')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class AdminServicesController {
  constructor(private readonly services: ServicesService) {}

  // 錯誤處理中間件：捕獲 Multer 上傳錯誤
  private handleMulterError(error: any): never {
    if (error.code === 'LIMIT_FILE_SIZE') {
      throw new BadRequestException('文件大小超過限制（最大 10MB）');
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      throw new BadRequestException('上傳文件數量超過限制（最多 10 張）');
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      throw new BadRequestException('上傳欄位名稱不正確');
    }
    if (error.message && error.message.includes('只允許上傳圖片文件')) {
      throw new BadRequestException(error.message);
    }
    throw new BadRequestException(error.message || '上傳失敗，請檢查文件格式和大小');
  }

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('active') active?: string,
    @Query('sortBy') sortBy?: 'name' | 'price' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const services = await this.services.findAll({});
    
    // 在生產環境中，驗證圖片文件是否存在
    if (process.env.NODE_ENV === 'production') {
      const fs = require('fs');
      const path = require('path');
      
      for (const service of services) {
        if (service.imageUrl) {
          const imagePath = path.join(process.cwd(), service.imageUrl);
          if (!fs.existsSync(imagePath)) {
            console.warn(`⚠️  服務「${service.name}」的圖片文件不存在: ${service.imageUrl}`);
            console.warn(`   預期路徑: ${imagePath}`);
            console.warn(`   當前工作目錄: ${process.cwd()}`);
          }
        }
      }
    }
    
    return services;
  }

  @Post()
  async create(@Body() body: unknown) {
    const input = CreateServiceSchema.parse(body);
    return this.services.create(input);
  }

  @Get('export.csv')
  async exportCsv(@Actor() actor: AccessActor, @Res() res: Response) {
    if (!isBoss(actor)) throw new ForbiddenException('Boss only');

    const prisma = (this.services as any)['prisma'];
    const rows = await prisma.service.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        currency: true,
        durationMin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Excel-friendly BOM
    const bom = '\uFEFF';
    const header = [
      'id',
      'name',
      'category',
      'price',
      'currency',
      'durationMin',
      'isActive',
      'createdAt',
      'updatedAt',
    ];

    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      const needs = /[",\n\r]/.test(s);
      const doubled = s.replace(/"/g, '""');
      return needs ? `"${doubled}"` : doubled;
    };

    const lines = [
      header.join(','),
      ...rows.map((r: any) =>
        [
          r.id,
          r.name,
          r.category ?? '',
          r.price ?? '',
          r.currency ?? '',
          r.durationMin ?? '',
          r.isActive ? 'true' : 'false',
          r.createdAt ? new Date(r.createdAt).toISOString() : '',
          r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
        ]
          .map(esc)
          .join(','),
      ),
    ];

    const filename = `services-base-prices-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(bom + lines.join('\n'));
  }

  @Post(':id/quote')
  async quote(@Param('id') id: string, @Body() body: unknown) {
    const input = QuoteSchema.parse(body);
    const selectedVariants = input.selectedVariants ?? {};

    // Admin quote needs active variants for pricing logic
    const prisma = (this.services as any)['prisma'];
    const withVariants = await prisma.service.findUnique({
      where: { id },
      include: { variants: { where: { isActive: true } } },
    });
    if (!withVariants) throw new BadRequestException('服務不存在');

    const { finalPrice: itemFinalPrice, estimatedDuration } = calculatePriceAndDuration(
      withVariants.price,
      withVariants.durationMin,
      withVariants.variants,
      selectedVariants,
    );
    const addonTotal = getAddonTotal(selectedVariants);

    return {
      basePrice: withVariants.price,
      // Keep same behavior as billing/cart: final shown price includes addons from selectedVariants.
      finalPrice: Math.max(0, Math.trunc(Number(itemFinalPrice + addonTotal))),
      itemFinalPrice: Math.max(0, Math.trunc(Number(itemFinalPrice))),
      addonTotal: Math.max(0, Math.trunc(Number(addonTotal))),
      estimatedDuration,
      normalizedSelectedVariants: selectedVariants,
    };
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
        throw new BadRequestException({
          message: error.message,
          statusCode: 400,
        });
      }
      throw new BadRequestException({
        message: '刪除服務時發生未知錯誤',
        statusCode: 400,
      });
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
                // metadata 中保存的應該已經是正確的 UTF-8 字符串，不需要再 normalize
                originalName = meta.originalName || meta.displayName || undefined;
                displayName = meta.displayName || meta.originalName || undefined;
              } else {
                // 如果沒有 metadata，嘗試從檔名推測（去除系統生成的前綴）
                // 但這種情況應該很少，因為上傳時會創建 metadata
              }
            } catch (metaError) {
              console.warn(`⚠️ 讀取 metadata 失敗 (${file}):`, metaError);
            }

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
        try {
          const category = req.body.category || 'other';
          const uploadPath = join(process.cwd(), 'uploads', 'services', category);
          
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          callback(null, uploadPath);
        } catch (error) {
          console.error('❌ 創建上傳目錄失敗:', error);
          // Multer callback 類型要求兩個參數，但運行時只檢查第一個參數
          callback(new Error('無法創建上傳目錄'), '');
        }
      },
      filename: (req, file, callback) => {
        try {
          // 自動生成唯一檔名，不依賴原始檔名
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 8);
          const ext = extname(file.originalname || '');
          const filename = `service-${timestamp}-${randomString}${ext}`;
          callback(null, filename);
        } catch (error) {
          console.error('❌ 生成檔名失敗:', error);
          // Multer callback 類型要求兩個參數，但運行時只檢查第一個參數
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
      files: 10, // 最多 10 個文件
    },
  }))
  async batchUploadServiceImages(
    @Body() body: { category?: string },
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @Req() req: any
  ) {
    try {
      // Multer 處理 multipart/form-data 時，category 可能在 req.body 中
      const category = body.category || req.body?.category || 'other';
      
      console.log('📤 批次上傳請求:', { 
        category,
        bodyCategory: body.category,
        reqBodyCategory: req.body?.category,
        filesCount: files?.images?.length || 0,
        hasFiles: !!files?.images,
        filesKeys: files ? Object.keys(files) : []
      });

      if (!files || !files.images || files.images.length === 0) {
        console.error('❌ 沒有上傳文件:', {
          files: files ? 'exists' : 'null',
          images: files?.images ? `array length: ${files.images.length}` : 'undefined',
          filesKeys: files ? Object.keys(files) : []
        });
        throw new BadRequestException('沒有選擇要上傳的圖片文件，請重新選擇圖片');
      }

      const uploadedImages = [];
      const fs = require('fs');

      for (const file of files.images) {
        try {
          const imageUrl = `/uploads/services/${category}/${file.filename}`;
          
          // 寫入中繼資料檔 (保存原始檔名)
          try {
            const metaPath = join(process.cwd(), 'uploads', 'services', category, `${file.filename}.meta.json`);
            // 確保原始檔名正確處理（支援中文）
            const originalName = normalizeFilename(file.originalname || file.filename);
            const metadata = { 
              originalName, 
              displayName: originalName,
              uploadedAt: new Date().toISOString()
            };
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
            console.log('💾 已保存 metadata:', { filename: file.filename, originalName });
          } catch (metaError) {
            console.warn('⚠️ 寫入中繼資料失敗:', metaError);
            // 不影響上傳，繼續處理
          }

          uploadedImages.push({
            filename: file.filename,
            originalName: normalizeFilename(file.originalname),
            category,
            url: imageUrl,
            size: file.size,
            displayName: normalizeFilename(file.originalname),
          });

          console.log('✅ 上傳成功:', file.filename);
        } catch (fileError) {
          console.error('❌ 處理單個文件失敗:', fileError);
          // 記錄錯誤但繼續處理其他文件
        }
      }

      if (uploadedImages.length === 0) {
        throw new BadRequestException('沒有成功上傳任何圖片');
      }

      console.log(`✅ 批次上傳完成: ${uploadedImages.length} 張圖片`);
      
      return {
        success: true,
        message: `成功上傳 ${uploadedImages.length} 張圖片`,
        data: uploadedImages,
        total: uploadedImages.length,
      };
    } catch (error) {
      console.error('❌ 批次上傳錯誤:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || '批次上傳失敗，請檢查文件格式和大小（最大 10MB）'
      );
    }
  }

  // 保留原有的單張上傳API
  @Post('images/upload')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, callback) => {
        try {
          const category = req.body.category || 'other';
          const uploadPath = join(process.cwd(), 'uploads', 'services', category);
          
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          callback(null, uploadPath);
        } catch (error) {
          console.error('❌ 創建上傳目錄失敗:', error);
          // Multer callback 類型要求兩個參數，但運行時只檢查第一個參數
          callback(new Error('無法創建上傳目錄'), '');
        }
      },
      filename: (req, file, callback) => {
        try {
          // 自動生成唯一檔名，不依賴原始檔名
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 8);
          const ext = extname(file.originalname || '');
          const filename = `service-${timestamp}-${randomString}${ext}`;
          callback(null, filename);
        } catch (error) {
          console.error('❌ 生成檔名失敗:', error);
          // Multer callback 類型要求兩個參數，但運行時只檢查第一個參數
          callback(new Error('無法生成檔名'), '');
        }
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