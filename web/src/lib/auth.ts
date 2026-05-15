import { createClient } from '@/utils/supabase/client';
import { DEV_USER_COOKIE } from '@/lib/devAuth';

export type AuthUser = {
  id: string;
  email: string | null;
  source: 'supabase' | 'dev';
};

function readDevUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${DEV_USER_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Client components only — jangan import server supabase di sini */
export async function getClientAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) {
      return {
        id: data.user.id,
        email: data.user.email ?? null,
        source: 'supabase',
      };
    }
  }

  const devId = readDevUserIdFromCookie();
  if (devId) {
    return { id: devId, email: 'dev@aegis.local', source: 'dev' };
  }

  return null;
}
