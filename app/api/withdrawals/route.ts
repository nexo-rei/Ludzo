export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const telegramId = req.headers.get('x-telegram-id');
    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: withdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ withdrawals: withdrawals || [] });
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

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { amount, currency, method, payment_details } = body;

    // Get settings
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value');
    const settingsMap = new Map(settings?.map(s => [s.key, s.value]) || []);

    const feePercent = parseFloat(settingsMap.get('withdrawal_fee') || '5');
    const minAmount = parseFloat(settingsMap.get(currency === 'inr' ? 'upi_min' : 'usdt_min') || (currency === 'inr' ? '50' : '10'));
    const maxAmount = parseFloat(settingsMap.get(currency === 'inr' ? 'upi_max' : 'usdt_max') || (currency === 'inr' ? '5000' : '50'));

    if (amount < minAmount) {
      return NextResponse.json({ error: `Minimum withdrawal is ${minAmount}` }, { status: 400 });
    }
    if (amount > maxAmount) {
      return NextResponse.json({ error: `Maximum withdrawal is ${maxAmount}` }, { status: 400 });
    }

    // Check wallet balance
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const balance = currency === 'inr' ? wallet?.inr_balance : wallet?.usdt_balance;
    if (!balance || Number(balance) < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Check cooldown (24 hours)
    const { data: lastWithdrawal } = await supabaseAdmin
      .from('withdrawals')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastWithdrawal) {
      const lastTime = new Date(lastWithdrawal.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        return NextResponse.json({ error: '24 hour cooldown between withdrawals' }, { status: 429 });
      }
    }

    const fee = amount * (feePercent / 100);
    const netAmount = amount - fee;

    // Create withdrawal
    const { data: withdrawal } = await supabaseAdmin
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount,
        currency,
        method,
        payment_details,
        fee,
        net_amount: netAmount,
      })
      .select()
      .single();

    // Deduct from wallet
    if (currency === 'inr') {
      await supabaseAdmin.rpc('deduct_inr', { p_user_id: user.id, p_amount: amount });
    } else {
      await supabaseAdmin.rpc('deduct_usdt', { p_user_id: user.id, p_amount: amount });
    }

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: amount,
      currency,
      status: 'pending',
    });

    return NextResponse.json({ success: true, withdrawal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
