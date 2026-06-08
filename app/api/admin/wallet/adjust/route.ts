export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    if (!adminUser || !['admin', 'owner'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, currency, amount, action } = await req.json();

    // Prevent modifying owner wallet
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (targetUser?.telegram_id === 7565458414) {
      return NextResponse.json({ error: 'Cannot modify owner wallet' }, { status: 403 });
    }

    if (currency === 'coins') {
      if (action === 'add') {
        await supabaseAdmin.rpc('add_coins', { p_user_id: userId, p_amount: amount });
      } else {
        await supabaseAdmin.rpc('deduct_coins', { p_user_id: userId, p_amount: amount });
      }
    } else if (currency === 'inr') {
      if (action === 'add') {
        await supabaseAdmin.rpc('add_inr', { p_user_id: userId, p_amount: amount });
      } else {
        await supabaseAdmin.rpc('deduct_inr', { p_user_id: userId, p_amount: amount });
      }
    } else if (currency === 'usdt') {
      if (action === 'add') {
        await supabaseAdmin.rpc('add_usdt', { p_user_id: userId, p_amount: amount });
      } else {
        await supabaseAdmin.rpc('deduct_usdt', { p_user_id: userId, p_amount: amount });
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminUser.id,
      action: `wallet_${action}_${currency}`,
      target_type: 'wallet',
      target_id: userId,
      details: { currency, amount },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
