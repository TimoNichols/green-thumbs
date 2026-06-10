import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    return '—';
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

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

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
    if (!isMounted.current) return;
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
    if (!isMounted.current) return;
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
    shadowColor: '#0F1A12',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 12,
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
