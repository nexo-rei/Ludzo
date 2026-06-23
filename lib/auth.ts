import { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

// ─── User Auth ───────────────────────────────────────────────────────────────

interface AuthResult {
  ok: boolean;
  userId?: string;
  error?: string;
}

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  // Support both Authorization: Bearer <userId> and x-user-id header
  //rebuild
  //rebuild
  const authHeader = req.headers.get("authorization");
  const xUserId = req.headers.get("x-user-id");

  console.log("AUTH HEADER =", authHeader); // 👈 ADD
  console.log("X USER ID =", xUserId);       // 👈 ADD
  
  
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    userId = authHeader.slice(7).trim();
  } else if (xUserId) {
    userId = xUserId.trim();
  }
  
  console.log("PARSED USER ID =", userId); // 👈 ADD
  

  if (!userId || userId.length < 10) {
    return { ok: false, error: "Unauthorized" };
  }

  return { ok: true, userId };
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

interface AdminAuthResult {
  ok: boolean;
  adminId?: string;
  role?: string;
  error?: string;
}

const getJwtSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? "ludzo_dev_secret_min_32_chars_long");

export async function generateAdminToken(
  payload: { adminId: string; username?: string; role: string }
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecret());
}

export async function requireAdminAuth(req: NextRequest): Promise<AdminAuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, error: "No admin token provided" };
  }

  const token = authHeader.slice(7).trim();
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      ok: true,
      adminId: payload.adminId as string,
      role: payload.role as string,
    };
  } catch {
    return { ok: false, error: "Invalid or expired admin token" };
  }
}
