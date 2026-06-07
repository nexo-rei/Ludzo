import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    // Get daily ad limit
    const { data: limitSetting } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'daily_ad_limit')
      .single();
    const dailyLimit = parseInt(limitSetting?.value || '15', 10);

    // Get ad reward amount
    const { data: rewardSetting } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'ad_reward')
      .single();
    const adReward = parseInt(rewardSetting?.value || '2', 10);

    // Count today's ads
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from('ad_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('watched_at', today.toISOString());

    if ((count || 0) >= dailyLimit) {
      return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 });
    }

    // Log ad watch
    await supabaseAdmin.from('ad_logs').insert({
      user_id: user.id,
      reward_coins: adReward,
    });

    // Add coins
    await supabaseAdmin.rpc('add_coins', {
      p_user_id: user.id,
      p_amount: adReward,
    });

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'ad_reward',
      amount: adReward,
      currency: 'coins',
    });

    // Get updated wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      reward: adReward,
      adsWatchedToday: (count || 0) + 1,
      dailyLimit,
      wallet,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
