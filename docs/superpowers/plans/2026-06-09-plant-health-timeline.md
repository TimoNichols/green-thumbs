# Plant Health Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-plant health check-ins (photo + 1–5 score + notes) shown as a timeline and a score-trend graph, reachable from a saved plant's detail screen.

**Architecture:** Fully client-side, matching the app's existing pattern: a new `health_logs` table read/written directly via `supabase-js` under RLS (anon key); a new `health.js` data util mirroring `history.js`; a new `HealthTimelineScreen`; and minimal edits to `ReportScreen.js` (entry point) and `RootNavigator.js` (route). The FastAPI backend is **not** touched.

**Tech Stack:** React Native / Expo, `@supabase/supabase-js`, `react-native-svg` (graph), `expo-image-picker`, `expo-image`, `expo-file-system/legacy` (reused via `uploadPlantPhoto`). Supabase Postgres + Storage.

**Testing note:** This Expo project has no JS test framework (no `jest`, no `test` script; existing utils/screens have no tests). Standing one up is out of scope. Per the design spec, each task is verified with `expo lint` (catches parse/undefined/unused errors) plus the structured manual verification in Task 6. Do not invent a test runner.

**Design spec:** `docs/superpowers/specs/2026-06-09-plant-health-timeline-design.md`

---

### Task 1: Database — `health_logs` table

**Files:**
- Modify: `supabase_migration.sql` (append at end)

- [ ] **Step 1: Append the table, RLS policy, and index**

Add to the end of `supabase_migration.sql`:

```sql

-- ─── Health logs (Plant Health Timeline) ──────────────────────

CREATE TABLE health_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id     UUID        NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_score INT         NOT NULL CHECK (health_score BETWEEN 1 AND 5),
  notes        TEXT,
  photo_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own health logs" ON health_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX health_logs_plant_created ON health_logs (plant_id, created_at DESC);
```

- [ ] **Step 2: Apply the migration to Supabase**

Run this exact SQL in the Supabase dashboard → SQL Editor (project `kpgfaimeepellbulahuq`), or via the Supabase MCP `apply_migration` tool with name `health_logs`.

Expected: "Success. No rows returned." Reuses the existing public `plant-photos` bucket — no new bucket or storage policy needed.

- [ ] **Step 3: Verify the table exists and RLS is on**

Run in SQL Editor:

```sql
SELECT relrowsecurity FROM pg_class WHERE relname = 'health_logs';
```

Expected: one row, `relrowsecurity = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase_migration.sql
git commit -m "feat: add health_logs table for plant health timeline"
```

---

### Task 2: Data util — `health.js`

**Files:**
- Create: `frontend/src/utils/health.js`

Mirrors `frontend/src/utils/history.js`: row↔app-shape mapping, `user_id` from the session, try/catch returning `null`/`[]`. Photo upload reuses `uploadPlantPhoto` from `history.js` (uploads to `plant-photos` and returns a public URL, or `null` on failure).

- [ ] **Step 1: Write the full file**

Create `frontend/src/utils/health.js`:

```js
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
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: no errors or warnings referencing `src/utils/health.js`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/health.js
git commit -m "feat: add health log data util (client-side supabase)"
```

---

### Task 3: Screen — `HealthTimelineScreen.js`

**Files:**
- Create: `frontend/src/screens/HealthTimelineScreen.js`

Receives route params `{ plantId, plantName }`. Loads logs on focus, renders the trend graph + timeline list, and an "Add Check-in" modal (plain RN `Modal animationType="slide" transparent`, matching `MyPlantsScreen`/`GardenScreen`). Score→colour: `1–2 → colors.danger`, `3 → colors.amber`, `4–5 → colors.leaf`. Graph line is a solid `colors.pine` stroke (no gradient). Default modal score is 3.

- [ ] **Step 1: Write the full file**

Create `frontend/src/screens/HealthTimelineScreen.js`:

```jsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

import { colors, fonts, radii, gradients } from '../utils/theme';
import * as Ico from '../components/Ico';
import { getHealthLogs, addHealthLog } from '../utils/health';

const SCREEN_W = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────

// 1–2 red, 3 yellow, 4–5 green.
function scoreColor(score) {
  if (score <= 2) return colors.danger;
  if (score === 3) return colors.amber;
  return colors.leaf;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ─── Trend graph ──────────────────────────────────────────────

const CHART_W = SCREEN_W - 48 - 32; // screen pad (24*2) + card pad (16*2)
const CHART_H = 150;
const GUTTER = 18;                  // left gutter for 1–5 labels
const PLOT_LEFT = GUTTER + 4;
const PLOT_RIGHT = CHART_W - 6;
const PLOT_TOP = 12;
const PLOT_BOTTOM = CHART_H - 14;

function yFor(score) {
  return PLOT_TOP + ((5 - score) / 4) * (PLOT_BOTTOM - PLOT_TOP);
}
function xFor(i, n) {
  if (n <= 1) return (PLOT_LEFT + PLOT_RIGHT) / 2;
  return PLOT_LEFT + (i / (n - 1)) * (PLOT_RIGHT - PLOT_LEFT);
}

function HealthChart({ logs }) {
  // logs come in newest-first; plot oldest → newest left → right.
  const points = [...logs].reverse();
  const n = points.length;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {[1, 2, 3, 4, 5].map((s) => (
        <React.Fragment key={s}>
          <Line
            x1={PLOT_LEFT}
            y1={yFor(s)}
            x2={PLOT_RIGHT}
            y2={yFor(s)}
            stroke={colors.line}
            strokeWidth={1}
          />
          <SvgText
            x={0}
            y={yFor(s) + 3}
            fontSize={9}
            fontFamily={fonts.mono}
            fill={colors.textMute}
          >
            {String(s)}
          </SvgText>
        </React.Fragment>
      ))}

      {n >= 2 && (
        <Polyline
          points={points.map((p, i) => `${xFor(i, n)},${yFor(p.healthScore)}`).join(' ')}
          fill="none"
          stroke={colors.pine}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map((p, i) => (
        <Circle
          key={p.id}
          cx={xFor(i, n)}
          cy={yFor(p.healthScore)}
          r={4.5}
          fill={scoreColor(p.healthScore)}
          stroke={colors.bgRaise}
          strokeWidth={1.5}
        />
      ))}
    </Svg>
  );
}

// ─── Score selector (custom 5-segment) ────────────────────────

function ScoreSelector({ value, onChange }) {
  return (
    <View style={styles.scoreRow}>
      {[1, 2, 3, 4, 5].map((s) => {
        const active = value === s;
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={({ pressed }) => [
              styles.scoreDot,
              { borderColor: scoreColor(s) },
              active && { backgroundColor: scoreColor(s) },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.scoreDotText, active && styles.scoreDotTextActive]}>
              {s}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function HealthTimelineScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { plantId, plantName } = route.params ?? {};

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [score, setScore] = useState(3);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getHealthLogs(plantId);
    setLogs(rows);
    setLoading(false);
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openModal() {
    setScore(3);
    setNotes('');
    setPhotoUri(null);
    setModalOpen(true);
  }

  function pickPhoto() {
    Alert.alert('Add photo', undefined, [
      {
        text: 'Take photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!result.canceled && result.assets?.[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.85,
          });
          if (!result.canceled && result.assets?.[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const created = await addHealthLog({ plantId, healthScore: score, notes, photoUri });
    setSaving(false);
    if (created) {
      setModalOpen(false);
      load();
    } else {
      Alert.alert('Could not save', 'Please try again.');
    }
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 6, 44) }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <Ico.Back color={colors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plantName || 'Health Log'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>HEALTH TREND</Text>
        <View style={styles.card}>
          {loading ? (
            <View style={styles.chartEmpty}>
              <ActivityIndicator color={colors.pine} />
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.chartEmpty}>
              <Text style={styles.emptyText}>No check-ins yet.</Text>
              <Text style={styles.emptySub}>Add your first below to start the timeline.</Text>
            </View>
          ) : (
            <HealthChart logs={logs} />
          )}
        </View>

        {logs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TIMELINE</Text>
            {logs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: scoreColor(log.healthScore) }]}>
                  <Text style={styles.logDotText}>{log.healthScore}</Text>
                </View>
                <View style={styles.logBody}>
                  <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
                  {!!log.notes && (
                    <Text style={styles.logNotes} numberOfLines={2}>
                      {log.notes}
                    </Text>
                  )}
                </View>
                {!!log.photoUri && (
                  <Image source={{ uri: log.photoUri }} style={styles.logThumb} contentFit="cover" />
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add check-in CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
        <Pressable onPress={openModal} style={({ pressed }) => pressed && { opacity: 0.9 }}>
          <LinearGradient colors={gradients.cta} style={styles.cta}>
            <Ico.Plus color="#FBFAF3" size={18} />
            <Text style={styles.ctaText}>Add Check-in</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Check-in modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModalOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 28) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New check-in</Text>

            <Text style={styles.fieldLabel}>HEALTH SCORE</Text>
            <ScoreSelector value={score} onChange={setScore} />

            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="How is it doing? (optional)"
              placeholderTextColor={colors.textMute}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <Pressable
              onPress={pickPhoto}
              style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ico.Gallery color={colors.pine} size={20} />
                  <Text style={styles.photoBtnText}>Add a photo (optional)</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                saving && { opacity: 0.6 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save check-in'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.text,
  },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.textMute,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 10,
  },

  card: {
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chartEmpty: { height: CHART_H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.text },
  emptySub: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.textMute, marginTop: 4 },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 10,
    padding: 12,
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  logDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logDotText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#FFFFFF' },
  logBody: { flex: 1 },
  logDate: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMute,
  },
  logNotes: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.text, marginTop: 3 },
  logThumb: { width: 44, height: 44, borderRadius: radii.md },

  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: colors.bg,
  },
  cta: {
    height: 54,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#FBFAF3', letterSpacing: 0.3 },

  // Modal sheet
  sheetWrapper: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,26,18,0.35)' },
  sheet: {
    backgroundColor: colors.bgRaise,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 16,
  },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, marginBottom: 18 },

  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.textMute,
    marginBottom: 10,
  },

  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  scoreDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaise,
  },
  scoreDotText: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.textSoft },
  scoreDotTextActive: { color: '#FFFFFF' },

  notesInput: {
    minHeight: 64,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    marginBottom: 18,
  },

  photoBtn: { marginBottom: 18 },
  photoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.bgSage,
    borderRadius: radii.lg,
  },
  photoBtnText: { fontFamily: fonts.sans, fontSize: 14, color: colors.pine },
  photoPreview: { width: '100%', height: 160, borderRadius: radii.lg },

  saveBtn: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#FBFAF3', letterSpacing: 0.3 },
});
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: no errors/warnings referencing `src/screens/HealthTimelineScreen.js` (in particular, no "Alert is not defined").

- [ ] **Step 3: Commit**

```bash
git add frontend/src/screens/HealthTimelineScreen.js
git commit -m "feat: add HealthTimelineScreen (graph + timeline + check-in modal)"
```

---

### Task 4: Navigation — register `HealthTimeline`

**Files:**
- Modify: `frontend/src/navigation/RootNavigator.js`

- [ ] **Step 1: Add the import**

After the line:

```jsx
import RegisterScreen from '../screens/RegisterScreen';
```

add:

```jsx
import HealthTimelineScreen from '../screens/HealthTimelineScreen';
```

- [ ] **Step 2: Register the screen in the authenticated root stack**

In the root `Stack.Navigator` (the `return` of `RootNavigator`), immediately after this existing block:

```jsx
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{ animation: 'slide_from_right' }}
      />
