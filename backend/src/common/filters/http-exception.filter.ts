import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '內部伺服器錯誤';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || message;
        error = responseObj.error;
      }
    } else if (exception instanceof Error) {
      // 處理 Multer 錯誤或其他一般錯誤
      message = exception.message;
      
      // Multer 特定錯誤處理
      const multerErrorCodes: Record<string, { status: HttpStatus; message: string }> = {
        'LIMIT_FILE_SIZE': { status: HttpStatus.PAYLOAD_TOO_LARGE, message: '文件大小超過限制（最大 10MB）' },
        'LIMIT_FILE_COUNT': { status: HttpStatus.BAD_REQUEST, message: '上傳文件數量超過限制（最多 10 張）' },
        'LIMIT_UNEXPECTED_FILE': { status: HttpStatus.BAD_REQUEST, message: '上傳欄位名稱不正確' },
        'LIMIT_PART_COUNT': { status: HttpStatus.BAD_REQUEST, message: '上傳部分數量超過限制' },
        'LIMIT_FIELD_KEY': { status: HttpStatus.BAD_REQUEST, message: '欄位名稱過長' },
        'LIMIT_FIELD_VALUE': { status: HttpStatus.BAD_REQUEST, message: '欄位值過長' },
        'LIMIT_FIELD_COUNT': { status: HttpStatus.BAD_REQUEST, message: '欄位數量超過限制' },
      };

      // 檢查 Multer 錯誤代碼
      const multerError = multerErrorCodes[(exception as any).code];
      if (multerError) {
        status = multerError.status;
        message = multerError.message;
      } else if (exception.message.includes('File too large')) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = '文件太大，最大允許 10MB';
      } else if (exception.message.includes('Unexpected field')) {
        status = HttpStatus.BAD_REQUEST;
        message = '上傳欄位名稱不正確';
      } else if (exception.message.includes('只允許上傳圖片文件')) {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      } else if (exception.message.includes('無法創建上傳目錄')) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = '伺服器錯誤：無法創建上傳目錄';
      } else if (exception.message.includes('無法生成檔名')) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = '伺服器錯誤：無法生成檔名';
      } else if (exception.message.includes('文件資訊不完整')) {
        status = HttpStatus.BAD_REQUEST;
        message = '上傳的文件資訊不完整';
      } else if (exception.message.includes('文件驗證失敗')) {
        status = HttpStatus.BAD_REQUEST;
        message = '文件驗證失敗，請檢查文件格式';
      }
    }

    this.logger.error(
      `HTTP ${status} Error: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      `${request.method} ${request.url}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error,
    });
  }
}
