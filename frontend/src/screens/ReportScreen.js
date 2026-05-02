import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect as SR } from 'react-native-svg';

import { colors, fonts, radii } from '../utils/theme';
import * as Ico from '../components/Ico';
import { addToHistory } from '../utils/history';

const SCREEN_W = Dimensions.get('window').width;
const HERO_H = 260;

// ─── Warning detection ─────────────────────────────────────────
const WARNING_KEYWORDS = [
  'yellow', 'overwater', 'brown', 'wilt', 'droop',
  'root rot', 'pest', 'fungal', 'disease', 'pale',
  'dropping', 'falling', 'mold', 'rot',
];

function isWarningTip(tip) {
  const lower = tip.toLowerCase();
  return WARNING_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Difficulty → pill colors ──────────────────────────────────
function diffPillColors(difficulty) {
  switch (difficulty) {
    case 'easy':   return { bg: colors.bgMint,   text: colors.pine,      border: 'rgba(92,138,92,0.35)' };
    case 'medium': return { bg: colors.amberSoft, text: colors.amberDeep, border: colors.amberLine };
    case 'hard':   return { bg: colors.danger,    text: '#FFFFFF',        border: colors.danger };
    default:       return { bg: colors.bgRaise,   text: colors.textSoft,  border: colors.line };
  }
}

// ─── Symptom lookup ────────────────────────────────────────────
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
  return { headerLabel: 'DIAGNOSIS', title: info.title, body: info.body };
}

// ─── Hero placeholder — stripe pattern filling the hero block ──
function HeroPlaceholder() {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Svg width={SCREEN_W} height={HERO_H}>
        <Defs>
          <Pattern
            id="heroStripe"
            x="0" y="0"
            width="20" height="20"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(135)"
          >
            <SR width="10" height="20" fill={colors.bgMint} />
            <SR x="10" width="10" height="20" fill={colors.bgSage} />
          </Pattern>
        </Defs>
        <SR width={SCREEN_W} height={HERO_H} fill="url(#heroStripe)" />
      </Svg>
      <View style={styles.heroPlaceholderIcon}>
        <Ico.Leaf color={colors.pine} size={56} />
      </View>
    </View>
  );
}

