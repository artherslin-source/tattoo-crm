import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ServicesService } from '../services/services.service';
import { z } from 'zod';

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
}
