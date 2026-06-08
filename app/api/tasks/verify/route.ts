import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();
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

    const { data: userTask } = await supabaseAdmin
      .from('user_tasks')
      .select('*, tasks(*)')
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .single();

    if (!userTask || userTask.status !== 'verified') {
      return NextResponse.json({ error: 'Task not verified' }, { status: 400 });
    }

    if (userTask.status === 'completed') {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }

    const task = userTask.tasks;
    const rewardCoins = task?.reward_coins || 0;

    // Add coins
    await supabaseAdmin.rpc('add_coins', {
      p_user_id: user.id,
      p_amount: rewardCoins,
    });

    // Update user task
    await supabaseAdmin
      .from('user_tasks')
      .update({ status: 'completed', claimed_at: new Date().toISOString() })
      .eq('id', userTask.id);

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: task?.type === 'channel' ? 'channel_reward' : 'group_reward',
      amount: rewardCoins,
      currency: 'coins',
      source: task?.title,
    });

    // Get updated wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ success: true, wallet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
