/**
 * 提供 Express.Multer.File 型別，避免建置環境未安裝 @types/multer 時編譯失敗。
 * 部署（Zeabur 等）常僅安裝 production dependencies，建置時會報 Namespace 'Express' has no exported member 'Multer'。
 */
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer?: Buffer;
      }
    }
  }
}

export {};