```

add:

```jsx
      <Stack.Screen
        name="HealthTimeline"
        component={HealthTimelineScreen}
        options={{ animation: 'slide_from_right' }}
      />
```

- [ ] **Step 3: Lint**

Run: `cd frontend && npm run lint`
Expected: no errors/warnings referencing `RootNavigator.js`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/navigation/RootNavigator.js
git commit -m "feat: register HealthTimeline route in root navigator"
```

---

### Task 5: Entry point — Health Log row on `ReportScreen`

**Files:**
- Modify: `frontend/src/screens/ReportScreen.js`

The row is gated on `!!report.id` (the persisted Supabase `plants` row UUID), so it only shows for saved plants. It uses inline styles (no StyleSheet edit) and only icons/imports already present in the file (`colors`, `fonts`, `radii`, `Ico`, `View`, `Text`, `Pressable`).

- [ ] **Step 1: Insert the Health Log row**

Find this exact line (the comment that begins the "Something wrong?" block):

```jsx
        {/* ── Something wrong? — manual plants ──────────────────── */}
```

Insert the following block immediately **before** that line:

```jsx
        {/* ── Health Log entry (saved plants only) ──────────────── */}
        {!!report.id && (
          <Pressable
            onPress={() => navigation.navigate('HealthTimeline', {
              plantId: report.id,
              plantName: nickname || report.common_name || report.species || 'Plant',
            })}
            style={({ pressed }) => [{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginHorizontal: 24,
              marginTop: 16,
              paddingVertical: 16,
              paddingHorizontal: 16,
              backgroundColor: colors.bgRaise,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.line,
            }, pressed && { opacity: 0.85 }]}
          >
            <View style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: colors.bgSage,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ico.Leaf color={colors.pine} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 15, color: colors.text }}>
                Health Log
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.textMute, marginTop: 2 }}>
                Track check-ins and health over time
              </Text>
            </View>
            <Ico.Chevron color={colors.textMute} size={18} />
          </Pressable>
        )}

```

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: no errors/warnings referencing `ReportScreen.js`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/screens/ReportScreen.js
git commit -m "feat: add Health Log entry point to plant detail screen"
```

---

### Task 6: End-to-end manual verification

**Files:** none (verification only)

No automated harness exists; verify by running the app against the live Supabase project.

- [ ] **Step 1: Start the app**

Run: `cd frontend && npm start`
Open on a device/simulator and sign in.

- [ ] **Step 2: Gate check**

- Open a **saved** garden plant (Plants tab → a plant → detail): the "Health Log" row appears.
- Start a **fresh scan** and reach the report *before saving*: the "Health Log" row does **not** appear.

Expected: row visibility matches `!!report.id`.

- [ ] **Step 3: Empty state**

Tap "Health Log" on a plant with no check-ins. Expected: graph card shows "No check-ins yet." and there is no timeline list.

- [ ] **Step 4: Add a check-in with a photo**

Tap "Add Check-in" → the slide-up sheet appears. Pick score 4, type a note, add a photo, Save.
Expected: sheet closes; a timeline row appears with a green "4" dot, the note, and a thumbnail; the graph shows one dot.

- [ ] **Step 5: Add more + verify graph/colours**

Add check-ins with scores 2 and 3.
Expected: timeline newest-first; the "2" dot is red, "3" is yellow, "4" is green; graph draws a solid `pine` line connecting three points oldest→newest. Confirm the colour boundaries (2 = red, 3 = yellow, 4 = green).

- [ ] **Step 6: Persistence + text-only**

Add a check-in with no photo. Navigate back to the plant, then re-open "Health Log".
Expected: all check-ins persist after reload; the no-photo row shows no thumbnail.

- [ ] **Step 7: Final commit (if any cleanup was needed)**

If steps 1–6 required no code changes, nothing to commit. Otherwise commit fixes with a descriptive message.

---

## Self-Review

**Spec coverage:**
- Table with all specced columns + RLS + cascade → Task 1. ✅
- `health.js` (get/add, photo reuse) → Task 2. ✅
- Screen: graph, timeline list (date, coloured dot, notes preview, thumbnail), add-check-in modal (custom 1–5 selector, notes, optional photo, save) → Task 3. ✅
- Entry point on ReportScreen gated on persisted UUID → Task 5. ✅
- Route registration → Task 4. ✅
- Theme match, pine solid graph line, slide Modal sheet, no backend changes → Tasks 3/5, design honoured. ✅

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✅

**Type consistency:** `health.js` app shape `{ id, plantId, healthScore, notes, photoUri, createdAt }` is consumed consistently in the screen (`log.healthScore`, `log.notes`, `log.photoUri`, `log.createdAt`, `log.id`). `addHealthLog({ plantId, healthScore, notes, photoUri })` is called with exactly those keys. `scoreColor`, `xFor(i, n)`, `yFor(score)`, `getHealthLogs`, `addHealthLog` names match across definition and use. ✅
```
