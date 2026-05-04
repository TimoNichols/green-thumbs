import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect as SR } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

import { colors, fonts, radii } from '../utils/theme';
import * as Ico from '../components/Ico';
import { addToHistory, updateHistory, getHistory, uploadPlantPhoto } from '../utils/history';
import { fetchDiagnosis } from '../utils/api';

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

const SYMPTOM_CHIPS = ['Yellow edges', 'Brown tips', 'Drooping', 'Spots'];

function getDiagnosis(report) {
  const { symptom, symptom_source, text_diagnosis } = report ?? {};
  if (!symptom || symptom === 'None') return null;
  if (symptom_source !== 'user') return null;

  if (text_diagnosis) {
    return { headerLabel: 'DIAGNOSIS', title: text_diagnosis.title, body: text_diagnosis.body };
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
function CareTile({ tileKey, Icon, iconColor, label, value, expanded, onPress, onSchedule, hasSchedule }) {
  return (
    <Pressable onPress={onPress} style={[styles.careTile, expanded && styles.careTileExpanded]}>
      <View style={styles.careTileTop}>
        <View style={styles.careIconBadge}>
          <Icon color={iconColor} size={18} />
        </View>
        <Text style={styles.careTileLabel}>{label}</Text>
        <View style={{ transform: [{ rotate: expanded ? '-90deg' : '90deg' }] }}>
          <Ico.Chevron color={colors.textMute} size={11} />
        </View>
      </View>
      <Text style={styles.careTileValue} numberOfLines={expanded ? undefined : 3}>{value}</Text>
      {expanded && tileKey === 'water' && onSchedule && (
        <Pressable
          onPress={onSchedule}
          style={({ pressed }) => [styles.scheduleWaterBtn, pressed && { opacity: 0.85 }]}
        >
          <Ico.Drop color={colors.pine} size={13} />
          <Text style={styles.scheduleWaterBtnText}>
            {hasSchedule ? 'Update schedule →' : 'Schedule watering →'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────
export default function ReportScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { report: initialReport } = route.params ?? {};

  const [currentReport, setCurrentReport] = useState(initialReport ?? null);
  const [currentPhotoUri, setCurrentPhotoUri] = useState(initialReport?.photoUri ?? null);
  const [showSymptomPicker, setShowSymptomPicker] = useState(false);
  const [pickedSymptom, setPickedSymptom] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [expandedTileData, setExpandedTileData] = useState(null);
  const tileOverlayAnim = useRef(new Animated.Value(0)).current;

  // When returning from a scan of a manual plant, re-fetch to pick up merged care data
  useFocusEffect(
    useCallback(() => {
      if (!currentReport?.id || currentReport.source !== 'manual') return;
      getHistory().then((all) => {
        const fresh = all.find((e) => e.id === currentReport.id);
        if (fresh && fresh.source !== 'manual') {
          setCurrentReport(fresh);
          setCurrentPhotoUri(fresh.photoUri ?? null);
        }
      });
    }, [currentReport?.id, currentReport?.source])
  );

  if (!currentReport) {
    return (
      <View style={[styles.root, styles.emptyRoot]}>
        <Text style={styles.emptyText}>No report data.</Text>
      </View>
    );
  }

  const report = currentReport;
  const isManual = report.source === 'manual';

  const genus   = report.species?.split(' ')[0] ?? '';
  const epithet = report.species?.split(' ').slice(1).join(' ') ?? '';
  const diagnosis = getDiagnosis(report);

  const confidencePct = report.confidence != null
    ? Math.round(report.confidence <= 1 ? report.confidence * 100 : report.confidence)
    : null;

  const CARE_TILES = [
    { tileKey: 'water',    Icon: Ico.Drop,  iconColor: colors.pine,  label: 'WATER',    value: report.water    ?? '—' },
    { tileKey: 'light',    Icon: Ico.Sun,   iconColor: colors.amber,  label: 'LIGHT',    value: report.sunlight ?? '—' },
    { tileKey: 'soil',     Icon: Ico.Soil,  iconColor: colors.text,   label: 'SOIL',     value: report.soil     ?? '—' },
    { tileKey: 'humidity', Icon: Ico.Humid, iconColor: colors.leaf,   label: 'HUMIDITY', value: report.humidity ?? '—' },
  ];

  const diffColors = diffPillColors(report.difficulty);

  async function handleSave() {
    if (!report.id) await addToHistory(report);
    navigation.navigate('MainTabs');
  }

  async function persistPhoto(uri) {
    const storageUrl = await uploadPlantPhoto(uri);
    const finalUri = storageUrl ?? uri;
    setCurrentPhotoUri(finalUri);
    if (report.id) {
      await updateHistory(report.id, { photoUri: finalUri });
    }
  }

  async function handleTextDiagnosis() {
    if (!pickedSymptom) return;
    const speciesName = report.species || report.common_name;
    if (!speciesName) return;
    setDiagnosing(true);
    try {
      const care = report.water ? {
        water: report.water,
        humidity: report.humidity,
        soil: report.soil,
        sunlight: report.sunlight,
      } : null;
      const result = await fetchDiagnosis(speciesName, pickedSymptom, care);
      const patch = {
        symptom: pickedSymptom,
        symptom_source: 'user',
        text_diagnosis: { title: result.title, body: result.body },
      };
      if (currentReport.id) {
        const updated = await updateHistory(currentReport.id, patch);
        setCurrentReport(updated ?? { ...currentReport, ...patch });
      } else {
        setCurrentReport(prev => ({ ...prev, ...patch }));
      }
      setShowSymptomPicker(false);
      setPickedSymptom(null);
    } catch (e) {
      Alert.alert('Diagnosis failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setDiagnosing(false);
    }
  }

  function handlePickPhoto() {
    Alert.alert('Add photo', undefined, [
      {
        text: 'Take photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!result.canceled && result.assets?.[0]) {
            await persistPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.85,
          });
          if (!result.canceled && result.assets?.[0]) {
            await persistPhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleTilePress(tileKey) {
    const tile = CARE_TILES.find(t => t.tileKey === tileKey);
    setExpandedTileData({
      ...tile,
      hasSchedule: !!(currentReport?.schedule?.water),
      canSchedule: tile.tileKey === 'water' && !!currentReport?.id,
    });
    tileOverlayAnim.setValue(0);
    Animated.spring(tileOverlayAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 260,
      friction: 22,
    }).start();
  }

  function handleCloseTile() {
    Animated.timing(tileOverlayAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setExpandedTileData(null));
  }

  function handleTileSchedule() {
    Animated.timing(tileOverlayAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setExpandedTileData(null);
      navigation.navigate('MainTabs', {
        screen: 'Garden',
        params: { openScheduleFor: report.id },
      });
    });
  }

  return (
    <View style={styles.root}>

      {/* ── Hero image / placeholder ──────────────────────────── */}
      <View style={styles.hero}>
        {currentPhotoUri ? (
          <Image
            source={{ uri: currentPhotoUri }}
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
          <Text style={styles.heroSpecies} numberOfLines={2}>
            <Text style={styles.heroGenusItalic}>{genus}</Text>
            {epithet ? <Text style={styles.heroEpithet}>{' '}{epithet}</Text> : null}
          </Text>

          <View style={styles.heroBadgeRow}>
            {confidencePct != null && (
              <View style={styles.heroBadge}>
                <View style={styles.heroBadgeDot} />
                <Text style={styles.heroBadgeText}>{confidencePct}% match</Text>
              </View>
            )}
            {report.source === 'cache' && (
              <View style={[styles.heroBadge, styles.heroBadgeSource]}>
                <Text style={styles.heroBadgeText}>Cached</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Photo picker pill — manual plants only */}
        {isManual && (
          <Pressable
            onPress={handlePickPhoto}
            style={({ pressed }) => [styles.heroPhotoBtn, pressed && { opacity: 0.7 }]}
          >
            <Ico.Gallery color="#F4F1E8" size={15} />
            <Text style={styles.heroPhotoBtnText}>
              {currentPhotoUri ? 'Change photo' : 'Add photo'}
            </Text>
          </Pressable>
        )}
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
            {report.source === 'cache' && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>Cached</Text>
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

        {/* ── Scan banner — manual plants without care data ────────── */}
        {isManual && !report.water && (
          <View style={styles.scanBanner}>
            <View style={styles.scanBannerLeft}>
              <View style={styles.scanBannerIconWrap}>
                <Ico.Leaf color={colors.pine} size={16} />
              </View>
              <Text style={styles.scanBannerText}>
                Scan this plant to get care details
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Camera', { linkedPlantId: report.id })}
              style={({ pressed }) => [styles.scanBannerBtn, pressed && { opacity: 0.8 }]}
            >
              <Ico.Scan color="#FBFAF3" size={14} />
              <Text style={styles.scanBannerBtnText}>Scan now</Text>
            </Pressable>
          </View>
        )}

        {/* ── Something wrong? — manual plants ──────────────────── */}
        {isManual && (
          <View style={styles.symptomPickerWrap}>
            {!showSymptomPicker ? (
              <Pressable
                onPress={() => setShowSymptomPicker(true)}
                style={({ pressed }) => [styles.somethingWrongBtn, pressed && { opacity: 0.8 }]}
              >
                <Ico.Alert color={colors.amber} size={15} />
                <Text style={styles.somethingWrongText}>Something wrong?</Text>
              </Pressable>
            ) : (
              <View style={styles.symptomPickerCard}>
                <View style={styles.symptomPickerTop}>
                  <Text style={styles.symptomPickerTitle}>What looks off?</Text>
                  <Pressable
                    onPress={() => { setShowSymptomPicker(false); setPickedSymptom(null); }}
                    style={({ pressed }) => [styles.symptomPickerCloseBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.symptomPickerCloseText}>✕</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.symptomChipRow}
                >
                  {SYMPTOM_CHIPS.map((s) => {
                    const active = pickedSymptom === s;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setPickedSymptom(active ? null : s)}
                        style={[styles.symptomChip, active && styles.symptomChipActive]}
                      >
                        {active && <View style={styles.symptomChipDot} />}
                        <Text style={[styles.symptomChipText, active && styles.symptomChipTextActive]}>
                          {s}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {pickedSymptom && (
                  <View style={styles.symptomActions}>
                    <Pressable
                      onPress={() => {
                        setShowSymptomPicker(false);
                        navigation.navigate('Camera', { linkedPlantId: report.id, initialSymptom: pickedSymptom });
                      }}
                      style={({ pressed }) => [styles.symptomScanBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Ico.Scan color="#FBFAF3" size={14} />
                      <Text style={styles.symptomScanBtnText}>Scan to diagnose</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleTextDiagnosis}
                      disabled={diagnosing}
                      style={({ pressed }) => [
                        styles.symptomTextBtn,
                        pressed && { opacity: 0.85 },
                        diagnosing && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.symptomTextBtnText}>
                        {diagnosing ? 'Diagnosing…' : 'Quick diagnosis'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

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
            <Text style={styles.diagnosisFooterNote}>
              Symptom-specific advice · may differ from baseline care guide
            </Text>
          </View>
        )}

        {/* ── Care guide — shown when data is present ─────────────── */}
        {!!report.water && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Care guide</Text>
            <View style={styles.careGrid}>
              {CARE_TILES.map((tile) => (
                <CareTile
                  key={tile.label}
                  {...tile}
                  onPress={() => handleTilePress(tile.tileKey)}
                />
              ))}
            </View>

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
        )}

        {/* ── Health tips ──────────────────────────────────────────── */}
        {!!report.water && report.health_tips?.length > 0 && (
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

        {/* ── Save to My Plants — hidden for manual (already saved) ── */}
        {!isManual && (
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.saveBtnText}>+ Save to My Plants</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Expanded care tile overlay ────────────────────────────── */}
      <Modal
        visible={!!expandedTileData}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleCloseTile}
      >
        {expandedTileData ? (
          <View style={styles.tileOverlayWrapper}>
            {/* Scrim */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                styles.tileScrim,
                {
                  opacity: tileOverlayAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.28],
                  }),
                },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCloseTile} />
            </Animated.View>

            {/* Expanded card */}
            <View style={styles.tileOverlayPositioner} pointerEvents="box-none">
              <Animated.View
                style={[
                  styles.tileOverlayCard,
                  {
                    opacity: tileOverlayAnim.interpolate({
                      inputRange: [0, 0.4, 1],
                      outputRange: [0, 0.7, 1],
                    }),
                    transform: [
                      {
                        scale: tileOverlayAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.88, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Header: icon + label + close X */}
                <View style={styles.tileOverlayHeader}>
                  <View style={styles.careIconBadge}>
                    <expandedTileData.Icon color={expandedTileData.iconColor} size={18} />
                  </View>
                  <Text style={styles.tileOverlayLabel}>{expandedTileData.label}</Text>
                  <Pressable
                    onPress={handleCloseTile}
                    style={({ pressed }) => [styles.tileOverlayCloseBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.tileOverlayCloseText}>✕</Text>
                  </Pressable>
                </View>

                {/* Full untruncated text */}
                <Text style={styles.tileOverlayValue}>{expandedTileData.value}</Text>

                {/* Water: schedule button */}
                {expandedTileData.tileKey === 'water' && expandedTileData.canSchedule && (
                  <Pressable
                    onPress={handleTileSchedule}
                    style={({ pressed }) => [styles.tileScheduleBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Ico.Drop color={colors.pine} size={13} />
                    <Text style={styles.tileScheduleBtnText}>
                      {expandedTileData.hasSchedule ? 'Update schedule →' : 'Schedule watering →'}
                    </Text>
                  </Pressable>
                )}
              </Animated.View>
            </View>
          </View>
        ) : null}
      </Modal>

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
  diagnosisFooterNote: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.amberDeep,
    opacity: 0.45,
    letterSpacing: 0.3,
    marginTop: 10,
    textAlign: 'center',
  },

  // ── Care guide
  section: {
    marginBottom: 24,
  },
  scheduleWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  scheduleWaterBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: colors.pine,
  },

  // ── Expanded tile overlay
  tileOverlayWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  tileScrim: {
    backgroundColor: '#0E1A12',
  },
  tileOverlayPositioner: {
    // centers the card vertically within the wrapper
  },
  tileOverlayCard: {
    backgroundColor: colors.bgRaise,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    shadowColor: '#0F1A12',
    shadowOpacity: 0.26,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  tileOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tileOverlayLabel: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMute,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: 10,
  },
  tileOverlayCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgSage,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOverlayCloseText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.textSoft,
  },
  tileOverlayValue: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
    letterSpacing: -0.2,
  },
  tileScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tileScheduleBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: colors.pine,
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

  // ── Manual photo pill
  heroPhotoBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(14,26,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroPhotoBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#F4F1E8',
    letterSpacing: 0.2,
  },

  // ── Scan banner
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgSage,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.35)',
    borderRadius: radii['2xl'],
    padding: 14,
    marginBottom: 22,
  },
  scanBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.bgMint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanBannerText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.pine,
  },
  scanBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.pine,
    flexShrink: 0,
  },
  scanBannerBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#FBFAF3',
    letterSpacing: 0.2,
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

  // ── Something wrong? / symptom picker
  symptomPickerWrap: {
    marginBottom: 22,
  },
  somethingWrongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberLine,
  },
  somethingWrongText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.amberDeep,
  },
  symptomPickerCard: {
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberLine,
    borderRadius: radii['2xl'],
    padding: 16,
    overflow: 'hidden',
  },
  symptomPickerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  symptomPickerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.amberDeep,
  },
  symptomPickerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(184,132,46,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomPickerCloseText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.amberDeep,
  },
  symptomChipRow: {
    gap: 8,
    paddingBottom: 2,
  },
  symptomChip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(184,132,46,0.08)',
    borderWidth: 1,
    borderColor: colors.amberLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  symptomChipActive: {
    backgroundColor: 'rgba(184,132,46,0.22)',
    borderColor: colors.amber,
  },
  symptomChipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.amber,
  },
  symptomChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.amberDeep,
    opacity: 0.7,
  },
  symptomChipTextActive: {
    opacity: 1,
  },
  symptomActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  symptomScanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.pine,
  },
  symptomScanBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FBFAF3',
  },
  symptomTextBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(184,132,46,0.12)',
    borderWidth: 1,
    borderColor: colors.amberLine,
  },
  symptomTextBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.amberDeep,
  },
});
