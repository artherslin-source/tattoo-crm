import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('services')
export class ServicesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAllServices() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async getService(@Param('id') id: string) {
    return this.prisma.service.findUnique({
      where: { id },
    });
  }

  /**
   * 獲取服務的規格（公開API，顧客端使用）
   */
  @Get(':id/variants')
  async getServiceVariants(@Param('id') id: string) {
    const variants = await this.prisma.serviceVariant.findMany({
      where: { 
        serviceId: id,
        isActive: true  // 只返回啟用的規格
      },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });

    // 分組返回（包含所有規格類型）
    const grouped = {
      size: variants.filter((v) => v.type === 'size'),
      color: variants.filter((v) => v.type === 'color'),
      position: variants.filter((v) => v.type === 'position'),
      side: variants.filter((v) => v.type === 'side'),
      design_fee: variants.filter((v) => v.type === 'design_fee'),
      style: variants.filter((v) => v.type === 'style'),
      complexity: variants.filter((v) => v.type === 'complexity'),
      custom_addon: variants.filter((v) => v.type === 'custom_addon'),
    };

    return grouped;
  }
}
