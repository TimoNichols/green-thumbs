import { supabase } from '../lib/supabase';

const DEFAULTS = { humidity: null, light: null, temperature: null };

export async function getHomeEnvironment() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ...DEFAULTS };
    const { data } = await supabase
      .from('home_environment')
      .select('humidity, light, temperature')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) return { ...DEFAULTS };
    return {
      humidity:    data.humidity    ?? null,
      light:       data.light       ?? null,
      temperature: data.temperature ?? null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveHomeEnvironment(env) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('home_environment').upsert(
      {
        user_id:     user.id,
        humidity:    env.humidity    ?? null,
        light:       env.light       ?? null,
        temperature: env.temperature ?? null,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch {}
}
