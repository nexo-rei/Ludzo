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

    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select('*, referred:referred_id(display_name, avatar, photo_url)')
      .eq('referrer_id', user.id);

    const { count: totalReferrals } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id);

    const totalCoins = referrals?.reduce((sum, r) => sum + (r.coins_rewarded || 0), 0) || 0;
    const totalCash = referrals?.reduce((sum, r) => sum + Number(r.cash_commission || 0), 0) || 0;

    return NextResponse.json({
      referrals: referrals || [],
      totalReferrals: totalReferrals || 0,
      totalCoins,
      totalCash,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
