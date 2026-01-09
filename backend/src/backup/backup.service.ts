import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import type { Response } from 'express';
import archiver from 'archiver';
import * as unzipper from 'unzipper';

type EncHeaderV1 = {
  v: 1;
  alg: 'aes-256-gcm';
  kdf: 'scrypt';
  saltB64: string;
  ivB64: string;
  n: number;
  r: number;
  p: number;
};

const ENC_MAGIC = Buffer.from('TCRM1'); // Tattoo CRM v1

function buildKey(password: string, salt: Buffer, n: number, r: number, p: number) {
  // 32 bytes key for AES-256-GCM
  // NOTE: Node/OpenSSL has a default scrypt memory limit. Our params (N=2^15,r=8) can hit it.
  // Allow a safe maxmem override so export/restore won't fail with "memory limit exceeded".
  const maxmemMb = Number(process.env.BACKUP_SCRYPT_MAXMEM_MB || 128);
  const maxmem = Number.isFinite(maxmemMb) && maxmemMb > 0 ? Math.floor(maxmemMb * 1024 * 1024) : 128 * 1024 * 1024;
  return scryptSync(password, salt, 32, { N: n, r, p, maxmem });
}

function runCmd(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} exited with code ${code}. ${stderr}`));
    });
  });
}

async function ensureDir(p: string) {
  await fsp.mkdir(p, { recursive: true });
}

async function emptyDir(dir: string) {
  try {
    const entries = await fsp.readdir(dir);
    await Promise.all(
      entries.map(async (name) => {
        const full = path.join(dir, name);
        await fsp.rm(full, { recursive: true, force: true });
      }),
    );
  } catch {
    // ignore
  }
}

function requiredEnvKeysList() {
  // Keep this list explicit; it is printed into manifest/secrets export.
  return [
    'DATABASE_URL',
    'NODE_ENV',
    'PORT',
    'CORS_ORIGIN',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_TTL',
    'JWT_REFRESH_TTL',
    'SESSION_SECRET',
    'BOSS_INIT_SECRET',
  ];
}

function buildSecretsEnvText() {
  const keys = requiredEnvKeysList();
  const lines: string[] = [];
  lines.push(`# Tattoo CRM secrets export`);
  lines.push(`# GeneratedAt: ${new Date().toISOString()}`);
  for (const k of keys) {
    const v = process.env[k];
    if (v === undefined) continue;
    // naive quoting, adequate for URLs/secrets; users can edit if needed.
    const escaped = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    lines.push(`${k}="${escaped}"`);
  }
  lines.push('');
  return lines.join('\n');
}

type ExportJobStatus = 'queued' | 'running' | 'ready' | 'failed';
type ExportJob = {
  id: string;
  status: ExportJobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  filename?: string;
  filePath?: string;
  error?: string;
  dlToken?: string;
  dlExpiresAt?: number;
};

