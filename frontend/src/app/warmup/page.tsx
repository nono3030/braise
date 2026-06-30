export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';
import WarmupClient from './WarmupClient';

export default async function WarmupPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? '';

  const { data: settings } = await supabaseAdmin
    .from('warmup_settings')
    .select('start_vol, increment, max_vol, weekend')
    .eq('user_id', userId)
    .limit(1)
    .single();

  return <WarmupClient initialSettings={settings} />;
}
