import { supabaseAdmin } from '@/lib/supabase-admin';
import WarmupClient from './WarmupClient';

export default async function WarmupPage() {
  const { data: settings } = await supabaseAdmin
    .from('warmup_settings')
    .select('start_vol, increment, max_vol, weekend')
    .limit(1)
    .single();

  return <WarmupClient initialSettings={settings} />;
}
