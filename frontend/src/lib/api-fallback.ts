/**
 * API 調用降級和重試機制
 * 一勞永逸解決 502/503/504 等後端服務問題
 */

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffFactor: 2,
};

/**
 * 帶重試機制的 fetch 包裝器
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10秒超時
      });

      // 如果是 5xx 錯誤，嘗試重試
      if (response.status >= 500 && attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        );
        
        console.warn(`API 請求失敗 (${response.status})，${delay}ms 後重試 (${attempt + 1}/${config.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      
      // 如果是網路錯誤且還有重試機會，則重試
      if (attempt < config.maxRetries && isRetryableError(error)) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        );
        
        console.warn(`網路錯誤，${delay}ms 後重試 (${attempt + 1}/${config.maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }

  throw lastError || new Error('重試次數已用完');
}

/**
 * 判斷錯誤是否可重試
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true; // 網路錯誤
  }
  
  if (error instanceof Error && error.name === 'AbortError') {
    return true; // 超時錯誤
  }
  
  return false;
}

/**
 * 帶降級機制的 API 調用
 */
export async function apiCallWithFallback<T>(
  apiCall: () => Promise<T>,
  fallbackData: T,
  errorMessage: string = 'API 調用失敗'
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.error(errorMessage, error);
    return fallbackData;
  }
}

/**
 * 健康檢查（帶重試）
 */
export async function checkBackendHealthWithRetry(): Promise<boolean> {
  try {
    const response = await fetchWithRetry('/api/health/simple', {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('健康檢查失敗:', error);
    return false;
  }
}

/**
 * 智能 API 調用（自動重試 + 降級）
 */
export async function smartApiCall<T>(
  url: string,
  options: RequestInit = {},
  fallbackData?: T
): Promise<T> {
  try {
    const response = await fetchWithRetry(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API 調用失敗: ${url}`, error);
    
    // 只有在明確提供 fallbackData 且不是空陣列時才使用
    if (fallbackData !== undefined && (!Array.isArray(fallbackData) || (Array.isArray(fallbackData) && fallbackData.length > 0))) {
      console.warn('使用降級資料');
      return fallbackData;
    }
    
    throw error;
  }
}
