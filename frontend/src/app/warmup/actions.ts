'use server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function saveWarmupSettings(settings: {
    start_vol: number;
    increment: number;
    max_vol: number;
    weekend: boolean;
}): Promise<void> {
    const { data: existing } = await supabaseAdmin
        .from('warmup_settings')
        .select('id')
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
            .insert(settings);
    }
}
