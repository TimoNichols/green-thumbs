import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, gradients } from '../utils/theme';
import { getHistory } from '../utils/history';
import * as Ico from '../components/Ico';

// ─── Sub-components ───────────────────────────────────────────

function StatBlock({ value, label }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AchievementTile({ icon, label, bg, border }) {
  return (
    <View style={[styles.achTile, { backgroundColor: bg, borderColor: border }]}>
      {icon}
      <Text style={styles.achLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({ icon, label, trail, last, isSwitch, switchValue, onSwitch }) {
  return (
    <View style={[styles.settingRow, !last && styles.settingRowBorder]}>
      <View style={styles.settingIconWrap}>{icon}</View>
      <Text style={styles.settingLabel}>{label}</Text>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitch}
          trackColor={{ false: colors.line, true: colors.leaf }}
          thumbColor={colors.bgRaise}
          style={styles.switch}
        />
      ) : trail ? (
        <Text style={styles.settingTrail}>{trail}</Text>
      ) : null}
      {!isSwitch && <Ico.Chevron color={colors.textMute} size={16} />}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [scanCount, setScanCount]     = useState(0);
  const [plantCount, setPlantCount]   = useState(0);
  const [healthyPct, setHealthyPct]   = useState(0);
  const [reminders, setReminders]     = useState(true);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(history => {
        const total   = history.length;
        const healthy = history.filter(h => !h.symptom).length;
        const species = new Set(history.map(h => h.species).filter(Boolean)).size;
        setScanCount(total);
        setPlantCount(species || total);
        setHealthyPct(total > 0 ? Math.round((healthy / total) * 100) : 0);
      });
    }, [])
  );

  const topPad = Math.max(56, insets.top + 16);

  return (
    <View style={styles.root}>
      {/* Mint wash behind header area */}
      <LinearGradient
        colors={[colors.bgMint, colors.bg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bgWash}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.metaLabel}>Profile</Text>
            <Text style={styles.headline}>
              <Text style={styles.headlineItalic}>Your</Text>
              {' '}garden
            </Text>
          </View>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
          >
            <Ico.Settings color={colors.text} size={18} />
          </Pressable>
        </View>

        {/* ── Avatar block ───────────────────────────────── */}
        <View style={styles.avatarBlock}>
          <LinearGradient
            colors={[colors.leaf, colors.pine]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarInitial}>K</Text>
          </LinearGradient>
          <View style={styles.avatarInfo}>
            <Text style={styles.avatarName}>Kai Nakamura</Text>
            <Text style={styles.avatarEmail}>kai@plantmail.co</Text>
            <Text style={styles.avatarBadge}>✦ green thumb · since 2024</Text>
          </View>
        </View>

        {/* ── Stats card ─────────────────────────────────── */}
        <View style={styles.statsCard}>
          <Text style={styles.cardMeta}>Garden stats</Text>
          <View style={styles.statsGrid}>
            <StatBlock value={String(scanCount)} label="scans" />
            <StatBlock value={String(plantCount)} label="plants saved" />
            <StatBlock
              value={scanCount > 0 ? `${healthyPct}%` : '—'}
              label="healthy rate"
            />
          </View>
        </View>

        {/* ── Achievement strip ──────────────────────────── */}
        <View style={styles.achStrip}>
          <AchievementTile
            icon={<Ico.Trophy color={colors.pine} size={16} />}
            label="7-day streak"
            bg={colors.bgMint}
            border={colors.line}
          />
          <AchievementTile
            icon={<Ico.Leaf color={colors.pine} size={16} />}
            label="First scan"
            bg={colors.bgSage}
            border={colors.line}
          />
          <AchievementTile
            icon={<Ico.Drop color={colors.amberDeep} size={16} />}
            label="Plant saver"
            bg={colors.amberSoft}
            border={colors.amberLine}
          />
        </View>

        {/* ── Settings ───────────────────────────────────── */}
        <Text style={styles.sectionMeta}>Account</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Ico.Bell color={colors.text} size={18} />}
            label="Watering reminders"
            isSwitch
            switchValue={reminders}
            onSwitch={setReminders}
          />
          <SettingRow
            icon={<Ico.Reminder color={colors.text} size={18} />}
            label="Care schedule"
            trail="Weekly"
          />
          <SettingRow
            icon={<Ico.Share color={colors.text} size={18} />}
            label="Share my garden"
          />
          <SettingRow
            icon={<Ico.User color={colors.text} size={18} />}
            label="Edit profile"
          />
          <SettingRow
            icon={<Ico.Settings color={colors.text} size={18} />}
            label="App settings"
            last
          />
        </View>

        {/* ── Sign out ───────────────────────────────────── */}
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
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
  bgWash: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 280,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  metaLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 8,
  },
  headlineItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // Avatar block
  avatarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 3,
    borderColor: colors.bgRaise,
  },
  avatarInitial: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 36,
    color: '#FBFAF3',
  },
  avatarInfo: { flex: 1 },
  avatarName: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.text,
    letterSpacing: -0.3,
  },
  avatarEmail: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 4,
  },
  avatarBadge: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.leaf,
    letterSpacing: 0.6,
    marginTop: 6,
    textTransform: 'uppercase',
  },

  // Stats card
  statsCard: {
    backgroundColor: colors.bgRaise,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 16,
  },
  cardMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBlock: { flex: 1 },
  statValue: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMute,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Achievement strip
  achStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  achTile: {
    flex: 1,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 6,
  },
  achLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.text,
  },

  // Settings section
  sectionMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingLabel: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.text,
  },
  settingTrail: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 0.4,
    marginRight: 4,
  },
  switch: {
    marginRight: 4,
  },

  // Sign out
  signOutBtn: {
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.textSoft,
  },
});