@Injectable()
export class BackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenance: MaintenanceService,
  ) {}

  private exportJobs = new Map<string, ExportJob>();
  private exportLock: Promise<void> | null = null;

  private getUploadsPath() {
    // Railway volume mount in backend/railway.json
    return process.env.UPLOADS_DIR || '/app/uploads';
  }

  private getBackupsPath() {
    return process.env.BACKUPS_DIR || path.join(this.getUploadsPath(), 'backups');
  }

  private getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new BadRequestException('DATABASE_URL is not configured');
    return url;
  }

  private async cleanupOldExportArtifacts() {
    const keepMs = Number(process.env.BACKUP_EXPORT_KEEP_MS || 6 * 60 * 60 * 1000); // default 6h
    const now = Date.now();
    for (const [id, job] of this.exportJobs.entries()) {
      const t = job.finishedAt ?? job.createdAt;
      if (now - t > keepMs) this.exportJobs.delete(id);
    }
    const dir = this.getBackupsPath();
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (e) => {
          if (!e.isFile()) return;
          const full = path.join(dir, e.name);
          const st = await fsp.stat(full).catch(() => null);
          if (!st) return;
          if (now - st.mtimeMs > keepMs) await fsp.rm(full, { force: true }).catch(() => null);
        }),
      );
    } catch {
      // ignore
    }
  }

  private async withExportLock<T>(fn: () => Promise<T>): Promise<T> {
    while (this.exportLock) {
      try {
        await this.exportLock;
      } catch {
        // ignore
      }
    }
    let release!: () => void;
    let rejector!: (e: unknown) => void;
    this.exportLock = new Promise<void>((resolve, reject) => {
      release = resolve;
      rejector = reject;
    });
    try {
      const out = await fn();
      release();
      this.exportLock = null;
      return out;
    } catch (e) {
      rejector(e);
      this.exportLock = null;
      throw e;
    }
  }

  private async writeEncryptedStreamHeaderV1(out: NodeJS.WritableStream, header: EncHeaderV1) {
    const headerBuf = Buffer.from(JSON.stringify(header), 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(headerBuf.length, 0);
    out.write(ENC_MAGIC);
    out.write(len);
    out.write(headerBuf);
  }

  private async buildEncryptedBackupFile(password: string): Promise<{ filePath: string; filename: string }> {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'backup-'));
    const dbDump = path.join(tmpDir, 'db.dump');
    const uploadsTar = path.join(tmpDir, 'uploads.tar.gz');

    const uploadsPath = this.getUploadsPath();
    const dbUrl = this.getDatabaseUrl();

    await ensureDir(tmpDir);
    await ensureDir(uploadsPath);

    await runCmd('pg_dump', ['-Fc', '--no-owner', '--no-privileges', `--dbname=${dbUrl}`, '-f', dbDump]);
    await runCmd('tar', ['-czf', uploadsTar, '-C', uploadsPath, '.']);

    const manifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      db: { format: 'pg_dump_custom', filename: 'db.dump' },
      uploads: { path: uploadsPath, filename: 'uploads.tar.gz' },
      requiredEnvKeys: requiredEnvKeysList(),
    };
    const manifestStr = JSON.stringify(manifest, null, 2);

    const filename = `tattoo-crm-backup_${new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_')}.zip.enc`;

    const backupsDir = this.getBackupsPath();
    await ensureDir(backupsDir);
    const outPath = path.join(backupsDir, filename);

    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const n = 2 ** 15;
    const r = 8;
    const p = 1;
    const key = buildKey(password, salt, n, r, p);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const header: EncHeaderV1 = {
      v: 1,
      alg: 'aes-256-gcm',
      kdf: 'scrypt',
      saltB64: salt.toString('base64'),
      ivB64: iv.toString('base64'),
      n,
      r,
      p,
    };

    const ws = fs.createWriteStream(outPath);
    await this.writeEncryptedStreamHeaderV1(ws, header);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.file(dbDump, { name: 'db.dump' });
    archive.file(uploadsTar, { name: 'uploads.tar.gz' });
    archive.append(manifestStr, { name: 'manifest.json' });

    cipher.pipe(ws, { end: false });
    archive.pipe(cipher);

    const cleanupTmp = async () => {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => null);
    };

    await new Promise<void>((resolve, reject) => {
      const onErr = (err: unknown) => reject(err);
      archive.on('error', onErr);
      cipher.on('error', onErr);
      ws.on('error', onErr);

      cipher.on('end', () => {
        try {
          const tag = cipher.getAuthTag();
          ws.write(tag);
          ws.end();
        } catch (e) {
          reject(e);
        }
      });
      ws.on('finish', () => resolve());

      void archive.finalize();
    }).finally(cleanupTmp);

    return { filePath: outPath, filename };
  }

  async startExportJob(input: { actor: any; password: string }) {
    await this.cleanupOldExportArtifacts();
    const id = randomBytes(12).toString('hex');
    const job: ExportJob = { id, status: 'queued', createdAt: Date.now() };
    this.exportJobs.set(id, job);

    void this.withExportLock(async () => {
      const j = this.exportJobs.get(id);
      if (!j) return;
      j.status = 'running';
      j.startedAt = Date.now();
      try {
        const { filePath, filename } = await this.buildEncryptedBackupFile(input.password);
        j.filename = filename;
        j.filePath = filePath;
        j.status = 'ready';
        j.finishedAt = Date.now();
        j.dlToken = randomBytes(24).toString('hex');
        j.dlExpiresAt = Date.now() + Number(process.env.BACKUP_EXPORT_DL_TOKEN_TTL_MS || 15 * 60 * 1000); // 15m
      } catch (e) {
        j.status = 'failed';
        j.finishedAt = Date.now();
        j.error = e instanceof Error ? e.message : String(e);
      }
    });

    return { jobId: id };
  }

  getExportJob(jobId: string): ExportJob | null {
    return this.exportJobs.get(jobId) || null;
  }

  async streamExportJobDownload(input: { jobId: string; dlToken: string; res: Response }) {
    const job = this.exportJobs.get(input.jobId);
    if (!job) throw new BadRequestException('Job not found');
    if (job.status !== 'ready' || !job.filePath || !job.filename) throw new BadRequestException('Job not ready');
    if (!job.dlToken || input.dlToken !== job.dlToken) throw new BadRequestException('Invalid download token');
    if (job.dlExpiresAt && Date.now() > job.dlExpiresAt) throw new BadRequestException('Download token expired');

    input.res.setHeader('Content-Type', 'application/octet-stream');
    input.res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
    input.res.setHeader('Cache-Control', 'no-store');
    if (typeof (input.res as any).flushHeaders === 'function') (input.res as any).flushHeaders();

    await new Promise<void>((resolve, reject) => {
      const rs = fs.createReadStream(job.filePath!);
      rs.on('error', reject);
      input.res.on('error', reject);
      input.res.on('finish', () => resolve());
      rs.pipe(input.res);
    });
  }

  async streamEncryptedBackupZip(res: Response, input: { actor: any; password: string }) {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'backup-'));
    const dbDump = path.join(tmpDir, 'db.dump');
    const uploadsTar = path.join(tmpDir, 'uploads.tar.gz');

    const uploadsPath = this.getUploadsPath();
    const dbUrl = this.getDatabaseUrl();

    await ensureDir(tmpDir);
    await ensureDir(uploadsPath);

    // Build artifacts on disk first (simpler; avoids stream interleaving issues)
    await runCmd('pg_dump', ['-Fc', '--no-owner', '--no-privileges', `--dbname=${dbUrl}`, '-f', dbDump]);
    await runCmd('tar', ['-czf', uploadsTar, '-C', uploadsPath, '.']);

    const manifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      db: { format: 'pg_dump_custom', filename: 'db.dump' },
      uploads: { path: uploadsPath, filename: 'uploads.tar.gz' },
      requiredEnvKeys: requiredEnvKeysList(),
    };
    const manifestStr = JSON.stringify(manifest, null, 2);

    const filename = `tattoo-crm-backup_${new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_')}.zip.enc`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    // Encryption params
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const n = 2 ** 15;
    const r = 8;
    const p = 1;
    const key = buildKey(input.password, salt, n, r, p);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    // Write header then stream zip payload through cipher into response; append auth tag at the end.
    const header: EncHeaderV1 = {
      v: 1,
      alg: 'aes-256-gcm',
      kdf: 'scrypt',
      saltB64: salt.toString('base64'),
      ivB64: iv.toString('base64'),
      n,
      r,
      p,
    };
    await this.writeEncryptedStreamHeaderV1(res, header);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.file(dbDump, { name: 'db.dump' });
    archive.file(uploadsTar, { name: 'uploads.tar.gz' });
    archive.append(manifestStr, { name: 'manifest.json' });

    cipher.pipe(res, { end: false });
    archive.pipe(cipher);

    const finalize = async () => {
      try {
        await archive.finalize();
      } catch (e) {
        // archiver will emit error too; ignore here
      }
    };

    const cleanup = async () => {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => null);
    };

    archive.on('error', async (err) => {
      console.error('backup archive error:', err);
      await cleanup();
      if (!res.headersSent) res.status(500);
      res.end();
    });

    cipher.on('error', async (err) => {
      console.error('backup cipher error:', err);
      await cleanup();
      if (!res.headersSent) res.status(500);
      res.end();
    });

    cipher.on('end', async () => {
      try {
        const tag = cipher.getAuthTag();
        res.write(tag);
      } finally {
        await cleanup();
        res.end();
      }
    });

    // Start
    void finalize();
  }

  async streamEncryptedSecrets(res: Response, input: { actor: any; password: string }) {
    const text = buildSecretsEnvText();
    const filename = `tattoo-crm-secrets_${new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_')}.env.enc`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const n = 2 ** 15;
    const r = 8;
    const p = 1;
    const key = buildKey(input.password, salt, n, r, p);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const header: EncHeaderV1 = {
      v: 1,
      alg: 'aes-256-gcm',
      kdf: 'scrypt',
      saltB64: salt.toString('base64'),
      ivB64: iv.toString('base64'),
      n,
      r,
      p,
    };
    await this.writeEncryptedStreamHeaderV1(res, header);

    cipher.pipe(res, { end: false });
    cipher.end(Buffer.from(text, 'utf8'));

    cipher.on('end', () => {
      const tag = cipher.getAuthTag();
      res.write(tag);
      res.end();
    });
  }

  private async acquireLock() {
    const lockFile = path.join(os.tmpdir(), 'backup-restore.lock');
    try {
      const fd = await fsp.open(lockFile, 'wx');
      await fd.writeFile(String(Date.now()));
      await fd.close();
      return lockFile;
    } catch {
      throw new BadRequestException('Restore is already running');
    }
  }

  private async releaseLock(lockFile: string) {
    await fsp.rm(lockFile, { force: true }).catch(() => null);
  }

  async restoreFromEncryptedBackupFile(input: { actor: any; password: string; encryptedFilePath: string }) {
    const lockFile = await this.acquireLock();

    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'restore-'));
    const zipPath = path.join(tmpDir, 'payload.zip');
    const extractDir = path.join(tmpDir, 'unzipped');
    await ensureDir(extractDir);

    const cleanup = async () => {
      await this.releaseLock(lockFile);
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => null);
      await fsp.rm(input.encryptedFilePath, { force: true }).catch(() => null);
    };

    try {
      // Enter maintenance mode for restore window (ephemeral; do not persist across restart).
      this.maintenance.enableEphemeral('系統維護中：正在還原備份，請稍後再試');

      // Disconnect Prisma before heavy restore
      await this.prisma.$disconnect().catch(() => null);

      // Parse header
      const fd = await fsp.open(input.encryptedFilePath, 'r');
      const stat = await fd.stat();
      const size = stat.size;
      const magicBuf = Buffer.alloc(ENC_MAGIC.length);
      await fd.read(magicBuf, 0, magicBuf.length, 0);
      if (!magicBuf.equals(ENC_MAGIC)) throw new Error('Invalid backup file (magic mismatch)');
      const lenBuf = Buffer.alloc(4);
      await fd.read(lenBuf, 0, 4, ENC_MAGIC.length);
      const headerLen = lenBuf.readUInt32BE(0);
      const headerBuf = Buffer.alloc(headerLen);
      await fd.read(headerBuf, 0, headerLen, ENC_MAGIC.length + 4);
      const header = JSON.parse(headerBuf.toString('utf8')) as EncHeaderV1;
      const tag = Buffer.alloc(16);
      await fd.read(tag, 0, 16, size - 16);
      await fd.close();

      if (header.v !== 1 || header.alg !== 'aes-256-gcm' || header.kdf !== 'scrypt') {
        throw new Error('Unsupported backup header');
      }

      const salt = Buffer.from(header.saltB64, 'base64');
      const iv = Buffer.from(header.ivB64, 'base64');
      const key = buildKey(input.password, salt, header.n, header.r, header.p);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      const payloadStart = ENC_MAGIC.length + 4 + headerLen;
      const payloadEnd = size - 16 - 1;
      await new Promise<void>((resolve, reject) => {
        const rs = fs.createReadStream(input.encryptedFilePath, { start: payloadStart, end: payloadEnd });
        const ws = fs.createWriteStream(zipPath);
        rs.on('error', reject);
        ws.on('error', reject);
        decipher.on('error', reject);
        ws.on('finish', () => resolve());
        rs.pipe(decipher).pipe(ws);
      });

      // Unzip
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(zipPath)
          .pipe(unzipper.Extract({ path: extractDir }))
          .on('close', () => resolve())
          .on('error', reject);
      });

      const manifestPath = path.join(extractDir, 'manifest.json');
      const dbDump = path.join(extractDir, 'db.dump');
      const uploadsTar = path.join(extractDir, 'uploads.tar.gz');
      if (!fs.existsSync(manifestPath) || !fs.existsSync(dbDump) || !fs.existsSync(uploadsTar)) {
        throw new Error('Backup zip missing required files');
      }

      // Restore DB
      const dbUrl = this.getDatabaseUrl();
      await runCmd('pg_restore', [
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        `--dbname=${dbUrl}`,
        dbDump,
      ]);

      // Restore uploads
      const uploadsPath = this.getUploadsPath();
      await ensureDir(uploadsPath);
      await emptyDir(uploadsPath);
      await runCmd('tar', ['-xzf', uploadsTar, '-C', uploadsPath]);

      // Restart service (Railway will restart the container)
      setTimeout(() => process.exit(0), 1500);
    } catch (e) {
      console.error('Restore failed:', e);
      // Exit maintenance mode on failure so the system can continue serving.
      this.maintenance.disableEphemeral();
      await cleanup();
      // Do not kill the process on failure; keep serving.
      return;
    } finally {
      // Clean up best-effort if restore succeeded (process will exit anyway)
      void cleanup();
    }
  }
}


