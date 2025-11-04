import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AdminServiceVariantsService } from './admin-service-variants.service';
import { CreateServiceVariantDto, UpdateServiceVariantDto } from './dto/service-variant.dto';

@Controller('admin/service-variants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
export class AdminServiceVariantsController {
  constructor(private readonly variantsService: AdminServiceVariantsService) {}

  /**
   * 創建服務規格
   */
  @Post()
  async createVariant(@Body() dto: CreateServiceVariantDto) {
    return this.variantsService.createVariant(dto);
  }

  /**
   * 批量創建服務規格
   */
  @Post('batch/:serviceId')
  async batchCreateVariants(
    @Param('serviceId') serviceId: string,
    @Body() body: { variants: CreateServiceVariantDto[] },
  ) {
    return this.variantsService.batchCreateVariants(serviceId, body.variants);
  }

  /**
   * 獲取服務的所有規格
   */
  @Get('service/:serviceId')
  async getServiceVariants(@Param('serviceId') serviceId: string) {
    return this.variantsService.getServiceVariants(serviceId);
  }

  /**
   * 更新規格
   */
  @Patch(':variantId')
  async updateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateServiceVariantDto,
  ) {
    return this.variantsService.updateVariant(variantId, dto);
  }

  /**
   * 刪除規格
   */
  @Delete(':variantId')
  async deleteVariant(@Param('variantId') variantId: string) {
    return this.variantsService.deleteVariant(variantId);
  }

  /**
   * 初始化服務的默認規格
   */
  @Post('initialize/:serviceId')
  async initializeDefaultVariants(@Param('serviceId') serviceId: string) {
    return this.variantsService.initializeDefaultVariants(serviceId);
  }
}

