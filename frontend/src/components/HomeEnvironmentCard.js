import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

import { colors, fonts, radii } from '../utils/theme';
import { getHomeEnvironment, saveHomeEnvironment } from '../utils/homeEnvironment';
import * as Ico from './Ico';

// ─── Option sets ──────────────────────────────────────────────

const HUMIDITY_OPTIONS = [
  { value: 'very_dry', label: 'Very Dry' },
  { value: 'dry',      label: 'Dry'      },
  { value: 'average',  label: 'Average'  },
  { value: 'humid',    label: 'Humid'    },
];

const LIGHT_OPTIONS = [
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'bright', label: 'Bright' },
];

const TEMP_OPTIONS = [
  { value: 'cool',     label: 'Cool'     },
  { value: 'moderate', label: 'Moderate' },
  { value: 'warm',     label: 'Warm'     },
];

const BUCKET_LABELS = {
  very_dry: 'Very Dry',
  dry:      'Dry',
  average:  'Average',
  humid:    'Humid',
};

const QUESTIONS = [
  { id: 'dry_skin',   text: 'Do your lips or skin get dry easily at home?' },
  { id: 'humidifier', text: 'Do you use a humidifier?' },
  { id: 'static',     text: 'Does static electricity or wood cracking occur often?' },
];

// ─── Helpers ─────────────────────────────────────────────────

function getBucketFromAvg(avg) {
  if (avg < 30) return 'very_dry';
  if (avg < 45) return 'dry';
  if (avg < 60) return 'average';
  return 'humid';
}

// Q1 yes = dry, Q2 no = dry (no humidifier), Q3 yes = dry (static/cracking)
function answersToHumidity(answers) {
  let dryScore = 0;
  if (answers.dry_skin   === true)  dryScore++;
  if (answers.humidifier === false) dryScore++;
  if (answers.static     === true)  dryScore++;
  if (dryScore === 3) return 'very_dry';
  if (dryScore === 2) return 'dry';
  if (dryScore === 1) return 'average';
  return 'humid';
}

// ─── Segmented Control ────────────────────────────────────────

