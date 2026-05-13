import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect as SR } from 'react-native-svg';

import { colors, fonts, radii, shadows, gradients } from '../utils/theme';
import { getHistory } from '../utils/history';
import * as Ico from '../components/Ico';

// ─── Plant placeholder ────────────────────────────────────────
// Diagonal stripe using SVG Pattern — used for every plant image slot.
// IDs are stable per-instance via useRef so multiple can coexist.
let _ppCount = 0;
export function PlantPlaceholder({ size = 56, label = '', rx = 14 }) {
  const patId = useRef('pp' + _ppCount++).current;
  return (
    <View style={{ width: size, height: size, borderRadius: rx, overflow: 'hidden' }}>
      <Svg width={size} height={size}>
        <Defs>
          <Pattern
            id={patId}
            x="0" y="0"
            width="12" height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(135)"
          >
            <SR width="6" height="12" fill={colors.bgMint} />
            <SR x="6" width="6" height="12" fill={colors.bgSage} />
          </Pattern>
        </Defs>
        <SR width={size} height={size} rx={rx} fill={`url(#${patId})`} />
      </Svg>
      {label ? (
        <View style={[StyleSheet.absoluteFillObject, styles.ppLabelWrap]}>
          <Text style={styles.ppLabel} numberOfLines={1}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getDateLabel() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const mon = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const d = now.getDate();
  return `${day} · ${mon} ${d}`;
}

// ─── Sub-components ───────────────────────────────────────────
function StatTile({ value, label, bg, fg }) {
  return (
    <View style={[styles.statTile, { backgroundColor: bg, borderColor: colors.line }]}>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function ScanCard({ item, onPress }) {
  const genus = item.species ? item.species.split(' ')[0] : 'Plant';
  const displayDate = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Recently';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.scanCard, pressed && { opacity: 0.7 }]}
    >
      <View style={{ position: 'relative' }}>
        {item.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            style={{ width: 110, height: 110, borderRadius: radii.xl }}
            resizeMode="cover"
          />
        ) : (
          <PlantPlaceholder size={110} rx={radii.xl} label={genus.toUpperCase()} />
        )}
        {item.symptom && (
          <View style={styles.symptomDot} />
        )}
      </View>
      <Text style={styles.scanGenus} numberOfLines={1}>{genus}</Text>
      <Text style={styles.scanDate}>{displayDate}</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
    }, [])
  );

  const myPlants = history.length;
  const needsAttention = history.filter((h) => h.symptom && h.symptom !== 'None').length;
  const thriving = history.filter((h) => !h.symptom || h.symptom === 'None').length;
  const recent = history.slice(0, 5);
  const upNext = recent[0] ?? null;

  const topPad = Math.max(56, insets.top + 16);

  return (
    <View style={styles.root}>
      {/* Botanical wash — radial-style mint bloom from top-right */}
      <LinearGradient
        colors={[
          '#DCE7C7',               // bgMint full opacity
          'rgba(220,231,199,0.75)',
          'rgba(220,231,199,0.4)',
          'rgba(244,241,232,0.1)',
          'rgba(244,241,232,0)',   // bg at zero opacity — avoids Android black-band banding
        ]}
        locations={[0, 0.25, 0.5, 0.72, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={styles.botanicalWash}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateLabel}>{getDateLabel()}</Text>
            <Text style={styles.greeting}>
              <Text style={styles.greetingItalic}>Good</Text>
              {' '}{getGreeting()}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.avatarInitial}>K</Text>
          </Pressable>
        </View>

        {/* ── Primary CTA ────────────────────────────────── */}
        <Pressable
          onPress={() => navigation.navigate('Camera')}
          style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={gradients.cta}
            style={styles.ctaGradient}
          >
            <Ico.Scan color="#FBFAF3" size={22} />
            <Text style={styles.ctaLabel}>Scan a plant</Text>
            <Ico.Chevron color="rgba(255,255,255,0.6)" size={18} />
          </LinearGradient>
        </Pressable>

        {/* ── Stats ──────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatTile
            value={String(myPlants)}
            label="MY PLANTS"
            bg={colors.bgMint}
            fg={colors.pine}
          />
          <StatTile
            value={myPlants > 0 ? String(needsAttention) : '—'}
            label="ATTENTION"
            bg={needsAttention > 0 ? colors.amberSoft : colors.bgSage}
            fg={needsAttention > 0 ? colors.amberDeep : colors.pine}
          />
          <StatTile
            value={myPlants > 0 ? String(thriving) : '—'}
            label="THRIVING"
            bg={colors.bgMint}
            fg={colors.pine}
          />
        </View>

        {/* ── Up next ────────────────────────────────────── */}
        <Pressable
          onPress={() => navigation.navigate('Garden')}
          style={({ pressed }) => [styles.upNextCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.upNextHeader}>
            <Text style={styles.upNextMeta}>Up next</Text>
            <Text style={styles.upNextDay}>
              {upNext
                ? new Date(upNext.timestamp).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                : 'TODAY'}
            </Text>
          </View>
          <View style={styles.upNextBody}>
            {upNext ? (
              <PlantPlaceholder size={48} rx={12} label={upNext.species?.split(' ')[0].toUpperCase() ?? ''} />
            ) : (
              <View style={styles.upNextIconWrap}>
                <Ico.Leaf color={colors.pine} size={22} />
              </View>
            )}
            <View style={styles.upNextText}>
              <Text style={styles.upNextName} numberOfLines={1}>
                {upNext
                  ? `Water ${upNext.nickname || upNext.common_name || upNext.species?.split(' ')[0] || 'plant'}`
                  : 'Add your first plant'}
              </Text>
              <Text style={styles.upNextSub}>
                {upNext
                  ? 'Check top 2 in. of soil before watering'
                  : 'Scan one to start tracking care'}
              </Text>
            </View>
            {upNext && (
              <View style={styles.upNextDoneBtn}>
                <Text style={styles.upNextDoneTxt}>Done</Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* ── Recent scans ───────────────────────────────── */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionMeta}>Recent scans</Text>
          <Pressable onPress={() => navigation.navigate('Plants')}>
            <Text style={styles.seeAll}>See all →</Text>
          </Pressable>
        </View>

        {recent.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scanRail}
            style={styles.scanRailScroll}
          >
            {recent.map((item) => (
              <ScanCard
                key={item.id}
                item={item}
                onPress={() => navigation.navigate('Report', { report: item })}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyRail}>
            <Text style={styles.emptyRailText}>
              Your scans will appear here — tap the button above to start.
            </Text>
          </View>
        )}
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
  botanicalWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  dateLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  greeting: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 36,
    color: colors.text,
    letterSpacing: -0.3,
  },
  greetingItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSage,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  avatarInitial: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.pine,
  },

  // CTA
  ctaWrap: {
    borderRadius: 18,
    ...shadows.cta,
    marginBottom: 16,
  },
  ctaGradient: {
    height: 64,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  ctaLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FBFAF3',
    letterSpacing: 0.2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    padding: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  statValue: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.7,
    marginTop: 4,
  },

  // Up next
  upNextCard: {
    padding: 18,
    borderRadius: radii['2xl'],
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 22,
  },
  upNextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  upNextMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  upNextDay: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.leaf,
    letterSpacing: 0.6,
  },
  upNextBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  upNextIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.bgMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextText: {
    flex: 1,
  },
  upNextName: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 16,
    color: colors.text,
  },
  upNextSub: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    color: colors.textSoft,
    marginTop: 2,
  },
  upNextDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.3)',
  },
  upNextDoneTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.pine,
  },

  // Recent scans
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  seeAll: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.leaf,
  },
  scanRailScroll: {
    marginHorizontal: -24,
  },
  scanRail: {
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  scanCard: {
    width: 110,
  },
  symptomDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  scanGenus: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.text,
    marginTop: 8,
  },
  scanDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textMute,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  emptyRail: {
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  emptyRailText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMute,
    lineHeight: 19,
  },

  // PlantPlaceholder label
  ppLabelWrap: {
    alignItems: 'center',
    paddingTop: 6,
  },
  ppLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.pine,
    letterSpacing: 0.5,
  },
});
