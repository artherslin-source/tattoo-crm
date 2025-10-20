import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ServiceFilters {
  category?: string;
  active?: boolean;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface CreateServiceInput {
  name: string;
  description: string;
  price: number;
  currency?: string;
  durationMin: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
}

interface UpdateServiceInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  durationMin?: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: ServiceFilters) {
    const where: any = {};
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }

    const orderBy: any = {};
    orderBy[filters.sortBy || 'name'] = filters.sortOrder || 'asc';

    return this.prisma.service.findMany({
      where,
      orderBy,
    });
  }

  async create(input: CreateServiceInput) {
    return this.prisma.service.create({ data: input });
  }

  async update(id: string, input: UpdateServiceInput) {
    // 先取得原始資料
    const originalService = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!originalService) {
      throw new NotFoundException('Service not found');
    }

    // 更新服務
    const updatedService = await this.prisma.service.update({
      where: { id },
      data: input,
    });

    // 記錄變更歷史
    await this.logServiceHistory(id, originalService, input, 'system');

    return updatedService;
  }

  async delete(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        appointments: true,
        history: true,
        completedServices: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // 檢查是否有相關的預約記錄
    if (service.appointments.length > 0) {
      throw new Error(`無法刪除服務 "${service.name}"，因為有 ${service.appointments.length} 個相關的預約記錄。請先處理這些預約記錄。`);
    }

    // 檢查是否有相關的已完成服務記錄
    if (service.completedServices.length > 0) {
      throw new Error(`無法刪除服務 "${service.name}"，因為有 ${service.completedServices.length} 個相關的已完成服務記錄。`);
    }

    // 刪除服務歷史記錄
    if (service.history.length > 0) {
      await this.prisma.serviceHistory.deleteMany({
        where: { serviceId: id },
      });
    }

    return this.prisma.service.delete({
      where: { id },
    });
  }

  async batchUpdate(serviceIds: string[], updates: { isActive?: boolean; category?: string }) {
    const updatePromises = serviceIds.map(async (id) => {
      const originalService = await this.prisma.service.findUnique({
        where: { id },
      });

      if (originalService) {
        const updatedService = await this.prisma.service.update({
          where: { id },
          data: updates,
        });

        // 記錄變更歷史
        await this.logServiceHistory(id, originalService, updates, 'system');

        return updatedService;
      }
      return null;
    });

    const results = await Promise.all(updatePromises);
    return results.filter(result => result !== null);
  }

  private async logServiceHistory(
    serviceId: string,
    originalService: any,
    updates: any,
    updatedBy: string
  ) {
    const historyEntries: Array<{
      serviceId: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
      updatedBy: string;
    }> = [];

    for (const [field, newValue] of Object.entries(updates)) {
      if (field in originalService && originalService[field] !== newValue) {
        historyEntries.push({
          serviceId,
          field,
          oldValue: originalService[field]?.toString() || null,
          newValue: newValue?.toString() || null,
          updatedBy,
        });
      }
    }

    if (historyEntries.length > 0) {
      await this.prisma.serviceHistory.createMany({
        data: historyEntries,
      });
    }
  }

  async getServiceHistory(serviceId: string) {
    return this.prisma.serviceHistory.findMany({
      where: { serviceId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}



