import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceVariantDto, UpdateServiceVariantDto } from './dto/service-variant.dto';

@Injectable()
export class AdminServiceVariantsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 創建服務規格
   */
  async createVariant(dto: CreateServiceVariantDto) {
    // 驗證服務存在
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('服務不存在');
    }

    // 創建規格
    const variant = await this.prisma.serviceVariant.create({
      data: {
        serviceId: dto.serviceId,
        type: dto.type,
        name: dto.name,
        code: dto.code,
        priceModifier: dto.priceModifier,
        durationModifier: dto.durationModifier,
        sortOrder: dto.sortOrder || 0,
      },
    });

    // 如果服務之前沒有規格，更新 hasVariants 標記
    if (!service.hasVariants) {
      await this.prisma.service.update({
        where: { id: dto.serviceId },
        data: { hasVariants: true },
      });
    }

    return variant;
  }

  /**
   * 批量創建服務規格
   */
  async batchCreateVariants(serviceId: string, variants: CreateServiceVariantDto[]) {
    // 驗證服務存在
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('服務不存在');
    }

    // 批量創建
    const createdVariants = await Promise.all(
      variants.map((variant) =>
        this.prisma.serviceVariant.create({
          data: {
            serviceId,
            type: variant.type,
            name: variant.name,
            code: variant.code,
            priceModifier: variant.priceModifier,
            durationModifier: variant.durationModifier,
            sortOrder: variant.sortOrder || 0,
          },
        }),
      ),
    );

    // 更新服務的 hasVariants 標記
    await this.prisma.service.update({
      where: { id: serviceId },
      data: { hasVariants: true },
    });

    return createdVariants;
  }

  /**
   * 獲取服務的所有規格
   */
  async getServiceVariants(serviceId: string) {
    const variants = await this.prisma.serviceVariant.findMany({
      where: { serviceId },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });

    // 分組返回
    const grouped = {
      size: variants.filter((v) => v.type === 'size'),
      color: variants.filter((v) => v.type === 'color'),
      position: variants.filter((v) => v.type === 'position'),
    };

    return grouped;
  }

  /**
   * 更新規格
   */
  async updateVariant(variantId: string, dto: UpdateServiceVariantDto) {
    const variant = await this.prisma.serviceVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException('規格不存在');
    }

    return this.prisma.serviceVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  /**
   * 刪除規格
   */
  async deleteVariant(variantId: string) {
    const variant = await this.prisma.serviceVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException('規格不存在');
    }

    await this.prisma.serviceVariant.delete({
      where: { id: variantId },
    });

    // 檢查服務是否還有其他規格
    const remainingVariants = await this.prisma.serviceVariant.count({
      where: { serviceId: variant.serviceId },
    });

    // 如果沒有規格了，更新 hasVariants 標記
    if (remainingVariants === 0) {
      await this.prisma.service.update({
        where: { id: variant.serviceId },
        data: { hasVariants: false },
      });
    }

    return { success: true };
  }

  /**
   * 初始化默認規格（用於快速設置）
   */
  async initializeDefaultVariants(serviceId: string) {
    // 驗證服務存在
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('服務不存在');
    }

    // 刪除現有規格
    await this.prisma.serviceVariant.deleteMany({
      where: { serviceId },
    });

    // 創建默認尺寸規格
    const sizeVariants = [
      { name: '5x5cm', priceModifier: 0, durationModifier: 0, sortOrder: 1 },
      { name: '10x10cm', priceModifier: 1000, durationModifier: 30, sortOrder: 2 },
      { name: '15x15cm', priceModifier: 2000, durationModifier: 60, sortOrder: 3 },
      { name: '20x20cm', priceModifier: 3000, durationModifier: 90, sortOrder: 4 },
    ];

    // 創建默認顏色規格
    const colorVariants = [
      { name: '割線A', code: 'A', priceModifier: 0, durationModifier: 0, sortOrder: 1 },
      { name: '黑白B', code: 'B', priceModifier: 500, durationModifier: 15, sortOrder: 2 },
      { name: '半彩C', code: 'C', priceModifier: 1000, durationModifier: 30, sortOrder: 3 },
      { name: '全彩D', code: 'D', priceModifier: 1500, durationModifier: 45, sortOrder: 4 },
    ];

    // 創建默認部位規格
    const positionVariants = [
      { name: '部位1', priceModifier: 0, durationModifier: 0, sortOrder: 1 },
      { name: '部位2', priceModifier: 500, durationModifier: 15, sortOrder: 2 },
    ];

    // 批量創建
    await Promise.all([
      ...sizeVariants.map((v) =>
        this.prisma.serviceVariant.create({
          data: {
            serviceId,
            type: 'size',
            ...v,
          },
        }),
      ),
      ...colorVariants.map((v) =>
        this.prisma.serviceVariant.create({
          data: {
            serviceId,
            type: 'color',
            ...v,
          },
        }),
      ),
      ...positionVariants.map((v) =>
        this.prisma.serviceVariant.create({
          data: {
            serviceId,
            type: 'position',
            ...v,
          },
        }),
      ),
    ]);

    // 更新服務的 hasVariants 標記
    await this.prisma.service.update({
      where: { id: serviceId },
      data: { hasVariants: true },
    });

    return { success: true, message: '默認規格已創建' };
  }
}

