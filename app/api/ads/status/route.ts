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

    const { data: limitSetting } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'daily_ad_limit')
      .single();
    const dailyLimit = parseInt(limitSetting?.value || '15', 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from('ad_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('watched_at', today.toISOString());

    return NextResponse.json({
      adsWatchedToday: count || 0,
      dailyLimit,
      remaining: Math.max(0, dailyLimit - (count || 0)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
