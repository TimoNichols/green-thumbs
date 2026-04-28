import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '../utils/theme';
import { PlantPlaceholder } from './HomeScreen';
import * as Ico from '../components/Ico';

// ─── Symptom lookup for user-selected chips ───────────────────
const SYMPTOM_INFO = {
  'Yellow edges': {
    title: 'Likely nutrient deficiency',
    body: 'Yellow leaf edges often signal a nitrogen or magnesium deficiency, or inconsistent watering. Ensure the soil drains well and consider a balanced liquid feed every 4–6 weeks during the growing season.',
  },
  'Brown tips': {
    title: 'Likely low humidity',
    body: 'Brown tips are a classic sign of dry air or underwatering. Try a pebble tray with water beneath the pot, or mist the leaves. When watering, do so thoroughly until water drains freely from the bottom.',
  },
  'Drooping': {
    title: 'Likely thirsty or root-bound',
    body: "Drooping usually means the plant needs water — push a finger 2 inches into the soil to check. If it's already moist, the roots may be compacted. Consider moving it to a slightly larger pot with fresh mix.",
  },
  'Spots': {
    title: 'Possible fungal or pest issue',
    body: "Spots can signal fungal disease, bacterial infection, or pest activity. Check the undersides of leaves for insects or eggs. Brown spots with yellow halos often point to overwatering; black spots to fungal issues — improve air circulation and reduce watering.",
  },
};

function getDiagnosis(report) {
  const { symptom, symptom_source, auto_symptom_detail } = report ?? {};
  if (!symptom || symptom === 'None') return null;

  if (symptom_source === 'auto' && auto_symptom_detail?.summary) {
    const detected = auto_symptom_detail.symptoms?.join(', ') || symptom;
    return {
      headerLabel: 'WE NOTICED SOMETHING',
      title: detected.charAt(0).toUpperCase() + detected.slice(1),
      body: auto_symptom_detail.summary,
    };
  }

  const info = SYMPTOM_INFO[symptom] ?? {
    title: 'Possible issue detected',
    body: 'Monitor your plant closely and adjust your care routine based on the symptom. If it worsens, consider consulting a local nursery.',
  };
  return {
    headerLabel: 'DIAGNOSIS',
    title: info.title,
    body: info.body,
  };
}