function SegControl({ options, selected, onSelect }) {
  return (
    <View style={seg.row}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(active ? null : opt.value)}
            style={({ pressed }) => [seg.item, active && seg.itemActive, pressed && { opacity: 0.75 }]}
          >
            <Text
              style={[seg.label, active && seg.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  item: {
    flex: 1,
    height: 34,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  itemActive: {
    backgroundColor: colors.bgMint,
    borderColor: 'rgba(92,138,92,0.55)',
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.textSoft,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: colors.pine,
  },
});

// ─── Questionnaire Modal ──────────────────────────────────────

function QuestionnaireModal({ visible, onClose, onResult }) {
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (visible) setAnswers({});
  }, [visible]);

  const allAnswered = QUESTIONS.every((q) => q.id in answers);

  function handleSubmit() {
    onResult(answersToHumidity(answers));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={qst.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={qst.sheet}>
          <View style={qst.handle} />

          <View style={qst.titleRow}>
            <View>
              <Text style={qst.title}>Help me choose</Text>
              <Text style={qst.subtitle}>3 quick questions about your home</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Ico.Close color={colors.textMute} size={18} />
            </Pressable>
          </View>

          {QUESTIONS.map((question, idx) => (
            <View key={question.id} style={qst.questionBlock}>
              <Text style={qst.questionText}>
                <Text style={qst.questionNum}>{idx + 1}.{'  '}</Text>
                {question.text}
              </Text>
              <View style={qst.ansRow}>
                <Pressable
                  onPress={() => setAnswers((prev) => ({ ...prev, [question.id]: true }))}
                  style={({ pressed }) => [
                    qst.ansBtn,
                    answers[question.id] === true && qst.ansBtnYes,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[qst.ansBtnText, answers[question.id] === true && qst.ansBtnTextActive]}>
                    Yes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAnswers((prev) => ({ ...prev, [question.id]: false }))}
                  style={({ pressed }) => [
                    qst.ansBtn,
                    answers[question.id] === false && qst.ansBtnNo,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[qst.ansBtnText, answers[question.id] === false && qst.ansBtnTextActive]}>
                    No
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable
            onPress={handleSubmit}
            disabled={!allAnswered}
            style={({ pressed }) => [
              qst.submitBtn,
              !allAnswered && qst.submitBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={qst.submitBtnText}>Get my result →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const qst = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgRaise,
    borderTopLeftRadius: radii.sheet ?? 28,
    borderTopRightRadius: radii.sheet ?? 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    shadowColor: '#0F1A12',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineSoft,
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMute,
    marginTop: 2,
  },
  questionBlock: {
    marginBottom: 18,
  },
  questionText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  questionNum: {
    fontFamily: fonts.sansBold,
    color: colors.pine,
  },
  ansRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ansBtn: {
    flex: 1,
    height: 38,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ansBtnYes: {
    backgroundColor: colors.bgMint,
    borderColor: 'rgba(92,138,92,0.5)',
  },
  ansBtnNo: {
    backgroundColor: colors.bgSage,
    borderColor: 'rgba(92,138,92,0.3)',
  },
  ansBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.textSoft,
  },
  ansBtnTextActive: {
    color: colors.pine,
  },
  submitBtn: {
    height: 50,
    borderRadius: radii.xl,
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    backgroundColor: colors.bgAlt ?? colors.bgSage,
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
  },
});

// ─── Main Card ────────────────────────────────────────────────

export default function HomeEnvironmentCard() {
  const [env, setEnv] = useState({ humidity: null, light: null, temperature: null });
  const [loaded, setLoaded] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [locationHint, setLocationHint] = useState(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  useEffect(() => {
    getHomeEnvironment().then((stored) => {
      setEnv(stored);
      setLoaded(true);
    });
  }, []);

  // Persist on every env change after the initial load
  useEffect(() => {
    if (!loaded) return;
    saveHomeEnvironment(env);
  }, [env, loaded]);

  function updateEnv(key, value) {
    setEnv((prev) => ({ ...prev, [key]: value }));
  }

  async function fetchHumidityHint() {
    const q = locationQuery.trim();
    if (!q) return;
    setHintLoading(true);
    setLocationHint(null);
    try {
      // 1 — Geocode the location
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search` +
        `?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();
      const loc = geoData.results?.[0];
      if (!loc) {
        setLocationHint({ text: 'Location not found. Try a city name or ZIP code.', showTip: false });
        return;
      }

      // 2 — Fetch hourly humidity for the past 12 months from Open-Meteo archive
      const end = new Date();
      end.setDate(end.getDate() - 5); // archive has ~5-day lag
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      const fmt = (d) => d.toISOString().slice(0, 10);

      const climateRes = await fetch(
        `https://archive-api.open-meteo.com/v1/archive` +
        `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&start_date=${fmt(start)}&end_date=${fmt(end)}` +
        `&hourly=relativehumidity_2m&timezone=auto`
      );
      const climateData = await climateRes.json();

      const times  = climateData.hourly?.time ?? [];
      const humids = climateData.hourly?.relativehumidity_2m ?? [];

      // Aggregate hourly readings into monthly averages
      const byMonth = {};
      times.forEach((t, i) => {
        const mo = t.slice(0, 7); // "YYYY-MM"
        const rh = humids[i];
        if (rh == null) return;
        if (!byMonth[mo]) byMonth[mo] = { sum: 0, n: 0 };
        byMonth[mo].sum += rh;
        byMonth[mo].n++;
      });

      const monthlyAvgs = Object.values(byMonth).map((m) => m.sum / m.n);
      if (!monthlyAvgs.length) throw new Error('no data');

      const minRH  = Math.round(Math.min(...monthlyAvgs));
      const maxRH  = Math.round(Math.max(...monthlyAvgs));
      const meanRH = Math.round(monthlyAvgs.reduce((a, b) => a + b, 0) / monthlyAvgs.length);
      const bucket = getBucketFromAvg(meanRH);

      setLocationHint({
        text: `${loc.name} homes typically range ${minRH}–${maxRH}% humidity — set to ${BUCKET_LABELS[bucket]}`,
        showTip: bucket === 'very_dry' || bucket === 'dry',
      });
      updateEnv('humidity', bucket);
    } catch {
      setLocationHint({ text: 'Could not load climate data. Try again.', showTip: false });
    } finally {
      setHintLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.cardMeta}>HOME ENVIRONMENT</Text>
      <Text style={styles.cardTitle}>
        {'Your '}
        <Text style={styles.cardTitleItalic}>home</Text>
      </Text>

      {/* ── Humidity ───────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ico.Drop color={colors.pine} size={14} />
          <Text style={styles.sectionLabel}>Humidity</Text>
        </View>
        <SegControl
          options={HUMIDITY_OPTIONS}
          selected={env.humidity}
          onSelect={(v) => updateEnv('humidity', v)}
        />

        {/* Location auto-detect */}
        <View style={styles.locationRow}>
          <TextInput
            style={styles.locationInput}
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholder="State or ZIP for auto-detect"
            placeholderTextColor={colors.textMute}
            returnKeyType="search"
            onSubmitEditing={fetchHumidityHint}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Pressable
            onPress={fetchHumidityHint}
            disabled={hintLoading || !locationQuery.trim()}
            style={({ pressed }) => [
              styles.detectBtn,
              pressed && { opacity: 0.7 },
              (!locationQuery.trim() || hintLoading) && styles.detectBtnDisabled,
            ]}
          >
            {hintLoading ? (
              <ActivityIndicator size="small" color={colors.pine} />
            ) : (
              <Text style={styles.detectBtnText}>Detect</Text>
            )}
          </Pressable>
        </View>

        {/* Climate hint */}
        {locationHint ? (
          <View style={styles.hintBlock}>
            <Text style={styles.hintText}>{locationHint.text}</Text>
            {locationHint.showTip && (
              <View style={styles.tipRow}>
                <Text style={styles.tipIcon}>💧</Text>
                <Text style={styles.tipText}>
                  Consider a humidifier for tropical plants in winter.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Help me choose */}
        <Pressable
          onPress={() => setShowQuestionnaire(true)}
          style={({ pressed }) => [styles.helpLink, pressed && { opacity: 0.55 }]}
        >
          <Text style={styles.helpLinkText}>Help me choose →</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* ── Light ──────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ico.Sun color={colors.pine} size={14} />
          <Text style={styles.sectionLabel}>Average Light</Text>
        </View>
        <SegControl
          options={LIGHT_OPTIONS}
          selected={env.light}
          onSelect={(v) => updateEnv('light', v)}
        />
      </View>

      <View style={styles.divider} />

      {/* ── Temperature ────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ico.Thermometer color={colors.pine} size={14} />
          <Text style={styles.sectionLabel}>Temperature</Text>
        </View>
        <SegControl
          options={TEMP_OPTIONS}
          selected={env.temperature}
          onSelect={(v) => updateEnv('temperature', v)}
        />
      </View>

      <QuestionnaireModal
        visible={showQuestionnaire}
        onClose={() => setShowQuestionnaire(false)}
        onResult={(bucket) => {
          updateEnv('humidity', bucket);
          setShowQuestionnaire(false);
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii['2xl'],
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },

  // Card header
  cardMeta: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardTitleItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },

  // Section
  section: {
    paddingVertical: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lineSoft,
    marginHorizontal: -18,
  },

  // Location row
  locationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  locationInput: {
    flex: 1,
    height: 36,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.text,
  },
  detectBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  detectBtnDisabled: {
    opacity: 0.4,
  },
  detectBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.pine,
  },

  // Hint
  hintBlock: {
    marginTop: 10,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.2)',
    gap: 8,
  },
  hintText: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    color: colors.pine,
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(92,138,92,0.15)',
  },
  tipIcon: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.pine,
    lineHeight: 17,
    opacity: 0.85,
  },

  // Help link
  helpLink: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingBottom: 2,
  },
  helpLinkText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.leaf,
    textDecorationLine: 'underline',
  },
});
