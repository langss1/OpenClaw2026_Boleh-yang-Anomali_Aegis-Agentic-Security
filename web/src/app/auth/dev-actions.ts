'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  DEV_EMAIL_COOKIE,
  DEV_USER_COOKIE,
  isDevAuthSimEnabled,
} from '@/lib/devAuth';

const COOKIE_OPTS = {
  httpOnly: false,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

export async function getDevSession(): Promise<{ userId: string; email: string } | null> {
  if (!isDevAuthSimEnabled()) return null;
  const jar = await cookies();
  const userId = jar.get(DEV_USER_COOKIE)?.value;
  if (!userId) return null;
  return {
    userId,
    email: jar.get(DEV_EMAIL_COOKIE)?.value || 'dev@aegis.local',
  };
}

export async function devLogin(formData: FormData) {
  if (!isDevAuthSimEnabled()) {
    redirect('/login?error=' + encodeURIComponent('Dev login nonaktif.'));
  }

  const userId = ((formData.get('userId') as string) || 'dev-user').trim();
  const email = ((formData.get('email') as string) || 'dev@aegis.local').trim();
  const next = (formData.get('next') as string) || '/pricing';

  const jar = await cookies();
  jar.set(DEV_USER_COOKIE, userId, COOKIE_OPTS);
  jar.set(DEV_EMAIL_COOKIE, email, COOKIE_OPTS);

  revalidatePath('/', 'layout');
  redirect(next.startsWith('/') ? next : '/pricing');
}

export async function clearDevSession() {
  const jar = await cookies();
  jar.delete(DEV_USER_COOKIE);
  jar.delete(DEV_EMAIL_COOKIE);
}
