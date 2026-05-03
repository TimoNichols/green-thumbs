import { supabase } from '../lib/supabase';

// ─── Row ↔ app-shape mapping ──────────────────────────────────

function fromRow(row) {
  return {
    id:                  row.id,
    timestamp:           row.created_at,
    status:              row.status ?? 'owned',
    photoUri:            row.photo_url ?? null,
    species:             row.species ?? '',
    common_name:         row.common_name ?? '',
    confidence:          row.confidence ?? 1.0,
    source:              row.source ?? 'manual',
    water:               row.water ?? '',
    sunlight:            row.sunlight ?? '',
    soil:                row.soil ?? '',
    humidity:            row.humidity ?? '',
    placement:           row.placement ?? '',
    health_tips:         row.health_tips ?? [],
    difficulty:          row.difficulty ?? 'moderate',
    symptom:             row.current_symptom ?? null,
    symptom_source:      row.symptom_source ?? null,
    auto_symptom_detail: row.auto_symptom_detail ?? null,
    text_diagnosis:      row.text_diagnosis ?? null,
    schedule:            row.schedule ?? {},
    notes:               row.notes ?? null,
  };
}

function toRow(report) {
  return {
    status:              report.status ?? 'owned',
    species:             report.species ?? null,
    common_name:         report.common_name ?? null,
    photo_url:           report.photoUri ?? null,
    confidence:          report.confidence ?? 1.0,
    source:              report.source ?? 'manual',
    water:               report.water ?? null,
    sunlight:            report.sunlight ?? null,
    soil:                report.soil ?? null,
    humidity:            report.humidity ?? null,
    placement:           report.placement ?? null,
    health_tips:         report.health_tips ?? [],
    difficulty:          report.difficulty ?? 'moderate',
    current_symptom:     report.symptom ?? null,
    symptom_source:      report.symptom_source ?? null,
    auto_symptom_detail: report.auto_symptom_detail ?? null,
    text_diagnosis:      report.text_diagnosis ?? null,
    schedule:            report.schedule ?? {},
    notes:               report.notes ?? null,
  };
}

function updatesToRow(updates) {
  const fieldMap = {
    status:              'status',
    species:             'species',
    common_name:         'common_name',
    photoUri:            'photo_url',
    confidence:          'confidence',
    source:              'source',
    water:               'water',
    sunlight:            'sunlight',
    soil:                'soil',
    humidity:            'humidity',
    placement:           'placement',
    health_tips:         'health_tips',
    difficulty:          'difficulty',
    symptom:             'current_symptom',
    symptom_source:      'symptom_source',
    auto_symptom_detail: 'auto_symptom_detail',
    text_diagnosis:      'text_diagnosis',
    schedule:            'schedule',
    notes:               'notes',
  };
  const row = {};
  for (const [appKey, dbKey] of Object.entries(fieldMap)) {
    if (appKey in updates) row[dbKey] = updates[appKey] ?? null;
  }
  return row;
}

// ─── Photo upload ─────────────────────────────────────────────

export async function uploadPlantPhoto(localUri) {
  if (!localUri) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const path = `${user.id}/${Date.now()}.jpg`;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from('plant-photos')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) return null;
    return supabase.storage.from('plant-photos').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

// ─── CRUD ─────────────────────────────────────────────────────

export async function getHistory() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'owned')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map(fromRow);
  } catch {
    return [];
  }
}

export async function addToHistory(report) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('plants')
      .insert({ ...toRow(report), user_id: user.id, status: 'owned' })
      .select()
      .single();
    if (error) return null;
    return fromRow(data);
  } catch {
    return null;
  }
}

export async function deleteFromHistory(id) {
  try {
    await supabase.from('plants').delete().eq('id', id);
  } catch {}
}

export async function updateHistory(id, updates) {
  try {
    const row = updatesToRow(updates);
    if (Object.keys(row).length === 0) return null;
    const { data, error } = await supabase
      .from('plants')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return fromRow(data);
  } catch {
    return null;
  }
}

export async function clearHistory() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('plants').delete().eq('user_id', user.id).eq('status', 'owned');
  } catch {}
}
