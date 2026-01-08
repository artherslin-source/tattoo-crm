import {
  BadRequestException,
  Body,
  Controller,
  Post,
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
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { z } from 'zod';
import * as path from 'path';

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
  constructor(private readonly backup: BackupService) {}

  @Post('export')
  async exportBackup(@Actor() actor: AccessActor, @Body() body: unknown, @Res() res: Response) {
    if (!isBoss(actor)) throw new BadRequestException('Only BOSS can export backups');
    const input = ExportSchema.parse(body);
    return this.backup.streamEncryptedBackupZip(res, {
      actor,
      password: input.password,
    });
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
        destination: '/tmp',
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
    if (!file?.path) throw new BadRequestException('file is required');

    const parsed = RestoreSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    // Fire-and-forget restore: respond immediately, then restore and restart.
    void this.backup.restoreFromEncryptedBackupFile({
      actor,
      password: parsed.data.password,
      encryptedFilePath: file.path,
    });

    return {
      ok: true,
      message: 'Restore started. Service will restart after completion.',
      filename: path.basename(file.path),
    };
  }
}


