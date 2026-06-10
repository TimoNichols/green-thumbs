import { supabase } from "../lib/supabase";
import { uploadPlantPhoto } from "./history";

// ─── Row ↔ app-shape mapping ──────────────────────────────────

function fromRow(row) {
  return {
    id: row.id,
    plantId: row.plant_id,
    healthScore: row.health_score,
    notes: row.notes ?? null,
    photoUri: row.photo_url ?? null,
    createdAt: row.created_at,
  };
}

// ─── Reads ────────────────────────────────────────────────────

// All check-ins for one plant, newest first. Scoped to the
// current user by RLS. Returns [] on any error.
export async function getHealthLogs(plantId) {
  if (!plantId) return [];
  try {
    const { data, error } = await supabase
      .from("health_logs")
      .select("*")
      .eq("plant_id", plantId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(fromRow);
  } catch {
    return [];
  }
}

// ─── Writes ───────────────────────────────────────────────────

// Add a check-in. Uploads the optional photo first (best-effort:
// a failed upload degrades to a text-only log). Returns the new
// log in app shape, or null on error.
export async function addHealthLog({ plantId, healthScore, notes, photoUri }) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !plantId) return null;

    let photoUrl = null;
    if (photoUri) {
      photoUrl = await uploadPlantPhoto(photoUri); // null on failure
    }

    const trimmedNotes = notes && notes.trim() ? notes.trim() : null;

    const { data, error } = await supabase
      .from("health_logs")
      .insert({
        plant_id: plantId,
        user_id: user.id,
        health_score: healthScore,
        notes: trimmedNotes,
        photo_url: photoUrl,
      })
      .select()
      .single();
    if (error) return null;
    return fromRow(data);
  } catch {
    return null;
  }
}
