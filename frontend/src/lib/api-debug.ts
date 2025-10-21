// API 調試工具
export function debugApiUrls() {
  if (typeof window === 'undefined') return;
  
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  console.log('🔍 API URL 調試資訊:');
  console.log('Hostname:', hostname);
  console.log('Origin:', origin);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  
  // 嘗試不同的後端 URL 模式
  const possibleUrls = [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    `https://${hostname.replace('tattoo-crm-production', 'tattoo-crm-backend')}`,
    `https://${hostname.replace('tattoo-crm-production', 'tattoo-crm')}`,
    `https://${hostname.replace('tattoo-crm-production', 'backend')}`,
    `https://${hostname.replace('tattoo-crm-production', 'api')}`,
    origin.replace(/:\d+$/, ':4000'),
    ...(hostname === 'localhost' ? ['http://localhost:4000'] : [])
  ].filter(Boolean);
  
  console.log('可能的 API URLs:', possibleUrls);
  
  return possibleUrls;
}

// 測試 API 連線
export async function testApiConnection(url: string): Promise<boolean> {
  try {
    // 測試實際的 API 端點
    const response = await fetch(`${url}/services`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.log(`❌ ${url}/services 連線失敗:`, error);
    return false;
  }
}

// 自動檢測可用的 API URL
export async function findWorkingApiUrl(): Promise<string | null> {
  const possibleUrls = debugApiUrls();
  
  // 如果沒有可用的 URL 列表，返回 null
  if (!possibleUrls || possibleUrls.length === 0) {
    console.log('❌ 沒有可用的 API URL 列表。');
    return null;
  }
  
  for (const url of possibleUrls) {
    if (url && await testApiConnection(url)) {
      console.log(`✅ 找到可用的 API URL: ${url}`);
      return url;
    }
  }
  
  console.log('❌ 沒有找到可用的 API URL');
  return null;
}
