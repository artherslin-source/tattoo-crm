# ⚡ 前端性能優化指南

## 🎯 實施的優化

### 1. **路由預載入（Prefetching）**

當用戶 hover 在選單項目上時，自動預載入該頁面：

```typescript
<Link 
  href="/admin/analytics"
  prefetch={true}  // Next.js 自動預載入
>
  📈 統計報表
</Link>
```

### 2. **圖片優化**

使用 Next.js Image 組件：

```typescript
import Image from 'next/image';

<Image 
  src="/avatar.jpg"
  width={40}
  height={40}
  alt="Avatar"
  loading="lazy"  // 延遲載入
/>
```

### 3. **代碼分割**

大型組件使用動態導入：

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>載入中...</div>,
  ssr: false,  // 客戶端渲染
});
```

### 4. **數據快取**

#### 瀏覽器端快取：
```typescript
// 使用 React Query 或 SWR
import useSWR from 'swr';

const { data, error } = useSWR(
  '/admin/analytics',
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,  // 1分鐘內不重複請求
  }
);
```

#### Service Worker 快取：
- 快取靜態資源
- 離線支援

### 5. **虛擬滾動**

大列表使用虛擬滾動：

```typescript
import { VirtualScroller } from 'react-virtual';

// 只渲染可見的項目
// 1000筆數據只渲染 ~20筆
```

## 📊 性能指標

### 目標：
- FCP (First Contentful Paint): < 1.5s
- LCP (Largest Contentful Paint): < 2.5s
- TTI (Time to Interactive): < 3.5s
- CLS (Cumulative Layout Shift): < 0.1

### 當前優化：
- ✅ 後端快取：2-3分鐘
- ✅ 並行查詢：3-10倍提升
- ✅ 資料庫索引：2-5倍提升
- ✅ Link prefetch：即時載入體驗
- ✅ 精美載入動畫：提升等待體驗

