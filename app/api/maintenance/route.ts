import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getCapacitySnapshot } from "@/lib/capacity";

export const dynamic = "force-dynamic";

/**
 * Maintenance + server-full status (public — client isse decide karta hai ki
 * maintenance screen dikhana hai ya nahi).
 *
 * `server_full` tab hota hai jab /admin/system → Capacity Controls me block
 * mode ON ho aur active users limit cross ho gayi ho — tab naye users ko
 * maintenance screen pe "servers at full capacity" message ke saath bheja
 * jata hai.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    let serverFull = false;
    let serverFullMessage = settings.server_full_message ?? "";
    try {
      const snapshot = await getCapacitySnapshot(supabase, settings);
      serverFull =
        snapshot.enforcement === "block" && snapshot.users_over === true;
    } catch {
      // Capacity RPCs missing (sql/11 nahi chala) — fail-open, koi block nahi.
    }

    return NextResponse.json({
      success: true,
      data: {
        maintenance_mode: settings.maintenance_mode === true,
        maintenance_message: settings.maintenance_message ?? "",
        server_full: serverFull,
        server_full_message: serverFullMessage,
      },
    });
  } catch {
    // Fail OPEN — a settings outage must never lock every user out.
    return NextResponse.json({
      success: true,
      data: { maintenance_mode: false, maintenance_message: "", server_full: false, server_full_message: "" },
    });
  }
}
