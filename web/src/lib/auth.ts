import { createClient } from '@/utils/supabase/client';

export type AuthUser = {
  id: string;
  email: string | null;
};

/** Client components only — jangan import server supabase di sini */
export async function getClientAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}
