// No import needed – Web Crypto API (crypto.subtle) is available globally in the Edge Runtime.

export interface TelegramInitData {
  user?: string;
  query_id?: string;
  auth_date?: string;
  hash?: string;
}

/** Encode a string as UTF-8 bytes. */
function enc(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Import raw bytes as an HMAC-SHA-256 key. */
async function importHmacKey(keyData: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Compute HMAC-SHA-256 of `data` with the given `key`. */
async function hmacSha256(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer);
  return new Uint8Array(sig);
}

/** Convert a Uint8Array to a lowercase hex string. */
function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function validateTelegramInitData(
  initData: string,
  botToken: string,
): Promise<{ valid: boolean; user?: any }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // secretKey = HMAC-SHA256("WebAppData", botToken)
    const webAppDataKey = await importHmacKey(enc('WebAppData'));
    const secretKeyBytes = await hmacSha256(webAppDataKey, enc(botToken));

    // checkHash = HMAC-SHA256(secretKey, dataCheckString)
    const secretKey = await importHmacKey(secretKeyBytes);
    const checkHashBytes = await hmacSha256(secretKey, enc(dataCheckString));
    const checkHash = toHex(checkHashBytes);

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

export async function verifyTelegramMembership(
  chatId: string | number,
  userId: number,
  botToken: string,
): Promise<boolean> {
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

