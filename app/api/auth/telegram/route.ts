import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramInitData } from '@/lib/telegram/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { initData, referralCode } = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!initData || !botToken) {
      return NextResponse.json({ error: 'Missing init data or bot token' }, { status: 400 });
    }

    const { valid, user } = validateTelegramInitData(initData, botToken);
    if (!valid || !user) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 });
    }

    const telegramId = user.id;
    const displayName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    const username = user.username || null;
    const photoUrl = user.photo_url || null;
    const languageCode = user.language_code || 'en';
    const country = user.language_code === 'ru' ? 'RU' : languageCode === 'es' ? 'ES' : languageCode === 'pt' ? 'BR' : languageCode === 'ar' ? 'SA' : languageCode === 'tr' ? 'TR' : languageCode === 'id' ? 'ID' : languageCode === 'vi' ? 'VN' : 'IN';

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*, wallets(*)')
      .eq('telegram_id', telegramId)
      .single();

    let userData = existingUser;
    let isNewUser = false;

    if (!existingUser) {
      // Create new user
      const referral_code = String(telegramId);
      let referred_by = null;

      // Handle referral
      if (referralCode && referralCode !== referral_code) {
        const { data: referrer } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('referral_code', referralCode)
          .single();
        if (referrer) {
          referred_by = referrer.id;
        }
      }

      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          telegram_id: telegramId,
          display_name: displayName,
          username,
          photo_url: photoUrl,
          language: languageCode,
          country,
          referral_code,
          referred_by,
          welcome_bonus_claimed: false,
        })
        .select()
        .single();

      if (userError || !newUser) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      // Create wallet
      await supabaseAdmin
        .from('wallets')
        .insert({ user_id: newUser.id, coins: 0, inr_balance: 0, usdt_balance: 0 });

      // Process referral
      if (referred_by) {
        const { data: settings } = await supabaseAdmin
          .from('settings')
          .select('value')
          .eq('key', 'referral_reward')
          .single();
        const referralReward = parseInt(settings?.value || '20', 10);

        // Add coins to referrer
        await supabaseAdmin.rpc('add_coins', {
          p_user_id: referred_by,
          p_amount: referralReward,
        });

        // Create referral record
        await supabaseAdmin.from('referrals').insert({
          referrer_id: referred_by,
          referred_id: newUser.id,
          coins_rewarded: referralReward,
        });

        // Log transaction
        await supabaseAdmin.from('transactions').insert({
          user_id: referred_by,
          type: 'referral_reward',
          amount: referralReward,
          currency: 'coins',
          source: `referral_${newUser.id}`,
        });
      }

      userData = newUser;
      isNewUser = true;
    } else {
      // Update user info
      await supabaseAdmin
        .from('users')
        .update({
          display_name: displayName,
          username,
          photo_url: photoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);
    }

    // Fetch fresh user data with wallet
    const { data: freshUser } = await supabaseAdmin
      .from('users')
      .select('*, wallets(*)')
      .eq('telegram_id', telegramId)
      .single();

    // Award welcome bonus if new user
    if (isNewUser && freshUser && !freshUser.welcome_bonus_claimed) {
      const { data: settings } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', 'welcome_bonus')
        .single();
      const welcomeBonus = parseInt(settings?.value || '20', 10);

      await supabaseAdmin.rpc('add_coins', {
        p_user_id: freshUser.id,
        p_amount: welcomeBonus,
      });

      await supabaseAdmin
        .from('users')
        .update({ welcome_bonus_claimed: true })
        .eq('id', freshUser.id);

      await supabaseAdmin.from('transactions').insert({
        user_id: freshUser.id,
        type: 'welcome_bonus',
        amount: welcomeBonus,
        currency: 'coins',
      });
    }

    return NextResponse.json({
      success: true,
      user: freshUser,
      isNewUser,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}
