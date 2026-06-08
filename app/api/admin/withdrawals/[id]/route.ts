export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const body = await req.json();
    const { status, notes } = body;

    const updates: any = { status };
    if (notes) updates.notes = notes;
    if (status === 'approved' || status === 'rejected') {
      updates.processed_at = new Date().toISOString();
      updates.processed_by = adminUser.id;
    }

    const { data: withdrawal } = await supabaseAdmin
      .from('withdrawals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    // If rejected, refund the amount
    if (status === 'rejected' && withdrawal) {
      if (withdrawal.currency === 'inr') {
        await supabaseAdmin.rpc('add_inr', {
          p_user_id: withdrawal.user_id,
          p_amount: withdrawal.amount,
        });
      } else {
        await supabaseAdmin.rpc('add_usdt', {
          p_user_id: withdrawal.user_id,
          p_amount: withdrawal.amount,
        });
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminUser.id,
      action: `withdrawal_${status}`,
      target_type: 'withdrawal',
      target_id: id,
      details: { status, notes },
    });

    return NextResponse.json({ success: true, withdrawal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