// ─── Care tile ─────────────────────────────────────────────────
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
  const autoSaved = useRef(false);

  useEffect(() => {
    if (report && !autoSaved.current) {
      autoSaved.current = true;
      addToHistory(report);
    }
  }, []);

  if (!report) {
    return (
      <View style={[styles.root, styles.emptyRoot]}>
        <Text style={styles.emptyText}>No report data.</Text>
      </View>
    );
  }

  const genus   = report.species?.split(' ')[0] ?? '';
  const epithet = report.species?.split(' ').slice(1).join(' ') ?? '';
  const diagnosis = getDiagnosis(report);

  const confidencePct = report.confidence != null
    ? Math.round(report.confidence <= 1 ? report.confidence * 100 : report.confidence)
    : null;

  const CARE_TILES = [
    { Icon: Ico.Drop,  iconColor: colors.pine,  label: 'WATER',    value: report.water    ?? '—' },
    { Icon: Ico.Sun,   iconColor: colors.amber,  label: 'LIGHT',    value: report.sunlight ?? '—' },
    { Icon: Ico.Soil,  iconColor: colors.text,   label: 'SOIL',     value: report.soil     ?? '—' },
    { Icon: Ico.Humid, iconColor: colors.leaf,   label: 'HUMIDITY', value: report.humidity ?? '—' },
  ];

  const diffColors = diffPillColors(report.difficulty);

  const handleSave = () => {
    addToHistory(report);
    navigation.navigate('MainTabs');
  };

  return (
    <View style={styles.root}>

      {/* ── Hero image / placeholder ──────────────────────────── */}
      <View style={styles.hero}>
        {report.photoUri ? (
          <Image
            source={{ uri: report.photoUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <HeroPlaceholder />
        )}

        {/* Gradient scrim — covers bottom ~60% for text legibility */}
        <LinearGradient
          colors={['transparent', 'rgba(14,26,18,0.72)', 'rgba(14,26,18,0.97)']}
          locations={[0, 0.45, 1]}
          style={styles.heroScrim}
        >
          {/* Species binomial in italic over the photo */}
          <Text style={styles.heroSpecies} numberOfLines={2}>
            <Text style={styles.heroGenusItalic}>{genus}</Text>
            {epithet ? <Text style={styles.heroEpithet}>{' '}{epithet}</Text> : null}
          </Text>

          {/* Confidence + source badges inline */}
          <View style={styles.heroBadgeRow}>
            {confidencePct != null && (
              <View style={styles.heroBadge}>
                <View style={styles.heroBadgeDot} />
                <Text style={styles.heroBadgeText}>{confidencePct}% match</Text>
              </View>
            )}
            {report.source != null && (
              <View style={[styles.heroBadge, styles.heroBadgeSource]}>
                <Text style={styles.heroBadgeText}>
                  {report.source === 'cache' ? 'Cached' : 'AI Generated'}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* ── Floating back + more buttons ────────────────────────── */}
      <View
        style={[styles.floatingHeader, { top: Math.max(44, insets.top + 8) }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.floatBtn, pressed && { opacity: 0.7 }]}
        >
          <Ico.Back color="#F4F1E8" size={18} />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.floatBtn, pressed && { opacity: 0.7 }]}>
          <Ico.More color="#F4F1E8" size={18} />
        </Pressable>
      </View>

      {/* ── Content ScrollView ───────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Name + badges ──────────────────────────────────────── */}
        <View style={styles.nameBlock}>
          <Text style={styles.commonName} numberOfLines={2}>
            {report.common_name || report.species || 'Unknown Plant'}
          </Text>
          <View style={styles.badgeRow}>
            {report.source != null && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>
                  {report.source === 'cache' ? 'Cached' : 'AI Generated'}
                </Text>
              </View>
            )}
            {report.difficulty && (
              <View style={[styles.diffBadge, {
                backgroundColor: diffColors.bg,
                borderColor: diffColors.border,
              }]}>
                <Text style={[styles.diffBadgeText, { color: diffColors.text }]}>
                  {report.difficulty.charAt(0).toUpperCase() + report.difficulty.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Diagnosis card ─────────────────────────────────────── */}
        {diagnosis && (
          <View style={styles.diagnosisCard}>
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

        {/* ── Care guide ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Care guide</Text>
          <View style={styles.careGrid}>
            {CARE_TILES.map((tile) => (
              <CareTile key={tile.label} {...tile} />
            ))}
          </View>

          {/* Placement — full-width row below 2×2 grid */}
          {report.placement && (
            <View style={styles.placementRow}>
              <View style={styles.careIconBadge}>
                <Ico.Garden color={colors.pine} size={18} />
              </View>
              <View style={styles.placementBody}>
                <Text style={styles.careTileLabel}>PLACEMENT</Text>
                <Text style={styles.placementValue}>{report.placement}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Health tips ────────────────────────────────────────── */}
        {report.health_tips?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.tipsSectionHeader}>
              <Text style={styles.tipsSectionHeaderItalic}>Health</Text>
              {' '}tips
            </Text>
            <View style={styles.tipsCard}>
              {report.health_tips.map((tip, i, arr) => {
                const warn = isWarningTip(tip);
                return (
                  <View
                    key={i}
                    style={[styles.tipRow, i < arr.length - 1 && styles.tipRowBorder]}
                  >
                    <View style={[styles.tipIconWrap, warn && styles.tipAlertWrap]}>
                      {warn
                        ? <Ico.Alert color={colors.amber} size={12} />
                        : <Ico.Check color={colors.leaf} size={14} />
                      }
                    </View>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Save to My Plants ────────────────────────────────── */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.75 }]}
        >
          <Text style={styles.saveBtnText}>+ Save to My Plants</Text>
        </Pressable>
      </ScrollView>
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

  // ── Hero
  hero: {
    width: '100%',
    height: HERO_H,
    backgroundColor: colors.bgSage,
    overflow: 'hidden',
  },
  heroPlaceholderIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 165,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  heroSpecies: {
    fontSize: 24,
    lineHeight: 28,
    color: '#F4F1E8',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  heroGenusItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  heroEpithet: {
    fontFamily: fonts.serif,
    fontStyle: 'normal',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroBadgeSource: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.mint,
  },
  heroBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 11.5,
    color: '#F4F1E8',
    letterSpacing: 0.2,
  },

  // ── Floating header buttons
  floatingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  floatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14,26,18,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── ScrollView
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 64,
  },

  // ── Name block
  nameBlock: {
    marginBottom: 22,
  },
  commonName: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sourceBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textSoft,
    letterSpacing: 0.6,
  },
  diffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 11.5,
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
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    backgroundColor: colors.bgRaise,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  placementBody: {
    flex: 1,
  },
  placementValue: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: -0.2,
    marginTop: 6,
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
  tipIconWrap: {
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
  tipAlertWrap: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberLine,
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
  },

  // ── Save button
  saveBtn: {
    height: 52,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.2,
  },
});
