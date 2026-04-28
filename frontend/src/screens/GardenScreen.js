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

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TASK_TYPES = ['Water', 'Check soil', 'Mist leaves', 'Rotate', 'Repot'];
const WHEN_LABELS = ['Today', 'Today', 'Tomorrow', 'Wednesday', 'Saturday'];

// ─── Date helpers ─────────────────────────────────────────────

function getWeekLabel() {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${month} · WEEK ${week}`;
}

function getTodayIdx() {
  return (new Date().getDay() + 6) % 7; // 0=Mon … 6=Sun
}

function getWeekDates() {
  const now = new Date();
  const todayIdx = getTodayIdx();
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });
}

function whenToDayIdx(when, todayIdx) {
  if (when === 'Today')     return todayIdx;
  if (when === 'Tomorrow')  return (todayIdx + 1) % 7;
  if (when === 'Wednesday') return 2;
  if (when === 'Saturday')  return 5;
  return -1;
}

// ─── Task generation ──────────────────────────────────────────

function generateTasks(history) {
  if (history.length === 0) {
    return [
      { id: 's0', plantFull: 'Monstera deliciosa',   task: 'Water',      when: 'Today',     due: true,  tone: 'amber' },
      { id: 's1', plantFull: 'Dracaena trifasciata', task: 'Check soil', when: 'Today',     due: false, tone: 'leaf' },
      { id: 's2', plantFull: 'Ficus lyrata',         task: 'Mist leaves',when: 'Tomorrow',  due: false, tone: 'leaf' },
      { id: 's3', plantFull: 'Epipremnum aureum',    task: 'Rotate',     when: 'Wednesday', due: false, tone: 'leaf' },
      { id: 's4', plantFull: 'Calathea orbifolia',   task: 'Repot',      when: 'Saturday',  due: false, tone: 'leaf' },
    ];
  }
  return history.slice(0, 5).map((item, i) => ({
    id: item.id || `t${i}`,
    plantFull: item.species || item.common_name || 'Plant',
    task: TASK_TYPES[i % TASK_TYPES.length],
    when: WHEN_LABELS[i] || 'This week',
    due: i === 0 && !!item.symptom,
    tone: i === 0 && !!item.symptom ? 'amber' : 'leaf',
  }));
}

// ─── Task icon ────────────────────────────────────────────────

function TaskIcon({ task, tone }) {
  const c = tone === 'amber' ? colors.amberDeep : colors.pine;
  if (task === 'Water')       return <Ico.Drop  color={c} size={18} />;
  if (task === 'Mist leaves') return <Ico.Humid color={c} size={18} />;
  return <Ico.Leaf color={c} size={18} />;
}

// ─── Task row ─────────────────────────────────────────────────

function TaskRow({ item, done, onToggle }) {
  const isAmber = item.tone === 'amber';
  return (
    <View style={[styles.taskRow, isAmber && styles.taskRowAmber]}>
      <View style={[styles.taskIconWrap, { backgroundColor: isAmber ? colors.amberSoft : colors.bgMint }]}>
        <TaskIcon task={item.task} tone={item.tone} />
      </View>
      <View style={styles.taskBody}>
        <Text style={[styles.taskTitle, done && styles.taskTitleDone]} numberOfLines={1}>
          <Text style={styles.taskType}>{item.task}</Text>
          <Text style={styles.taskDivider}> · </Text>
          <Text style={styles.taskPlant}>{item.plantFull}</Text>
        </Text>
        <Text style={[styles.taskWhen, isAmber && styles.taskWhenAmber]}>
          {item.when.toUpperCase()}
        </Text>
      </View>
      <Pressable
        onPress={() => onToggle(item.id)}
        style={({ pressed }) => [
          styles.checkbox,
          done && styles.checkboxDone,
          !done && isAmber && styles.checkboxAmber,
          pressed && { opacity: 0.7 },
        ]}
      >
        {done && <Ico.Check color={colors.leaf} size={12} />}
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function GardenScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState([]);
  const [completed, setCompleted] = useState(new Set());

  useFocusEffect(
    useCallback(() => {
      getHistory().then(h => setTasks(generateTasks(h)));
    }, [])
  );

  const todayIdx  = getTodayIdx();
  const weekDates = getWeekDates();

  const taskDaySet = new Set(
    tasks.map(t => whenToDayIdx(t.when, todayIdx)).filter(i => i >= 0)
  );

  const todayTasks    = tasks.filter(t => t.when === 'Today');
  const upcomingTasks = tasks.filter(t => t.when !== 'Today');

  const topPad = Math.max(56, insets.top + 16);

  async function handleToggle(id) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgMint, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
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
          <Text style={styles.metaLabel}>{getWeekLabel()}</Text>
          <Text style={styles.headline}>
            <Text style={styles.headlineItalic}>The</Text>
            {' '}garden
          </Text>
        </View>

        {/* ── Week strip ─────────────────────────────────── */}
        <View style={styles.weekCard}>
          {WEEK_DAYS.map((day, i) => {
            const isToday = i === todayIdx;
            const hasTasks = taskDaySet.has(i);
            return (
              <View key={i} style={[styles.dayCell, isToday && styles.dayCellToday]}>
                <Text style={[styles.dayInitial, isToday && styles.dayCellText]}>{day}</Text>
                <Text style={[styles.dayNum,     isToday && styles.dayCellText]}>{weekDates[i]}</Text>
                <View style={[
                  styles.dayDot,
                  { backgroundColor: hasTasks
                      ? (isToday ? colors.mint : colors.leaf)
                      : 'transparent' },
                ]} />
              </View>
            );
          })}
        </View>

        {/* ── Today's tasks ──────────────────────────────── */}
        {todayTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionTitleItalic}>Today</Text>
            </Text>
            {todayTasks.map(t => (
              <TaskRow key={t.id} item={t} done={completed.has(t.id)} onToggle={handleToggle} />
            ))}
          </View>
        )}

        {/* ── Upcoming ───────────────────────────────────── */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionMono}>Upcoming</Text>
            {upcomingTasks.map(t => (
              <TaskRow key={t.id} item={t} done={completed.has(t.id)} onToggle={handleToggle} />
            ))}
          </View>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {tasks.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ico.Leaf color={colors.pine} size={22} />
            </View>
            <Text style={styles.emptyTitle}>
              <Text style={styles.emptyTitleItalic}>Nothing</Text> scheduled yet
            </Text>
            <Text style={styles.emptyBody}>
              Scan a plant to start tracking care reminders.
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
  bgWash: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  // Header
  header: { marginBottom: 22 },
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

  // Week strip
  weekCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgRaise,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 22,
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
    backgroundColor: colors.text,
  },
  dayCellText: {
    color: colors.bg,
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
  },

  // Sections
  section: { marginBottom: 4 },
  sectionTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  sectionTitleItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  sectionMono: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },

  // Task rows
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  taskRowAmber: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberLine,
  },
  taskIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskBody: { flex: 1 },
  taskTitle: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMute,
  },
  taskType: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.text,
  },
  taskDivider: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMute,
  },
  taskPlant: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.text,
  },
  taskWhen: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.6,
  },
  taskWhenAmber: {
    color: colors.amberDeep,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: colors.bgMint,
    borderColor: colors.leaf,
  },
  checkboxAmber: {
    borderColor: colors.leaf,
  },

  // Empty state
  emptyCard: {
    marginTop: 32,
    padding: 32,
    borderRadius: radii['2xl'],
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  emptyTitleItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 19,
  },
});
