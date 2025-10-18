import { Injectable } from '@nestjs/common';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 分鐘

  /**
   * 從快取獲取數據，如果不存在或已過期則執行 fn
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // 如果快取有效，直接返回
    if (cached && cached.expiresAt > now) {
      console.log(`✅ Cache HIT: ${key}`);
      return cached.data as T;
    }

    // 否則執行函數並快取結果
    console.log(`❌ Cache MISS: ${key} - Fetching fresh data`);
    const data = await fn();
    
    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
    });

    return data;
  }

  /**
   * 清除特定快取
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * 清除所有快取
   */
  invalidateAll(): void {
    this.cache.clear();
    console.log('🗑️ All cache cleared');
  }

  /**
   * 清除過期的快取項目（定期清理）
   */
  cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache items`);
    }
  }

  /**
   * 獲取快取統計
   */
  getStats() {
    const now = Date.now();
    const items = Array.from(this.cache.entries());
    
    return {
      total: items.length,
      valid: items.filter(([, item]) => item.expiresAt > now).length,
      expired: items.filter(([, item]) => item.expiresAt <= now).length,
    };
  }
}

