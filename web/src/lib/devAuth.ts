export const DEV_USER_COOKIE = 'aegis_dev_user_id';
export const DEV_EMAIL_COOKIE = 'aegis_dev_email';

export function isDevAuthSimEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEV_AUTH_SIM === 'true') return true;
  if (process.env.NEXT_PUBLIC_DEV_AUTH_SIM === 'false') return false;
  return process.env.NODE_ENV === 'development';
}
