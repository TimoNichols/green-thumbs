# Plant Health Timeline — Design

**Date:** 2026-06-09
**Status:** Approved (pending spec review)
**Goal:** Let users log health check-ins over time for a saved plant — each with a photo,
a 1–5 health score, and optional notes — and view them as a timeline plus a health-score
trend graph on the plant's detail screen. This differentiates Green Thumbs for App Store review.

## Decisions

The original request specced FastAPI `/health-log` endpoints. We deviated, by user decision,
to keep the feature consistent with the app's actual architecture. Final decisions:

1. **Data layer: client-side Supabase, no backend changes.** Every other table in the app
   (`plants`, `care_activity`, `home_environment`) is read/written directly from the frontend
   via `supabase-js` under RLS with the anon key; the FastAPI backend (`main.py`) only does AI
   analysis and one admin delete. Health logs follow the same pattern. `main.py` is untouched.
2. **Entry point: `ReportScreen.js`** (the real plant detail screen), not `GardenScreen.js`
   (which is the care-calendar tab). The button navigates to a new `HealthTimelineScreen`.
3. **Score input: a custom 5-segment selector** (tappable 1–5, colour-coded). No new dependency
   — `@react-native-community/slider` is not installed and discrete taps are better UX for 5 steps.
4. **Sheet style: plain React Native `Modal` with `animationType="slide"`**, matching the existing
   sheets in `GardenScreen.js` and `MyPlantsScreen.js`. No Reanimated bottom sheet.
5. **Entry-point gate: `!!report.id`.** `report.id` is the persisted Supabase `plants` row UUID
   (set via `fromRow` for saved plants; absent on a fresh, unsaved scan). The Health Log row only
   renders when this UUID is present, so logs always attach to a real garden plant. There is no
   scan/API identifier on the report object that could falsely satisfy this gate.

## Scope

**In:** read-only trend graph, append-only check-ins (photo + score + notes), timeline list,
entry point on ReportScreen, navigation wiring, SQL migration.

**Out (YAGNI for v1):** editing or deleting individual logs, pagination/infinite scroll,
cleanup of orphaned log photos in storage on plant deletion (same best-effort behaviour the app
already has for plant photos), backend endpoints, offline queueing.

## Components

### 1. Database — `health_logs` (append to `supabase_migration.sql`)

```sql
CREATE TABLE health_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id     UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_score INT  NOT NULL CHECK (health_score BETWEEN 1 AND 5),
  notes        TEXT,
  photo_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own health logs" ON health_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX health_logs_plant_created ON health_logs (plant_id, created_at DESC);
```

- RLS policy mirrors the existing `"Users manage own X"` policies exactly.
- `ON DELETE CASCADE` from `plants` means deleting a plant removes its logs automatically; the
  app's existing `deleteFromHistory` needs no change.
- Index supports the primary query (logs for one plant, newest first).
- Photos reuse the existing public `plant-photos` storage bucket and its storage RLS policies;
  no new bucket or storage policy is required.

### 2. Data util — `frontend/src/utils/health.js` (new)

Mirrors the shape and error-handling style of `history.js` (try/catch returning `null`/`[]`,
`user_id` from the session).

- `getHealthLogs(plantId)` → `select * from health_logs where plant_id = ? order by created_at desc`,
  scoped to the current user by RLS. Returns `[]` on error. Maps rows to a small app shape:
  `{ id, plantId, healthScore, notes, photoUri, createdAt }`.
- `addHealthLog({ plantId, healthScore, notes, photoUri })`:
  1. If `photoUri` is a local file, upload it via the existing `uploadPlantPhoto` (reused from
     `history.js`) → public URL; on failure, fall back to inserting with `photo_url = null`.
  2. Insert `{ plant_id, user_id, health_score, notes, photo_url }`.
  3. Return the inserted row mapped to app shape, or `null` on error.

### 3. Screen — `frontend/src/screens/HealthTimelineScreen.js` (new)