// ─── Care tile ────────────────────────────────────────────────
function CareTile({ Icon, iconColor, label, value }) {
  return (
    <View style={styles.careTile}>
      <View style={styles.careTileTop}>
        <View style={styles.careIconBadge}>
          <Icon color={iconColor} size={18} />
        </View>
        <Text style={styles.careTileLabel}>{label}</Text>
      </View>
      <Text style={styles.careTileValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────
export default function ReportScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { report } = route.params ?? {};

  if (!report) {
    return (
      <View style={[styles.root, styles.emptyRoot]}>
        <Text style={styles.emptyText}>No report data.</Text>
      </View>
    );
  }

  const genus = report.species?.split(' ')[0] ?? '';
  const epithet = report.species?.split(' ').slice(1).join(' ') ?? '';
  const diagnosis = getDiagnosis(report);

  // Backend returns confidence as 0–1 float; prototype mock uses 0–100.
  // Handle both so dev (mock history) and prod (real API) both display correctly.
  const confidencePct = report.confidence != null
    ? Math.round(report.confidence <= 1 ? report.confidence * 100 : report.confidence)
    : null;

  const CARE_TILES = [
    { Icon: Ico.Drop,  iconColor: colors.pine,  label: 'WATER',    value: report.water    ?? '—' },
    { Icon: Ico.Sun,   iconColor: colors.amber,  label: 'LIGHT',    value: report.sunlight ?? '—' },
    { Icon: Ico.Soil,  iconColor: colors.text,   label: 'SOIL',     value: report.soil     ?? '—' },
    { Icon: Ico.Humid, iconColor: colors.leaf,   label: 'HUMIDITY', value: report.humidity ?? '—' },
  ];

  const headerH = Math.max(88, insets.top + 60);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: headerH }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────────── */}
        <View style={styles.heroRow}>
          <PlantPlaceholder size={88} rx={radii.xl} label={genus.toUpperCase()} />
          <View style={styles.heroInfo}>
            <Text style={styles.speciesIdLabel}>Species identified</Text>
            <Text style={styles.speciesName}>
              <Text style={styles.genusItalic}>{genus}</Text>
              {epithet ? <Text style={styles.epithetNormal}>{'\n'}{epithet}</Text> : null}
            </Text>
            {report.common_name ? (
              <Text style={styles.commonName}>{report.common_name}</Text>
            ) : null}
            <View style={styles.pillRow}>
              {confidencePct != null && (
                <View style={[styles.pill, styles.pillSage]}>
                  <View style={styles.pillDot} />
                  <Text style={styles.pillTextSage}>{confidencePct}% match</Text>
                </View>
              )}
              {report.difficulty ? (
                <View style={[styles.pill, styles.pillDefault]}>
                  <Text style={styles.pillTextDefault}>
                    {report.difficulty.charAt(0).toUpperCase() + report.difficulty.slice(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Diagnosis card ─────────────────────────────────── */}
        {diagnosis && (
          <View style={styles.diagnosisCard}>
            {/* Amber shimmer along top edge */}
            <LinearGradient
              colors={['transparent', colors.amber + '80', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.diagnosisTopLine}
              pointerEvents="none"
            />
            <View style={styles.diagnosisHeaderRow}>
              <View style={styles.diagnosisHeaderLeft}>
                <Ico.Alert color={colors.amberDeep} size={18} />
                <Text style={styles.diagnosisHeaderLabel}>{diagnosis.headerLabel}</Text>
              </View>
              <View style={styles.reasoningChip}>
                <Text style={styles.reasoningChipText}>REASONING</Text>
              </View>
            </View>
            <Text style={styles.diagnosisTitle}>{diagnosis.title}</Text>
            <Text style={styles.diagnosisBody}>{diagnosis.body}</Text>
            <View style={styles.diagnosisFooter}>
              <Text style={styles.diagnosisFooterText}>Symptom: {report.symptom}</Text>
              <Text style={styles.diagnosisFooterText}>Re-scan in 7 days →</Text>
            </View>
          </View>
        )}

        {/* ── Care guide ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Care guide</Text>
          <View style={styles.careGrid}>
            {CARE_TILES.map((tile) => (
              <CareTile key={tile.label} {...tile} />
            ))}
          </View>
        </View>

        {/* ── Health tips ────────────────────────────────────── */}
        {report.health_tips?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.tipsSectionHeader}>
              <Text style={styles.tipsSectionHeaderItalic}>Health</Text>
              {' '}tips
            </Text>
            <View style={styles.tipsCard}>
              {report.health_tips.map((tip, i, arr) => (
                <View
                  key={i}
                  style={[styles.tipRow, i < arr.length - 1 && styles.tipRowBorder]}
                >
                  <View style={styles.tipCheckWrap}>
                    <Ico.Check color={colors.leaf} size={14} />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky header ──────────────────────────────────────── */}
      <View
        style={[styles.header, { paddingTop: Math.max(44, insets.top + 8) }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={[colors.bg, colors.bg, 'transparent']}
          locations={[0, 0.65, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
        >
          <Ico.Back color={colors.text} size={18} />
        </Pressable>
        <Text style={styles.headerTitle}>Care report</Text>
        <Pressable style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}>
          <Ico.More color={colors.text} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  emptyRoot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMute,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },

  // ── Sticky header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // ── Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 8,
    marginBottom: 20,
  },
  heroInfo: {
    flex: 1,
    paddingTop: 4,
  },
  speciesIdLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  speciesName: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 30,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  genusItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  epithetNormal: {
    fontFamily: fonts.serif,
    fontStyle: 'normal',
  },
  commonName: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    color: colors.textSoft,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillSage: {
    backgroundColor: colors.bgSage,
    borderColor: 'rgba(92,138,92,0.25)',
  },
  pillDefault: {
    backgroundColor: colors.bgRaise,
    borderColor: colors.line,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.leaf,
  },
  pillTextSage: {
    fontFamily: fonts.sansBold,
    fontSize: 11.5,
    color: colors.pine,
  },
  pillTextDefault: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.textSoft,
  },

  // ── Diagnosis card
  diagnosisCard: {
    marginBottom: 24,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberLine,
    borderRadius: radii['2xl'],
    padding: 18,
    overflow: 'hidden',
    // Amber shadow
    shadowColor: colors.amber,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  diagnosisTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  diagnosisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  diagnosisHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diagnosisHeaderLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.amberDeep,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  reasoningChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(184,132,46,0.10)',
    borderWidth: 1,
    borderColor: colors.amberLine,
  },
  reasoningChipText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.amberDeep,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  diagnosisTitle: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 22,
    lineHeight: 26,
    color: colors.amberDeep,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  diagnosisBody: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.text,
  },
  diagnosisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.amberLine,
  },
  diagnosisFooterText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.amberDeep,
    letterSpacing: 0.6,
    opacity: 0.8,
  },

  // ── Care guide
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  careGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  careTile: {
    width: '48%',
    backgroundColor: colors.bgRaise,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  careTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  careIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careTileLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMute,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  careTileValue: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 20,
    color: colors.text,
    letterSpacing: -0.2,
  },

  // ── Health tips
  tipsSectionHeader: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 24,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  tipsSectionHeaderItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  tipsCard: {
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  tipRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  tipCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
  },
});
