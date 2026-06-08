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

    // Get all active tasks
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Get user tasks
    const { data: userTasks } = await supabaseAdmin
      .from('user_tasks')
      .select('*')
      .eq('user_id', user.id);

    const userTaskMap = new Map(userTasks?.map(ut => [ut.task_id, ut]) || []);

    // Get today's ad logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: adLogs } = await supabaseAdmin
      .from('ad_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('watched_at', today.toISOString());

    const tasksWithStatus = tasks?.map(task => {
      const userTask = userTaskMap.get(task.id);
      return {
        ...task,
        user_status: userTask?.status || 'not_started',
        user_task_id: userTask?.id,
      };
    }) || [];

    return NextResponse.json({
  success: true,
  tasksCount: tasksWithStatus.length,
  tasks: tasksWithStatus,
  adsWatchedToday: adLogs?.length || 0,
});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
