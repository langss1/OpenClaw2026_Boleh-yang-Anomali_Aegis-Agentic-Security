const API_URL = process.env.API_URL || 'http://localhost:4000';

export type Subscription = {
  userId: string;
  tier?: string;
  planId?: string;
  planName?: string;
  licenseKey?: string | null;
  status?: string;
  isActive?: boolean;
  expiresAt?: string | null;
  limits?: { aiBackend?: string };
};

export async function fetchPlans() {
  const res = await fetch(`${API_URL}/api/plans`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.plans || [];
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const res = await fetch(`${API_URL}/api/subscription/${encodeURIComponent(userId)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchOrderStatus(orderId: string) {
  const res = await fetch(`${API_URL}/api/order/${encodeURIComponent(orderId)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return { paid: false, error: 'Order tidak ditemukan' };
  return res.json();
}