Route params: `{ plantId, plantName }`. Styling from `theme.js`
(`colors`, `fonts`, `type`, `spacing`, `radii`, `gradients.cta`).

Layout (top to bottom):

- **Header:** back button + `plantName` title, safe-area aware (pattern from existing screens).
- **Trend graph:** `react-native-svg` (already used in `ReportScreen.js`). X = time
  (oldest → newest, left → right), Y = score 1–5. Line stroke `colors.pine`; a small dot at each
  data point. Empty state (0 logs) and single-point state (render just the dot, no line) handled
  gracefully.
- **Timeline list:** logs newest-first. Each row: mono-formatted date, a colour-coded score dot,
  a notes preview (truncated), and a photo thumbnail (`expo-image`) when `photoUri` is present.
- **"Add Check-in" CTA:** gradient button (`gradients.cta`) that opens the check-in modal.

**Score → colour mapping** (used by both the dots and the selector):
`1–2 → colors.danger` (red), `3 → colors.amber` (yellow), `4–5 → colors.leaf` (green).

**Check-in modal:** plain RN `Modal animationType="slide" transparent`. Contents:
- Custom **5-segment score selector**: five tappable segments labelled 1–5, the selected one
  filled with its score colour. Default selection 3.
- Notes `TextInput` (multiline, optional).
- Optional photo picker via `expo-image-picker` (same import/usage as `ReportScreen.js`), showing
  a preview thumbnail once picked.
- **Save**: calls `addHealthLog`, closes the modal, and refreshes the list (and graph). Disabled /
  shows progress while saving. Cancel closes without saving.

Data loads on mount and on screen focus (`useFocusEffect`) so a new check-in is reflected on return.

### 4. Entry point — `frontend/src/screens/ReportScreen.js` (edit)

Add a "Health Log" row in the action area near the existing "Something wrong?" block, rendered
only when `!!report.id`:

```jsx
{!!report.id && (
  <Pressable onPress={() => navigation.navigate('HealthTimeline', {
    plantId: report.id,
    plantName: nickname || report.common_name || report.species || 'Plant',
  })}>
    {/* themed row: leaf icon + "Health Log" label + chevron */}
  </Pressable>
)}
```

No other ReportScreen behaviour changes.

### 5. Navigation — `frontend/src/navigation/RootNavigator.js` (edit)

Register `HealthTimeline` in the authenticated root `Stack.Navigator` (alongside `Report`),
with `animation: 'slide_from_right'` to match `Report`.

```jsx
import HealthTimelineScreen from '../screens/HealthTimelineScreen';
// ...
<Stack.Screen
  name="HealthTimeline"
  component={HealthTimelineScreen}
  options={{ animation: 'slide_from_right' }}
/>
```

## Data flow

```
ReportScreen ("Health Log", gated on report.id)
   → navigate('HealthTimeline', { plantId, plantName })
        → HealthTimelineScreen
             on focus:  getHealthLogs(plantId) ──► supabase.from('health_logs').select (RLS)
             add modal: addHealthLog({...})
                          ├─ uploadPlantPhoto(localUri) ──► Supabase storage (plant-photos)
                          └─ supabase.from('health_logs').insert (RLS)
                          → refresh list + graph
```

## Error handling

- `health.js` follows `history.js`: catch everything, return `null`/`[]`; the screen renders the
  empty state rather than crashing.
- Photo upload failure degrades gracefully to a text-only check-in (`photo_url = null`).
- RLS guarantees a user only ever reads/writes their own logs even though the client uses the
  anon key.

## Testing / verification

- SQL migration applies cleanly against the existing schema; insert/select respect RLS.
- Manual: from a **saved** plant's ReportScreen, the Health Log row appears; from a fresh unsaved
  scan it does not. Add a check-in with and without a photo; confirm it appears in the list and
  shifts the graph. Reopen to confirm persistence. Verify score colours at the 2/3 and 3/4
  boundaries.
```
