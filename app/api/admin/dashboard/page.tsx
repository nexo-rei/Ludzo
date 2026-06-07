import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const telegramId = req.headers.get('x-telegram-id');
    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('telegram_id', telegramId)
      .single();

    if (!adminUser || !['admin', 'owner', 'moderator'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Stats
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: newUsersToday } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { data: totalCoins } = await supabaseAdmin
      .from('wallets')
      .select('coins');
    const coinsSum = totalCoins?.reduce((s, w) => s + Number(w.coins), 0) || 0;

    const { count: totalAds } = await supabaseAdmin
      .from('ad_logs')
      .select('*', { count: 'exact', head: true });

    const { count: pendingWithdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: approvedWithdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: rejectedWithdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    // Top earners (by coins)
    const { data: topEarners } = await supabaseAdmin
      .from('wallets')
      .select('user_id, coins, users!inner(display_name, avatar, photo_url)')
      .order('coins', { ascending: false })
      .limit(10);

    // Top referrers
    const { data: topReferrers } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id, users!inner(display_name)')
      .limit(100);

    const referrerCounts = (topReferrers || []).reduce((acc: any, r: any) => {
      const id = r.referrer_id;
      if (!acc[id]) acc[id] = { count: 0, name: r.users?.display_name || 'Anonymous' };
      acc[id].count++;
      return acc;
    }, {});

    const sortedReferrers = Object.entries(referrerCounts)
      .map(([id, data]: [string, any]) => ({ referrer_id: id, count: data.count, name: data.name }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent audit logs
    const { data: recentLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*, admin:admin_id(display_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        totalCoins: coinsSum,
        totalAds: totalAds || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        approvedWithdrawals: approvedWithdrawals || 0,
        rejectedWithdrawals: rejectedWithdrawals || 0,
      },
      topEarners: topEarners || [],
      topReferrers: sortedReferrers || [],
      recentLogs: recentLogs || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
