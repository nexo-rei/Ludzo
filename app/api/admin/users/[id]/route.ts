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

    // Prevent modifying owner
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('telegram_id, role')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.telegram_id === 7565458414) {
      return NextResponse.json({ error: 'Owner account cannot be modified' }, { status: 403 });
    }

    // Prevent non-owners from modifying admins
    if (targetUser.role === 'admin' && adminUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can modify admins' }, { status: 403 });
    }

    const allowedFields = ['display_name', 'role', 'status', 'coins', 'inr_balance', 'usdt_balance'];
    const updates: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Handle wallet updates separately
    if (body.coins !== undefined || body.inr_balance !== undefined || body.usdt_balance !== undefined) {
      const walletUpdates: any = {};
      if (body.coins !== undefined) walletUpdates.coins = body.coins;
      if (body.inr_balance !== undefined) walletUpdates.inr_balance = body.inr_balance;
      if (body.usdt_balance !== undefined) walletUpdates.usdt_balance = body.usdt_balance;

      await supabaseAdmin
        .from('wallets')
        .update(walletUpdates)
        .eq('user_id', id);
    }

    delete updates.coins;
    delete updates.inr_balance;
    delete updates.usdt_balance;

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', id);
    }

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminUser.id,
      action: 'update_user',
      target_type: 'user',
      target_id: id,
      details: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
