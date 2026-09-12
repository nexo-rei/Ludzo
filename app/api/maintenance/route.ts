import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings(createAdminClient());
    return NextResponse.json({
      success: true,
      data: {
        maintenance_mode: settings.maintenance_mode === true,
        maintenance_message: settings.maintenance_message ?? "",
      },
    });
  } catch {
    // Fail OPEN — a settings outage must never lock every user out.
    return NextResponse.json({
      success: true,
      data: { maintenance_mode: false, maintenance_message: "" },
    });
  }
}
