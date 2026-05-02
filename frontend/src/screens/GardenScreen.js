import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors, fonts, radii } from '../utils/theme';
import { getHistory } from '../utils/history';
import * as Ico from '../components/Ico';

// ─── Constants ────────────────────────────────────────────────
const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Date helpers ─────────────────────────────────────────────

// Returns 0=Mon … 6=Sun
function weekdayIdx(date) {
  return (date.getDay() + 6) % 7;
}

// Returns the 7 Date objects for Mon–Sun of the current week
function getWeekDates() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - weekdayIdx(now));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekLabel() {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const wd = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - wd);
  const yr = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yr) / 86400000) + 1) / 7);
  return `${month} · WEEK ${week}`;
}

// Human-readable water due label
function waterLabel(diffDays, dueDate) {
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return `Water · due ${n} day${n === 1 ? '' : 's'} ago`;
  }
  if (diffDays === 0) return 'Water today';
  return `Water ${dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
}

// ─── Task scheduling ──────────────────────────────────────────

function buildTasks(history) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tasks = [];

  history.forEach((plant) => {
    // "week" in water field → 7-day cadence, otherwise default to every 3 days
    const waterText = (plant.water ?? '').toLowerCase();
    const intervalDays = waterText.includes('week') ? 7 : 3;

    const lastCare = plant.timestamp ? new Date(plant.timestamp) : new Date();
    lastCare.setHours(0, 0, 0, 0);

    const dueDate = new Date(lastCare);
    dueDate.setDate(lastCare.getDate() + intervalDays);

    const diffDays = Math.round((dueDate - todayStart) / 86400000);

    // Only show tasks overdue or due within the next 6 days
    if (diffDays > 6) return;

    tasks.push({
      id: `w_${plant.id}`,
      plantName: plant.common_name || plant.species?.split(' ')[0] || 'Plant',
      dueDate,
      diffDays,
      isOverdue: diffDays < 0,
      isToday: diffDays <= 0,
    });
  });

  // Overdue first, then by ascending due date
  return tasks.sort((a, b) => a.diffDays - b.diffDays);
}

// ─── Task row ─────────────────────────────────────────────────

function TaskRow({ task, done, muted, onToggle }) {
  const label = waterLabel(task.diffDays, task.dueDate);
  return (
    <Pressable
      onPress={() => onToggle(task.id)}
      style={({ pressed }) => [
        styles.taskRow,
        muted && styles.taskRowMuted,
        pressed && { opacity: 0.82 },
      ]}
    >
      {/* Drop icon tile */}
      <View style={[styles.taskTile, muted && styles.taskTileMuted]}>
        <Ico.Drop color={muted ? colors.textMute : colors.pine} size={18} />
      </View>

      {/* Body */}
      <View style={styles.taskBody}>
        <Text
          style={[styles.taskName, done && styles.taskNameDone, muted && styles.taskNameMuted]}
          numberOfLines={1}
        >
          {task.plantName}
        </Text>
        <View style={styles.taskMetaRow}>
          <Text style={[styles.taskLabel, muted && styles.taskLabelMuted]}>
            {label}
          </Text>
          {task.isOverdue && !done && (
            <View style={styles.overduePill}>
              <Text style={styles.overduePillText}>Overdue</Text>
            </View>
          )}
        </View>
      </View>

      {/* Circular checkbox */}
      <View style={[styles.checkbox, done && styles.checkboxDone]}>
        {done && <Ico.Check color={colors.bg} size={12} />}
      </View>
    </Pressable>
  );
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState({ onScan }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ico.Leaf color={colors.pine} size={24} />
      </View>
      <Text style={styles.emptyTitle}>
        <Text style={styles.emptyTitleItalic}>Nothing</Text>{' '}scheduled yet
      </Text>
      <Text style={styles.emptyBody}>
        Scan a plant to start tracking care reminders.
      </Text>
      <Pressable
        onPress={onScan}
        style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
      >
        <Ico.Scan color={colors.pine} size={16} />
        <Text style={styles.emptyBtnText}>Scan a plant</Text>
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function GardenScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState([]);
  const [completed, setCompleted] = useState(new Set());

  useFocusEffect(
    useCallback(() => {
      getHistory().then((h) => setTasks(buildTasks(h)));
    }, [])
  );

  async function handleToggle(id) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const todayIdx  = weekdayIdx(new Date());
  const weekDates = getWeekDates();

  // Compute which columns of the week strip get a dot
  const weekStart = weekDates[0];
  const weekEnd   = weekDates[6];
  const taskDaySet = new Set();
  tasks.forEach((t) => {
    if (t.diffDays < 0) {
      // Overdue → pin to today's column
      taskDaySet.add(todayIdx);
    } else {
      const due = t.dueDate;
      if (due >= weekStart && due <= weekEnd) {
        taskDaySet.add(weekdayIdx(due));
      }
    }
  });

  const todayTasks    = tasks.filter((t) => t.isToday);
  const upcomingTasks = tasks.filter((t) => !t.isToday);
  const topPad        = Math.max(56, insets.top + 16);

  return (
    <View style={styles.root}>
      {/* Soft mint wash */}
      <LinearGradient
        colors={[colors.bgMint, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={styles.bgWash}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerMeta}>{getWeekLabel()}</Text>
          <Text style={styles.headerTitle}>
            <Text style={styles.headerTitleItalic}>The</Text>
            {' garden'}
          </Text>
        </View>

        {/* ── Week strip ─────────────────────────────────── */}
        <View style={styles.weekCard}>
          {WEEK_DAYS.map((initial, i) => {
            const isToday  = i === todayIdx;
            const hasDot   = taskDaySet.has(i);
            const isPast   = i < todayIdx;
            return (
              <View key={i} style={[styles.dayCell, isToday && styles.dayCellToday]}>
                <Text style={[
                  styles.dayInitial,
                  isToday && styles.dayCellLightText,
                  isPast  && styles.dayCellPastText,
                ]}>
                  {initial}
                </Text>
                <Text style={[
                  styles.dayNum,
                  isToday && styles.dayCellLightText,
                  isPast  && styles.dayCellPastText,
                ]}>
                  {weekDates[i].getDate()}
                </Text>
                <View style={[
                  styles.dayDot,
                  hasDot && {
                    backgroundColor: isToday ? colors.mint : colors.leaf,
                    opacity: isPast ? 0.45 : 1,
                  },
                ]} />
              </View>
            );
          })}
        </View>

        {/* ── Today ──────────────────────────────────────── */}
        {todayTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionToday}>Today</Text>
            {todayTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                done={completed.has(t.id)}
                muted={false}
                onToggle={handleToggle}
              />
            ))}
          </View>
        )}

        {/* ── Upcoming ───────────────────────────────────── */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionUpcoming}>Upcoming</Text>
            {upcomingTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                done={completed.has(t.id)}
                muted={true}
                onToggle={handleToggle}
              />
            ))}
          </View>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {tasks.length === 0 && (
          <EmptyState onScan={() => navigation.getParent()?.navigate('Camera')} />
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
  bgWash: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '55%',
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  // ── Header
  header: {
    marginBottom: 20,
    paddingHorizontal: 8,
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
    lineHeight: 38,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerTitleItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },

  // ── Week strip
  weekCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgRaise,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 24,
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  dayCellToday: {
    backgroundColor: colors.forest,
  },
  dayCellLightText: {
    color: colors.bg,
  },
  dayCellPastText: {
    opacity: 0.38,
  },
  dayInitial: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMute,
    letterSpacing: 0.6,
  },
  dayNum: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.text,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },

  // ── Section headers
  section: {
    marginBottom: 8,
  },
  sectionToday: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 20,
    lineHeight: 24,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionUpcoming: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // ── Task row
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  taskRowMuted: {
    // Upcoming rows: slight opacity reduction, softer border
    opacity: 0.78,
  },
  taskTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bgMint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskTileMuted: {
    backgroundColor: colors.bgSage,
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  taskNameDone: {
    textDecorationLine: 'line-through',
    color: colors.textMute,
  },
  taskNameMuted: {
    color: colors.textSoft,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  taskLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSoft,
  },
  taskLabelMuted: {
    color: colors.textMute,
  },

  // ── Overdue pill
  overduePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberLine,
  },
  overduePillText: {
    fontFamily: fonts.sansBold,
    fontSize: 9.5,
    color: colors.amberDeep,
    letterSpacing: 0.3,
  },

  // ── Checkbox
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },

  // ── Empty state
  emptyCard: {
    marginTop: 32,
    padding: 36,
    paddingHorizontal: 28,
    borderRadius: radii['2xl'],
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 24,
    color: colors.text,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyTitleItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    height: 42,
    paddingHorizontal: 20,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.4)',
    borderRadius: radii.xl,
  },
  emptyBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.pine,
  },
});
