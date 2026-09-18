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
  username?: string;
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
    const adminId = payload.adminId as string;
    let role = payload.role as string;
    const username = payload.username as string | undefined;

    // Liveness check — moderator ko admin panel se deactivate karte hi uska
    // 24h token turant mar jaye. DB lookup fail ho (table missing etc.) to
    // JWT claim pe fallback, taaki purana setup kabhi lock-out na ho.
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { data: row } = await createAdminClient()
        .from("admin_users")
        .select("role, is_active, username")
        .eq("id", adminId)
        .maybeSingle();
      if (row) {
        if (row.is_active === false) {
          return { ok: false, error: "This account has been deactivated" };
        }
        // DB wali role authoritative hai (token 24h purana ho sakta hai)
        role = (row.role as string) ?? role;
      }
    } catch {
      /* DB check best-effort */
    }

    return { ok: true, adminId, username, role };
  } catch {
    return { ok: false, error: "Invalid or expired admin token" };
  }
}
