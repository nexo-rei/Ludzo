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

    const { count: tasksCompleted } = await supabaseAdmin
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const { count: adsWatched } = await supabaseAdmin
      .from('ad_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: referrals } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id);

    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('amount, currency')
      .eq('user_id', user.id);

    const totalCoinsEarned = transactions
      ?.filter(t => t.currency === 'coins')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    return NextResponse.json({
      tasksCompleted: tasksCompleted || 0,
      adsWatched: adsWatched || 0,
      referrals: referrals || 0,
      totalCoinsEarned,
      gamesPlayed: 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
