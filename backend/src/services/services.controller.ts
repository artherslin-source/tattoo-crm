import { Body, Controller, Get, Post, Put, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { ServicesService } from './services.service';

const CreateServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().positive(),
  currency: z.string().default('TWD'),
  durationMin: z.number().int().positive(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

const UpdateServiceSchema = CreateServiceSchema.partial();

const BatchUpdateSchema = z.object({
  serviceIds: z.array(z.string()),
  updates: z.object({
    isActive: z.boolean().optional(),
    category: z.string().optional(),
  }),
});

@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('active') active?: string,
    @Query('sortBy') sortBy?: 'name' | 'price' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    // 暫時簡化，只返回所有服務
    return this.services.findAll({});
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() body: unknown) {
    const input = CreateServiceSchema.parse(body);
    return this.services.create(input);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateServiceSchema.parse(body);
    return this.services.update(id, input);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.services.delete(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('batch-update')
  async batchUpdate(@Body() body: unknown) {
    const input = BatchUpdateSchema.parse(body);
    return this.services.batchUpdate(input.serviceIds, input.updates);
  }
}



