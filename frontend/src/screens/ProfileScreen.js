import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '../utils/theme';
import { getHistory } from '../utils/history';
import * as Ico from '../components/Ico';

// ── Stats + achievement unlock computation ────────────────────
function computeStats(history) {
  const total = history.length;
  const speciesSet = new Set(history.map((i) => i.species).filter(Boolean));
  const healthy = history.filter((i) => !i.symptom).length;
  const healthyPct = total > 0 ? Math.round((healthy / total) * 100) : 0;

  let spanDays = 0;
  if (history.length >= 2) {
    const ts = history.map((i) => new Date(i.timestamp).getTime());
    spanDays = Math.round((Math.max(...ts) - Math.min(...ts)) / 86400000);
  }

  return {
    total,
    species: speciesSet.size,
    healthyPct,
    unlocked: {
      first_scan: total >= 1,
      five_plants: total >= 5,
      weekly:      spanDays >= 7,
      explorer:    speciesSet.size >= 3,
    },
  };
}

const ACHIEVEMENTS = [
  { id: 'first_scan', label: 'FIRST SCAN', Icon: Ico.Trophy },
  { id: 'five_plants', label: '5 PLANTS',  Icon: Ico.Leaf   },
  { id: 'weekly',      label: 'WEEKLY',    Icon: Ico.Drop   },
  { id: 'explorer',    label: 'EXPLORER',  Icon: Ico.Star   },
];

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Achievement badge ─────────────────────────────────────────
function Badge({ label, Icon, unlocked }) {
  return (
    <View style={[styles.badge, !unlocked && styles.badgeLocked]}>
      <View style={styles.badgeIconWrap}>
        <Icon color={unlocked ? colors.pine : colors.textMute} size={18} />
      </View>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

// ── Settings row ──────────────────────────────────────────────
function SettingsRow({ icon: Icon, label, danger, toggle, toggleValue, onToggleChange, onPress, showBorder }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        showBorder && styles.settingsRowBorder,
        pressed && { opacity: 0.7 },
      ]}
    >
      {Icon && (
        <View style={styles.settingsIconTile}>
          <Icon color={colors.pine} size={16} />
        </View>
      )}
      <Text style={[styles.settingsLabel, danger && styles.settingsLabelDanger]}>
        {label}
      </Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          trackColor={{ false: colors.lineSoft, true: colors.bgMint }}
          thumbColor={toggleValue ? colors.pine : '#bbb'}
        />
      ) : !danger ? (
        <Ico.Chevron color={colors.textMute} size={16} />
      ) : null}
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({ total: 0, species: 0, healthyPct: 0, unlocked: {} });
  const [notificationsOn, setNotificationsOn] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getHistory().then((h) => setStats(computeStats(h)));
    }, [])
  );

  const topPad = Math.max(56, insets.top + 8);

  function comingSoon() {
    Alert.alert('Coming soon', 'This feature is coming in a future update.');
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: topPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerMeta}>Profile</Text>
        <Text style={styles.headerTitle}>
          {'Your '}
          <Text style={styles.headerItalic}>garden</Text>
        </Text>
      </View>

      {/* ── Avatar block ───────────────────────────────── */}
      <View style={styles.avatarBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>GT</Text>
        </View>
        <Text style={styles.avatarName}>Plant Parent</Text>
        <Text style={styles.avatarSub}>Tracking your garden</Text>
      </View>

      {/* ── Stats row ──────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard value={String(stats.total)} label="SCANS" />
        <StatCard value={String(stats.species)} label="PLANTS" />
        <StatCard value={`${stats.healthyPct}%`} label="HEALTHY" />
      </View>

      {/* ── Achievements ───────────────────────────────── */}
      <Text style={styles.sectionLabel}>Achievements</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsRow}
      >
        {ACHIEVEMENTS.map((a) => (
          <Badge
            key={a.id}
            label={a.label}
            Icon={a.Icon}
            unlocked={!!stats.unlocked[a.id]}
          />
        ))}
      </ScrollView>

      {/* ── Settings ───────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Settings</Text>
      <View style={styles.settingsCard}>
        <SettingsRow
          icon={Ico.Bell}
          label="Notifications"
          toggle
          toggleValue={notificationsOn}
          onToggleChange={setNotificationsOn}
          onPress={comingSoon}
        />
        <SettingsRow
          icon={Ico.Reminder}
          label="Watering reminders"
          showBorder
          onPress={comingSoon}
        />
        <SettingsRow
          icon={Ico.Share}
          label="Share my garden"
          showBorder
          onPress={comingSoon}
        />
        <SettingsRow
          icon={Ico.Settings}
          label="About Green Thumbs"
          showBorder
          onPress={comingSoon}
        />
        <SettingsRow
          danger
          label="Sign out"
          showBorder
          onPress={comingSoon}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Green Thumbs · v1.0</Text>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 140,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 36,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },

  // Avatar block
  avatarBlock: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
    gap: 6,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitials: {
    fontFamily: fonts.serif,
    fontSize: 36,
    lineHeight: 40,
    color: colors.pine,
  },
  avatarName: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.text,
  },
  avatarSub: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMute,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.xl,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 30,
    color: colors.text,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Section label
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 12,
  },

  // Achievements
  achievementsRow: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  badge: {
    alignItems: 'center',
    width: 76,
  },
  badgeLocked: {
    opacity: 0.35,
  },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    color: colors.textMute,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },

  // Settings
  settingsCard: {
    marginHorizontal: 16,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: colors.bgRaise,
  },
  settingsRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  settingsIconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsLabel: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
  },
  settingsLabelDanger: {
    fontFamily: fonts.sansBold,
    color: colors.danger,
    textAlign: 'center',
  },

  // Footer
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
