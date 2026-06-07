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

    const range = req.nextUrl.searchParams.get('range') || '7d';
    const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User growth
    const { data: userGrowth } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    // Task completions
    const { data: taskCompletions } = await supabaseAdmin
      .from('user_tasks')
      .select('completed_at')
      .gte('completed_at', startDate.toISOString())
      .order('completed_at');

    // Ad watches
    const { data: adWatches } = await supabaseAdmin
      .from('ad_logs')
      .select('watched_at')
      .gte('watched_at', startDate.toISOString())
      .order('watched_at');

    // Withdrawals
    const { data: withdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('created_at, amount, currency, status')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    return NextResponse.json({
      userGrowth: userGrowth || [],
      taskCompletions: taskCompletions || [],
      adWatches: adWatches || [],
      withdrawals: withdrawals || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
