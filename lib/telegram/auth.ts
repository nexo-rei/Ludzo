import crypto from 'crypto';

export interface TelegramInitData {
  user?: string;
  query_id?: string;
  auth_date?: string;
  hash?: string;
}

export function validateTelegramInitData(initData: string, botToken: string): { valid: boolean; user?: any } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (checkHash !== hash) return { valid: false };

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return { valid: false };

    const userStr = params.get('user');
    if (!userStr) return { valid: false };

    return { valid: true, user: JSON.parse(userStr) };
  } catch {
    return { valid: false };
  }
}

export async function verifyTelegramMembership(chatId: string | number, userId: number, botToken: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!data.ok) return false;
    const status = data.result?.status;
    return ['creator', 'administrator', 'member'].includes(status);
  } catch {
    return false;
  }
}
