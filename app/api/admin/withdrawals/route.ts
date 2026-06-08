export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const telegramId = req.headers.get('x-telegram-id');
    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('telegram_id', telegramId)
      .single();

    if (!adminUser || !['admin', 'owner', 'moderator'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = req.nextUrl.searchParams.get('status');
    let query = supabaseAdmin
      .from('withdrawals')
      .select('*, users!inner(display_name, telegram_id)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data } = await query;

    return NextResponse.json({ withdrawals: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
