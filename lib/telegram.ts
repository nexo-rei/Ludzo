import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export async function validateTelegramInitData(initData: string): Promise<TelegramUser | null> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (expectedHash !== hash) return null;

    const userParam = params.get("user");
    if (!userParam) return null;
    return JSON.parse(userParam) as TelegramUser;
  } catch {
    return null;
  }
}

export function verifyBinanceWebhook(
  payload: string,
  signature: string,
  timestamp: string,
  nonce: string,
  secret: string
): boolean {
  try {
    // Binance Pay webhook signature: HMAC-SHA512 of "{timestamp}\n{nonce}\n{payload}\n"
    const signaturePayload = `${timestamp}\n${nonce}\n${payload}\n`;
    const expected = crypto
      .createHmac("sha512", secret)
      .update(signaturePayload)
      .digest("hex")
      .toUpperCase();
    return expected === signature.toUpperCase();
  } catch {
    return false;
  }
}
