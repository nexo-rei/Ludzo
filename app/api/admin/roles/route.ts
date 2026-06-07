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

    if (!adminUser || adminUser.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Owner only' }, { status: 403 });
    }

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, telegram_id, display_name, username, role, status, created_at')
      .neq('role', 'user')
      .order('created_at', { ascending: false });

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const telegramId = req.headers.get('x-telegram-id');
    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('telegram_id', telegramId)
      .single();

    if (!adminUser || adminUser.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Owner only' }, { status: 403 });
    }

    const { userId, role } = await req.json();

    // Prevent changing owner role
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (targetUser?.telegram_id === 7565458414) {
      return NextResponse.json({ error: 'Cannot modify owner role' }, { status: 403 });
    }

    await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId);

    await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminUser.id,
      action: 'change_role',
      target_type: 'user',
      target_id: userId,
      details: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
