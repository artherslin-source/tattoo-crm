import {
  BadRequestException,
  Body,
  Controller,
  Get,
  GoneException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import { BackupService } from './backup.service';
import { AuditService } from '../audit/audit.service';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

const ExportSchema = z.object({
  password: z.string().min(1),
});

const RestoreSchema = z.object({
  password: z.string().min(1),
  confirm: z.literal('RESTORE'),
});

@Controller('admin/backup')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class BackupController {
  constructor(
    private readonly backup: BackupService,
    private readonly audit: AuditService,
  ) {}

  @Post('export')
  async exportBackup(@Actor() actor: AccessActor, @Body() body: unknown, @Req() req: any, @Res() res: Response) {
    if (!isBoss(actor)) throw new BadRequestException('Only BOSS can export backups');
    const input = ExportSchema.parse(body);
    // Large backups can take minutes and will often time out if streamed directly.
    // Kick off an async job and let frontend poll status + use native browser download.
    const job = await this.backup.startExportJob({ actor, password: input.password });
    const jobId = (job as any)?.jobId as string;
    const full = jobId ? this.backup.getExportJob(jobId) : null;
    await this.audit.log({
      actor,
      action: 'BACKUP_EXPORT_START',
      entityType: 'BACKUP',
      entityId: jobId || null,
      metadata: { jobId: jobId || null, status: full?.status ?? null },
      meta: { ip: req?.ip ?? null, userAgent: req?.headers?.['user-agent'] ?? null },
    });
    return res.json(job);
  }

  @Get('export/:jobId')
  async exportStatus(@Actor() actor: AccessActor, @Param('jobId') jobId: string) {
    if (!isBoss(actor)) throw new BadRequestException('Only BOSS can export backups');
    const job = this.backup.getExportJob(jobId);
    if (!job) throw new BadRequestException('Job not found');
    return {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? null,
      finishedAt: job.finishedAt ?? null,
      filename: job.filename ?? null,
      error: job.error ?? null,
      download: job.status === 'ready' && job.dlToken ? { dlToken: job.dlToken, expiresAt: job.dlExpiresAt ?? null } : null,
    };
  }

  @Post('export-secrets')
  async exportSecrets(@Actor() actor: AccessActor, @Body() body: unknown, @Res() res: Response) {
    if (!isBoss(actor)) throw new BadRequestException('Only BOSS can export secrets');
    const input = ExportSchema.parse(body);
    return this.backup.streamEncryptedSecrets(res, {
      actor,
      password: input.password,
    });
  }

  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // On some Railway/container setups, /tmp may not be writable/reliable.
          // Use uploads volume so large files can be stored safely.
          const uploadsDir = process.env.UPLOADS_DIR || '/app/uploads';
          const dir = path.join(uploadsDir, 'tmp');
          try {
            fs.mkdirSync(dir, { recursive: true });
          } catch {
            // ignore; multer will surface a clearer error if it still fails
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const base = `restore_${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const ext = path.extname(file.originalname || '') || '.bin';
          cb(null, `${base}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB guardrail
    }),
  )
  async restoreBackup(
    @Actor() actor: AccessActor,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
  ) {
    if (!isBoss(actor)) throw new BadRequestException('Only BOSS can restore backups');
    // This environment no longer supports self-serve restore. Use engineering-operated restore instead.
    // We deliberately return 410 so automated callers can detect the deprecation.
    throw new GoneException('此環境不支援自助還原，請聯絡工程團隊協助還原。');
  }
}

// Public download endpoint (no JWT header required). Protected by short-lived dlToken.
@Controller('admin/backup')
export class BackupDownloadController {
  constructor(
    private readonly backup: BackupService,
    private readonly audit: AuditService,
  ) {}

  @Get('export/:jobId/download')
  async download(
    @Param('jobId') jobId: string,
    @Query('dlToken') dlToken: string | undefined,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!dlToken) throw new BadRequestException('dlToken is required');
    await this.audit.log({
      actor: null,
      action: 'BACKUP_EXPORT_DOWNLOAD',
      entityType: 'BACKUP',
      entityId: jobId,
      metadata: { jobId },
      meta: { ip: req?.ip ?? null, userAgent: req?.headers?.['user-agent'] ?? null },
    });
    await this.backup.streamExportJobDownload({ jobId, dlToken, res });
  }
}


