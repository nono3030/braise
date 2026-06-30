'use server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function saveWarmupSettings(settings: {
    start_vol: number;
    increment: number;
    max_vol: number;
    weekend: boolean;
}): Promise<void> {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabaseAdmin
        .from('warmup_settings')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (existing) {
        await supabaseAdmin
            .from('warmup_settings')
            .update(settings)
            .eq('id', existing.id);
    } else {
        await supabaseAdmin
            .from('warmup_settings')
            .insert({ ...settings, user_id: user.id });
    }
}
