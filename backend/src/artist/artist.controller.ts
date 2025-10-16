import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, Query, UseInterceptors, UploadedFile } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ArtistService } from "./artist.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";

@Controller("artist")
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ARTIST')
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  // 1. 首頁 Dashboard
  @Get("dashboard")
  async getDashboard(@Req() req) {
    const artistId = req.user.id;
    return this.artistService.getDashboard(artistId);
  }

  // 2. 我的行程
  @Get("appointments")
  async getMyAppointments(
    @Req() req,
    @Query('period') period?: 'today' | 'week' | 'month'
  ) {
    const artistId = req.user.id;
    return this.artistService.getMyAppointments(artistId, period);
  }

  @Get("appointments/range")
  async getAppointmentsByRange(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const artistId = req.user.id;
    return this.artistService.getAppointmentsByRange(artistId, startDate, endDate);
  }

  // 客戶標註相關 API
  @Get("customers/:customerId/notes")
  async getCustomerNotes(@Req() req, @Param('customerId') customerId: string) {
    const artistId = req.user.id;
    return this.artistService.getCustomerNotes(artistId, customerId);
  }

  @Post("customers/:customerId/notes")
  async createCustomerNote(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() body: { content: string }
  ) {
    const artistId = req.user.id;
    return this.artistService.createCustomerNote(artistId, customerId, body.content);
  }

  @Delete("customers/notes/:noteId")
  async deleteCustomerNote(@Req() req, @Param('noteId') noteId: string) {
    const artistId = req.user.id;
    return this.artistService.deleteCustomerNote(artistId, noteId);
  }

  // 客戶提醒相關 API
  @Get("customers/:customerId/reminders")
  async getCustomerReminders(@Req() req, @Param('customerId') customerId: string) {
    const artistId = req.user.id;
    return this.artistService.getCustomerReminders(artistId, customerId);
  }

  @Post("customers/:customerId/reminders")
  async createCustomerReminder(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() body: { title: string; date: string; note?: string }
  ) {
    const artistId = req.user.id;
    return this.artistService.createCustomerReminder(artistId, customerId, body);
  }

  @Delete("customers/reminders/:reminderId")
  async deleteCustomerReminder(@Req() req, @Param('reminderId') reminderId: string) {
    const artistId = req.user.id;
    return this.artistService.deleteCustomerReminder(artistId, reminderId);
  }

  @Patch("appointments/:id/status")
  async updateAppointmentStatus(
    @Param('id') appointmentId: string,
    @Body() body: { status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' },
    @Req() req
  ) {
    const artistId = req.user.id;
    return this.artistService.updateAppointmentStatus(appointmentId, body.status, artistId);
  }

  // 3. 顧客資訊
  @Get("customers")
  async getMyCustomers(@Req() req) {
    const artistId = req.user.id;
    return this.artistService.getMyCustomers(artistId);
  }

  @Get("customers/:customerId")
  async getCustomerDetails(
    @Param('customerId') customerId: string,
    @Req() req
  ) {
    const artistId = req.user.id;
    return this.artistService.getCustomerDetails(customerId, artistId);
  }

  // 4. 作品管理
  @Get("portfolio")
  async getPortfolio(@Req() req) {
    const artistId = req.user.id;
    return this.artistService.getPortfolio(artistId);
  }

  @Post("portfolio")
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, callback) => {
        const uploadPath = join(process.cwd(), 'uploads', 'portfolio');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('只允許上傳圖片文件'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async addPortfolioItem(
    @Body() body: {
      title: string;
      description?: string;
      tags: string;
    },
    @UploadedFile() file: Express.Multer.File,
    @Req() req
  ) {
    const artistId = req.user.id;
    
    console.log('DEBUG addPortfolioItem body:', body);
    console.log('DEBUG addPortfolioItem file:', file);
    
    // 解析 tags 字符串為數組
    let tags: string[] = [];
    try {
      tags = JSON.parse(body.tags || '[]');
    } catch (e) {
      tags = [];
    }
    
    const data = {
      title: body.title || '',
      description: body.description || '',
      imageUrl: file ? `/uploads/portfolio/${file.filename}` : '',
      tags,
    };
    
    console.log('DEBUG addPortfolioItem data:', data);
    
    return this.artistService.addPortfolioItem(artistId, data);
  }

  @Patch("portfolio/:id")
  async updatePortfolioItem(
    @Param('id') portfolioId: string,
    @Body() body: {
      title?: string;
      description?: string;
      imageUrl?: string;
      tags?: string[];
    },
    @Req() req
  ) {
    const artistId = req.user.id;
    return this.artistService.updatePortfolioItem(portfolioId, body, artistId);
  }

  @Delete("portfolio/:id")
  async deletePortfolioItem(
    @Param('id') portfolioId: string,
    @Req() req
  ) {
    const artistId = req.user.id;
    return this.artistService.deletePortfolioItem(portfolioId, artistId);
  }

  // 5. 通知系統
  @Get("notifications")
  async getNotifications(@Req() req) {
    const artistId = req.user.id;
    return this.artistService.getNotifications(artistId);
  }

  @Patch("notifications/:id/read")
  async markNotificationAsRead(
    @Param('id') notificationId: string,
    @Req() req
  ) {
    const artistId = req.user.id;
    return this.artistService.markNotificationAsRead(notificationId, artistId);
  }
}