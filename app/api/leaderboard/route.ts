import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'inr';

    // Get top 50 users by wallet balance
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('user_id, inr_balance, usdt_balance, users!inner(display_name, avatar, photo_url, username)')
      .order(type === 'inr' ? 'inr_balance' : 'usdt_balance', { ascending: false })
      .limit(50);

    const leaderboard = (wallets || []).map((w: any, index: number) => ({
      rank: index + 1,
      user_id: w.user_id,
      display_name: w.users?.display_name || 'Anonymous',
      avatar: w.users?.avatar,
      photo_url: w.users?.photo_url,
      balance: type === 'inr' ? Number(w.inr_balance) : Number(w.usdt_balance),
      rank_label: index === 0 ? 'Legend' : index === 1 ? 'Diamond' : index === 2 ? 'Gold' : '',
    }));

    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
