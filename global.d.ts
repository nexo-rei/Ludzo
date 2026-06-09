// Node.js global type augmentations for Next.js API routes and server-side code
declare var process: {
  env: Record<string, string | undefined>;
};

interface NodeHmac {
  update(data: string | Buffer): NodeHmac;
  digest(): Buffer;
  digest(encoding: "hex" | "base64"): string;
}

interface NodeHash {
  update(data: string | Buffer): NodeHash;
  digest(): Buffer;
  digest(encoding: "hex" | "base64"): string;
}

declare module "crypto" {
  export function createHmac(algorithm: string, key: string | Buffer): NodeHmac;
  export function createHash(algorithm: string): NodeHash;
  export function randomUUID(): string;
  export function timingSafeEqual(a: Buffer, b: Buffer): boolean;
}
