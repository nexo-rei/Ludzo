import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req); if (!auth.ok) return NextResponse.json({ success:false }, { status:401 });
  const { data, error } = await createAdminClient().from("ludo_display_profiles").select("*").order("coin_balance", { ascending:false });
  if (error) return NextResponse.json({ success:false, error:error.message }, { status:500 });
  return NextResponse.json({ success:true, data:data ?? [] });
}
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req); if (!auth.ok) return NextResponse.json({ success:false }, { status:401 });
  const body = await req.json();
  const name = String(body.display_name ?? "").trim(), avatar = String(body.avatar_url ?? "").trim();
  if (!name || !/^https?:\/\//.test(avatar)) return NextResponse.json({success:false,error:"Name and a valid image URL are required"},{status:400});
  const { data, error } = await createAdminClient().from("ludo_display_profiles").insert({ display_name:name, avatar_url:avatar, coin_balance:Math.max(0,Number(body.coin_balance)||0), usdt_balance:Math.max(0,Number(body.usdt_balance)||0) }).select().single();
  if (error) return NextResponse.json({success:false,error:error.message},{status:500}); return NextResponse.json({success:true,data});
}
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req); if (!auth.ok) return NextResponse.json({ success:false }, { status:401 });
  const b=await req.json(); const id=String(b.id); const patch={display_name:String(b.display_name??"").trim(),avatar_url:String(b.avatar_url??"").trim(),coin_balance:Math.max(0,Number(b.coin_balance)||0),usdt_balance:Math.max(0,Number(b.usdt_balance)||0),active:Boolean(b.active)};
  const {error}=await createAdminClient().from("ludo_display_profiles").update(patch).eq("id",id); if(error)return NextResponse.json({success:false,error:error.message},{status:500}); return NextResponse.json({success:true});
}
