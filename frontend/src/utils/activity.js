import { supabase } from '../lib/supabase';

export async function logActivity({ plantId, type }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('care_activity').insert({
      user_id:   user.id,
      plant_id:  plantId,
      care_type: type,
      logged_at: new Date().toISOString(),
    });
  } catch {}
}

export async function getActivity() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('care_activity')
      .select('plant_id, care_type, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(500);
    if (error) return [];
    return (data ?? []).map((row) => ({
      plantId:   row.plant_id,
      type:      row.care_type,
      timestamp: row.logged_at,
    }));
  } catch {
    return [];
  }
}
