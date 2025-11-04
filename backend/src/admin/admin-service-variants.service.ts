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
  async initializeDefaultVariants(serviceId: string, template: 'basic' | 'standard' | 'advanced' | 'full' = 'standard') {
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

    // 創建默認尺寸規格（1cm 遞增）
    const sizeVariants = [
      { name: '5-6cm', code: 'S1', priceModifier: 0, durationModifier: 0, sortOrder: 1, isRequired: true, description: '5-6cm 尺寸' },
      { name: '6-7cm', code: 'S2', priceModifier: 200, durationModifier: 5, sortOrder: 2, isRequired: true, description: '6-7cm 尺寸' },
      { name: '7-8cm', code: 'S3', priceModifier: 400, durationModifier: 10, sortOrder: 3, isRequired: true, description: '7-8cm 尺寸' },
      { name: '8-9cm', code: 'S4', priceModifier: 600, durationModifier: 15, sortOrder: 4, isRequired: true, description: '8-9cm 尺寸' },
      { name: '9-10cm', code: 'S5', priceModifier: 800, durationModifier: 20, sortOrder: 5, isRequired: true, description: '9-10cm 尺寸' },
      { name: '10-11cm', code: 'S6', priceModifier: 1000, durationModifier: 25, sortOrder: 6, isRequired: true, description: '10-11cm 尺寸' },
      { name: '11-12cm', code: 'S7', priceModifier: 1200, durationModifier: 30, sortOrder: 7, isRequired: true, description: '11-12cm 尺寸' },
      { name: '12-13cm', code: 'S8', priceModifier: 1400, durationModifier: 35, sortOrder: 8, isRequired: true, description: '12-13cm 尺寸' },
      { name: '13-14cm', code: 'S9', priceModifier: 1600, durationModifier: 40, sortOrder: 9, isRequired: true, description: '13-14cm 尺寸' },
      { name: '14-15cm', code: 'S10', priceModifier: 1800, durationModifier: 45, sortOrder: 10, isRequired: true, description: '14-15cm 尺寸' },
      { name: '15-16cm', code: 'S11', priceModifier: 2000, durationModifier: 50, sortOrder: 11, isRequired: true, description: '15-16cm 尺寸' },
      { name: '16-17cm', code: 'S12', priceModifier: 2200, durationModifier: 55, sortOrder: 12, isRequired: true, description: '16-17cm 尺寸' },
    ];

    // 創建默認顏色規格
    const colorVariants = [
      { name: '割線', code: 'A', priceModifier: 0, durationModifier: 0, sortOrder: 1, isRequired: true, description: '純黑色線條' },
      { name: '黑白', code: 'B', priceModifier: 500, durationModifier: 15, sortOrder: 2, isRequired: true, description: '黑白陰影' },
      { name: '半彩', code: 'C', priceModifier: 1000, durationModifier: 30, sortOrder: 3, isRequired: true, description: '部分上色' },
      { name: '全彩', code: 'D', priceModifier: 1500, durationModifier: 45, sortOrder: 4, isRequired: true, description: '全彩上色' },
    ];

    // 創建默認部位規格
    const positionVariants = [
      { name: '手臂外側', code: 'P1', priceModifier: 0, durationModifier: 0, sortOrder: 1, isRequired: false, description: '手臂外側面' },
      { name: '手臂內側', code: 'P2', priceModifier: 200, durationModifier: 10, sortOrder: 2, isRequired: false, description: '手臂內側面' },
      { name: '小腿', code: 'P3', priceModifier: 0, durationModifier: 0, sortOrder: 3, isRequired: false, description: '小腿部位' },
      { name: '大腿', code: 'P4', priceModifier: 500, durationModifier: 15, sortOrder: 4, isRequired: false, description: '大腿部位' },
      { name: '背部', code: 'P5', priceModifier: 1000, durationModifier: 30, sortOrder: 5, isRequired: false, description: '背部區域' },
      { name: '胸部', code: 'P6', priceModifier: 800, durationModifier: 20, sortOrder: 6, isRequired: false, description: '胸部區域' },
    ];

    // 創建風格規格（進階）
    const styleVariants = [
      { name: '傳統', code: 'S1', priceModifier: 0, durationModifier: 0, sortOrder: 1, isRequired: false, description: '經典傳統刺青風格' },
      { name: '寫實', code: 'S2', priceModifier: 1500, durationModifier: 60, sortOrder: 2, isRequired: false, description: '超寫實風格' },
      { name: '圖騰', code: 'S3', priceModifier: 500, durationModifier: 20, sortOrder: 3, isRequired: false, description: '部落圖騰' },
      { name: '日式', code: 'S4', priceModifier: 1000, durationModifier: 40, sortOrder: 4, isRequired: false, description: '日本傳統' },
      { name: '極簡', code: 'S5', priceModifier: 800, durationModifier: 30, sortOrder: 5, isRequired: false, description: '極簡線條' },
    ];

    // 創建複雜度規格（進階）
    const complexityVariants = [
      { name: '簡單', code: 'C1', priceModifier: 0, durationModifier: 0, sortOrder: 1, isRequired: false, description: '簡單線條' },
      { name: '中等', code: 'C2', priceModifier: 1000, durationModifier: 30, sortOrder: 2, isRequired: false, description: '中等複雜度' },
      { name: '複雜', code: 'C3', priceModifier: 2500, durationModifier: 60, sortOrder: 3, isRequired: false, description: '高複雜度' },
    ];

    const variantsToCreate: any[] = [];

    // 根據模板選擇要創建的規格
    if (template === 'basic') {
      // 基礎模板：只有前6個尺寸（5-11cm）和前2種顏色
      variantsToCreate.push(
        ...sizeVariants.slice(0, 6).map((v) => ({ serviceId, type: 'size', ...v })),
        ...colorVariants.slice(0, 2).map((v) => ({ serviceId, type: 'color', ...v })),
      );
    } else if (template === 'standard') {
      // 標準模板：尺寸、顏色、部位
      variantsToCreate.push(
        ...sizeVariants.map((v) => ({ serviceId, type: 'size', ...v })),
        ...colorVariants.map((v) => ({ serviceId, type: 'color', ...v })),
        ...positionVariants.map((v) => ({ serviceId, type: 'position', ...v })),
      );
    } else if (template === 'advanced') {
      // 進階模板：尺寸、顏色、部位、風格、複雜度
      variantsToCreate.push(
        ...sizeVariants.map((v) => ({ serviceId, type: 'size', ...v })),
        ...colorVariants.map((v) => ({ serviceId, type: 'color', ...v })),
        ...positionVariants.map((v) => ({ serviceId, type: 'position', ...v })),
        ...styleVariants.map((v) => ({ serviceId, type: 'style', ...v })),
        ...complexityVariants.map((v) => ({ serviceId, type: 'complexity', ...v })),
      );
    } else if (template === 'full') {
      // 完整模板：所有規格
      variantsToCreate.push(
        ...sizeVariants.map((v) => ({ serviceId, type: 'size', ...v })),
        ...colorVariants.map((v) => ({ serviceId, type: 'color', ...v })),
        ...positionVariants.map((v) => ({ serviceId, type: 'position', ...v })),
        ...styleVariants.map((v) => ({ serviceId, type: 'style', ...v })),
        ...complexityVariants.map((v) => ({ serviceId, type: 'complexity', ...v })),
      );
    }

    // 批量創建
    await Promise.all(
      variantsToCreate.map((v) =>
        this.prisma.serviceVariant.create({ data: v }),
      ),
    );

    // 更新服務的 hasVariants 標記
    await this.prisma.service.update({
      where: { id: serviceId },
      data: { hasVariants: true },
    });

    return { 
      success: true, 
      message: `已使用 ${template} 模板創建 ${variantsToCreate.length} 個規格`,
      count: variantsToCreate.length,
    };
  }
}

