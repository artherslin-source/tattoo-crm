// Use same-origin `/api` rewrites to avoid CORS and backend host drift in production.

export interface CartItem {
  id: string;
  cartId: string;
  serviceId: string;
  serviceName: string;
  serviceDescription: string;
  serviceImageUrl?: string;
  selectedVariants: {
    size: string;
    color: string;
    position?: string;
    side?: string;
    design_fee?: number;
    custom_addon?: number;
    style?: string;
    complexity?: string;
  };
  basePrice: number;
  finalPrice: number;
  estimatedDuration: number;
  notes?: string;
  referenceImages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  status: string;
  expiresAt: string;
  items: CartItem[];
  totalPrice: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 獲取購物車
 */
export async function getCart(): Promise<Cart> {
  const res = await fetch(`/api/cart`, {
    credentials: "include", // 重要：發送 session cookie
  });

  if (!res.ok) {
    throw new Error("獲取購物車失敗");
  }

  return res.json();
}

/**
 * 加入購物車
 */
export async function addToCart(data: {
  serviceId: string;
  selectedVariants: {
    size: string;
    color: string;
    position?: string;
    side?: string;
    design_fee?: number;
    style?: string;
    complexity?: string;
    custom_addon?: number;
  };
  notes?: string;
  referenceImages?: string[];
}): Promise<Cart> {
  const res = await fetch(`/api/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "加入購物車失敗");
  }

  return res.json();
}

/**
 * 更新購物車項目
 */
export async function updateCartItem(
  itemId: string,
  data: {
    selectedVariants?: {
      size?: string;
      color?: string;
      position?: string;
      side?: string;
      design_fee?: number;
    };
    notes?: string;
    referenceImages?: string[];
  }
): Promise<Cart> {
  const res = await fetch(`/api/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("更新購物車項目失敗");
  }

  return res.json();
}

/**
 * 刪除購物車項目
 */
export async function removeCartItem(itemId: string): Promise<Cart> {
  const res = await fetch(`/api/cart/items/${itemId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("刪除購物車項目失敗");
  }

  return res.json();
}

/**
 * 結帳（將購物車轉成預約）
 */
export async function checkout(data: {
  branchId: string;
  artistId?: string;
  preferredDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialRequests?: string;
}): Promise<{ contactId: string }> {
  const res = await fetch(`/api/cart/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "結帳失敗");
  }

  return res.json();
}

