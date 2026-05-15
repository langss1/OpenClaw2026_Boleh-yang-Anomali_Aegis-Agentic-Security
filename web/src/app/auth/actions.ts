'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server';
import { clearDevSession } from './dev-actions';

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=' + encodeURIComponent('Supabase belum dikonfigurasi. Isi web/.env.local atau pakai Dev Login.'));
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect('/login?error=' + encodeURIComponent('Gagal membuat klien Supabase.'));
  }

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const next = (formData.get('next') as string) || '/pricing';
  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/', 'layout');
  redirect(next.startsWith('/') ? next : '/pricing');
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/register?error=' + encodeURIComponent('Supabase belum dikonfigurasi.'));
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect('/register?error=' + encodeURIComponent('Gagal membuat klien Supabase.'));
  }

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
      },
    },
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    redirect('/register?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/', 'layout');
  redirect('/login?message=' + encodeURIComponent('Cek email untuk konfirmasi akun.'));
}

export async function signInWithGitHub() {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=' + encodeURIComponent('Supabase belum dikonfigurasi untuk OAuth.'));
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect('/login?error=' + encodeURIComponent('Gagal membuat klien Supabase.'));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const callbackUrl = `${siteUrl.replace(/\/$/, '')}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: callbackUrl,
      scopes: 'repo',
    },
  });

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message));
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  await clearDevSession();
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      if (supabase) await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
