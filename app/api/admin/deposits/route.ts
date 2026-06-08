export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const telegramId = req.headers.get('x-telegram-id');
    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Coming soon placeholder
    return NextResponse.json({ deposits: [], status: 'coming_soon' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
