import { supabase } from '../lib/supabase';

function fromRow(row) {
  return {
    id:          row.id,
    timestamp:   row.created_at,
    status:      row.status ?? 'wishlist',
    species:     row.species ?? '',
    common_name: row.common_name ?? '',
    photo_url:   row.photo_url ?? null,
    photoUri:    row.photo_url ?? null,
    water:       row.water ?? '',
    sunlight:    row.sunlight ?? '',
    soil:        row.soil ?? '',
    humidity:    row.humidity ?? '',
    placement:   row.placement ?? '',
    health_tips: row.health_tips ?? [],
    difficulty:  row.difficulty ?? 'moderate',
    notes:       row.notes ?? null,
    source:      row.source ?? 'manual',
  };
}

export async function getWishlist() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'wishlist')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map(fromRow);
  } catch {
    return [];
  }
}

export async function addToWishlist(item) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('plants')
      .insert({
        user_id:     user.id,
        status:      'wishlist',
        species:     item.species ?? null,
        common_name: item.common_name ?? null,
        photo_url:   item.photoUri ?? item.photo_url ?? null,
        source:      item.source ?? 'manual',
        water:       item.water ?? null,
        sunlight:    item.sunlight ?? null,
        soil:        item.soil ?? null,
        humidity:    item.humidity ?? null,
        placement:   item.placement ?? null,
        health_tips: item.health_tips ?? [],
        difficulty:  item.difficulty ?? 'moderate',
        notes:       item.notes ?? null,
      })
      .select()
      .single();
    if (error) return null;
    return fromRow(data);
  } catch {
    return null;
  }
}

export async function deleteFromWishlist(id) {
  try {
    await supabase.from('plants').delete().eq('id', id);
  } catch {}
}
