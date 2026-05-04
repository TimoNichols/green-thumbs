import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors, fonts, radii } from '../utils/theme';
import { getHistory, updateHistory } from '../utils/history';
import { fetchWaterInterval, fetchCareSchedule } from '../utils/api';
import { logActivity } from '../utils/activity';
import * as Ico from '../components/Ico';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────
const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CAL_WEEK_H  = 96;
const CAL_MONTH_H = 324;

// ─── Date helpers ─────────────────────────────────────────────
function weekdayIdx(date) {
  return (date.getDay() + 6) % 7;
}

function getWeekDates() {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - weekdayIdx(now));
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
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

function getMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

function buildMonthDays(firstOfMonth) {
  const startOffset = weekdayIdx(firstOfMonth);
  const start = new Date(firstOfMonth);
  start.setDate(1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function dueDateChipLabel(diffDays, dueDate) {
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return `${n}d overdue`;
  }
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Task types ───────────────────────────────────────────────
const TASK_TYPES = [
  { key: 'water',      label: 'Water',       color: colors.pine     },
  { key: 'wipeLeaves', label: 'Wipe leaves', color: colors.leaf     },
  { key: 'fertilise',  label: 'Fertilise',   color: colors.amber    },
  { key: 'rotate',     label: 'Rotate',      color: colors.textMute },
];

// Maps each task to the plant care field that describes it
const TASK_CARE_FIELD = {
  water:      'water',
  wipeLeaves: 'humidity',
  fertilise:  'soil',
  rotate:     'sunlight',
};

function TaskIcon({ taskKey, color, size }) {
  switch (taskKey) {
    case 'water':      return <Ico.Drop   color={color} size={size} />;
    case 'wipeLeaves': return <Ico.Leaf   color={color} size={size} />;
    case 'fertilise':  return <Ico.Garden color={color} size={size} />;
    case 'rotate':     return <Ico.Flip   color={color} size={size} />;
    default:           return <Ico.Drop   color={color} size={size} />;
  }
}

// ─── Build tasks ──────────────────────────────────────────────
function buildTasksFromHistory(history) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = [];

  history.forEach((plant) => {
    const sched = plant.schedule ?? {};
    const lastCareMap = plant.lastCare ?? {};

    TASK_TYPES.forEach(({ key, label, color }) => {
      const intervalDays = sched[key] ?? null;
      if (!intervalDays) return;

      const anchorStr = lastCareMap[key] ?? null;
      const anchor = anchorStr
        ? new Date(anchorStr)
        : (plant.timestamp ? new Date(plant.timestamp) : new Date());
      anchor.setHours(0, 0, 0, 0);

      const dueDate = new Date(anchor);
      dueDate.setDate(anchor.getDate() + intervalDays);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((dueDate - today) / 86400000);

      tasks.push({
        id: `${key}_${plant.id}`,
        plantId: plant.id,
        plant,
        plantName: plant.common_name || plant.species?.split(' ')[0] || 'Plant',
        taskKey: key,
        taskLabel: label,
        taskColor: color,
        dueDate,
        diffDays,
        isOverdue: diffDays < 0,
        isToday: diffDays <= 0,
      });
    });
  });

  return tasks.sort((a, b) => a.diffDays - b.diffDays);
}

// ─── Task card ────────────────────────────────────────────────
function TaskCard({ task, done, isExpanded, onExpand, onToggle, onReschedule }) {
  const careField = TASK_CARE_FIELD[task.taskKey];
  const careText = careField ? task.plant[careField] : null;
  const chipLabel = dueDateChipLabel(task.diffDays, task.dueDate);

  return (
    <Pressable
      onPress={() => onExpand(task.id)}
      style={({ pressed }) => [
        styles.taskCard,
        isExpanded && styles.taskCardExpanded,
        pressed && !isExpanded && { opacity: 0.85 },
      ]}
    >
      {isExpanded && <View style={styles.taskCardAccentBar} />}

      {/* ── Collapsed header row ── */}
      <View style={styles.taskCardHeader}>
        <View style={styles.taskThumb}>
          {task.plant.photoUri ? (
            <Image
              source={{ uri: task.plant.photoUri }}
              style={styles.taskThumbImg}
              contentFit="cover"
            />
          ) : (
            <TaskIcon taskKey={task.taskKey} color={task.taskColor} size={18} />
          )}
        </View>

        <View style={styles.taskCardBody}>
          <Text
            style={[styles.taskCardName, done && styles.taskCardNameDone]}
            numberOfLines={1}
          >
            {task.plantName}
          </Text>
          <View style={styles.taskCardMeta}>
            <TaskIcon taskKey={task.taskKey} color={colors.textMute} size={11} />
            <Text style={styles.taskCardMetaLabel}>{task.taskLabel}</Text>
            <View style={[styles.dueDateChip, task.isOverdue && styles.dueDateChipOverdue]}>
              <Text style={[styles.dueDateChipText, task.isOverdue && styles.dueDateChipTextOverdue]}>
                {chipLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ transform: [{ rotate: isExpanded ? '-90deg' : '90deg' }] }}>
          <Ico.Chevron color={colors.textMute} size={12} />
        </View>
      </View>

      {/* ── Expanded panel ── */}
      {isExpanded && (
        <View style={styles.taskCardPanel}>
          {careText ? (
            <Text style={styles.taskCardCareText}>{careText}</Text>
          ) : null}

          <Pressable
            onPress={() => { onToggle(task.id); onExpand(null); }}
            style={({ pressed }) => [styles.markDoneBtn, pressed && { opacity: 0.85 }]}
          >
            <Ico.Check color="#fff" size={14} />
            <Text style={styles.markDoneBtnText}>Mark done</Text>
          </Pressable>

          <Pressable
            onPress={() => { onReschedule(task); onExpand(null); }}
            style={({ pressed }) => [styles.rescheduleLink, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.rescheduleLinkText}>Reschedule +1 day</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

// ─── Empty / all-caught-up state ──────────────────────────────
function EmptyState({ onScan, nextTask }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ico.Leaf color={colors.leaf} size={22} />
      </View>
      <Text style={styles.emptyTitle}>
        <Text style={styles.emptyTitleItalic}>All caught up!</Text>
      </Text>
      {nextTask ? (
        <Text style={styles.emptyBody}>
          {'Next up: '}
          {nextTask.taskLabel.toLowerCase()}
          {' your '}
          {nextTask.plantName}
          {' on '}
          {nextTask.dueDate.toLocaleDateString('en-US', { weekday: 'long' })}
        </Text>
      ) : (
        <>
          <Text style={styles.emptyBody}>
            No tasks scheduled. Scan a plant to get started.
          </Text>
          <Pressable
            onPress={onScan}
            style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
          >
            <Ico.Scan color={colors.pine} size={16} />
            <Text style={styles.emptyBtnText}>Scan a plant</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// ─── Schedule sheet ───────────────────────────────────────────
const EXTRA_TASKS = [
  { key: 'wipeLeaves', label: 'Wipe leaves', iconBg: colors.bgSage,    iconColor: colors.leaf     },
  { key: 'fertilise',  label: 'Fertilise',   iconBg: colors.amberSoft, iconColor: colors.amber    },
  { key: 'rotate',     label: 'Rotate',      iconBg: colors.bgAlt,     iconColor: colors.textMute },
];

function ScheduleSheet({ visible, plant, allPlants, onClose, onSave, forceWaterSuggestion }) {
  const insets = useSafeAreaInsets();
  const isNew = !plant;

  const [selPlant, setSelPlant]   = useState(null);
  const [sched, setSched]         = useState({ water: 7, wipeLeaves: null, fertilise: null, rotate: null });
  const [loadingInterval, setLoadingInterval] = useState(false);
  const [suggestions, setSuggestions] = useState({ water: null, wipeLeaves: null, fertilise: null, rotate: null });
  const [pickingPlant, setPickingPlant] = useState(false);

  async function loadScheduleSuggestions(p, force) {
    const plantName = p?.common_name || p?.species;
    if (!plantName) return;
    setLoadingInterval(true);
    try {
      const careData = { water: p.water, sunlight: p.sunlight, soil: p.soil, humidity: p.humidity };
      const result = await fetchCareSchedule(plantName, careData);
      const newSug = {
        water:      result.water?.intervalDays      ?? null,
        wipeLeaves: result.wipeLeaves?.intervalDays ?? null,
        fertilise:  result.fertilise?.intervalDays  ?? null,
        rotate:     result.rotate?.intervalDays     ?? null,
      };
      setSuggestions(newSug);
      if ((force || !p.schedule?.water) && newSug.water) {
        setSched((s) => ({ ...s, water: newSug.water }));
      }
    } catch {}
    setLoadingInterval(false);
  }

  React.useEffect(() => {
    if (!visible) { setPickingPlant(false); return; }
    if (plant) {
      setSelPlant(plant);
      setSuggestions({ water: null, wipeLeaves: null, fertilise: null, rotate: null });
      setSched({
        water:      plant.schedule?.water      ?? 7,
        wipeLeaves: plant.schedule?.wipeLeaves ?? null,
        fertilise:  plant.schedule?.fertilise  ?? null,
        rotate:     plant.schedule?.rotate     ?? null,
      });
      loadScheduleSuggestions(plant, forceWaterSuggestion);
    } else {
      setSelPlant(null);
      setPickingPlant(false);
      setSuggestions({ water: null, wipeLeaves: null, fertilise: null, rotate: null });
      setSched({ water: 7, wipeLeaves: null, fertilise: null, rotate: null });
      setLoadingInterval(false);
    }
  }, [visible, plant]);

  function pickPlant(p) {
    setSelPlant(p);
    setPickingPlant(false);
    setSuggestions({ water: null, wipeLeaves: null, fertilise: null, rotate: null });
    setSched({
      water:      p.schedule?.water      ?? 7,
      wipeLeaves: p.schedule?.wipeLeaves ?? null,
      fertilise:  p.schedule?.fertilise  ?? null,
      rotate:     p.schedule?.rotate     ?? null,
    });
    loadScheduleSuggestions(p, false);
  }

  function handleSave() {
    if (!selPlant || sched.water < 1) return;
    const finalSched = { ...sched };
    for (const key of ['wipeLeaves', 'fertilise', 'rotate']) {
      if (finalSched[key] !== null && finalSched[key] < 1) return;
    }
    onSave(selPlant.id, finalSched);
    onClose();
  }

  const canSave = !!selPlant && sched.water >= 1 &&
    ['wipeLeaves', 'fertilise', 'rotate'].every((k) => sched[k] === null || sched[k] >= 1);

  const pickerLabel = selPlant ? (selPlant.common_name || selPlant.species || 'Plant') : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 28) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>
              {isNew ? 'Add schedule' : (selPlant?.common_name || selPlant?.species || 'Schedule')}
            </Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.sheetCloseBtn, pressed && { opacity: 0.6 }]}>
              <Ico.Close color={colors.textMute} size={18} />
            </Pressable>
          </View>

          {isNew && (
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionLabel}>Plant</Text>

              <Pressable
                onPress={() => setPickingPlant((v) => !v)}
                style={({ pressed }) => [styles.plantPickerRow, pressed && { opacity: 0.82 }]}
              >
                <View style={[styles.plantPickerIcon, !!selPlant && styles.plantPickerIconActive]}>
                  <Ico.Leaf color={selPlant ? colors.pine : colors.textMute} size={14} />
                </View>
                <Text
                  style={[styles.plantPickerText, !selPlant && styles.plantPickerPlaceholder]}
                  numberOfLines={1}
                >
                  {pickerLabel ?? 'Choose plant'}
                </Text>
                <View style={{ transform: [{ rotate: pickingPlant ? '-90deg' : '90deg' }] }}>
                  <Ico.Chevron color={colors.textMute} size={12} />
                </View>
              </Pressable>

              {pickingPlant && (
                <ScrollView
                  style={styles.plantListScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {allPlants.map((p) => {
                    const active = selPlant?.id === p.id;
                    const displayName = p.common_name || p.species || 'Plant';
                    const showSpecies = !!p.common_name && !!p.species;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => pickPlant(p)}
                        style={({ pressed }) => [
                          styles.plantListRow,
                          active && styles.plantListRowActive,
                          pressed && { opacity: 0.82 },
                        ]}
                      >
                        <View style={[styles.plantListIcon, active && styles.plantListIconActive]}>
                          <Ico.Leaf color={active ? colors.pine : colors.textMute} size={14} />
                        </View>
                        <View style={styles.plantListBody}>
                          <Text style={[styles.plantListName, active && styles.plantListNameActive]} numberOfLines={1}>
                            {displayName}
                          </Text>
                          {showSpecies && (
                            <Text style={styles.plantListSpecies} numberOfLines={1}>{p.species}</Text>
                          )}
                        </View>
                        {active && <Ico.Check color={colors.pine} size={13} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.sheetSection}>
            <View style={styles.taskTypeRow}>
              <View style={[styles.taskTypeIcon, { backgroundColor: colors.bgMint }]}>
                <Ico.Drop color={colors.pine} size={16} />
              </View>
              <Text style={styles.taskTypeLabel}>Water every</Text>
            </View>
            {loadingInterval ? (
              <Text style={styles.intervalLoading}>Calculating suggestions…</Text>
            ) : (
              <View style={styles.waterInputWrap}>
                <View style={styles.waterInputRow}>
                  <TextInput
                    style={styles.waterInput}
                    keyboardType="number-pad"
                    value={sched.water > 0 ? String(sched.water) : ''}
                    onChangeText={(v) => {
                      const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                      setSched((s) => ({ ...s, water: isNaN(n) ? 0 : n }));
                    }}
                    maxLength={3}
                    selectTextOnFocus
                    placeholder="—"
                    placeholderTextColor={colors.textMute}
                  />
                  <Text style={styles.waterInputUnit}>days</Text>
                </View>
                {suggestions.water != null && suggestions.water !== sched.water && (
                  <Text style={styles.waterInputHint}>Suggested: {suggestions.water} days</Text>
                )}
              </View>
            )}
          </View>

          {EXTRA_TASKS.map(({ key, label, iconBg, iconColor }) => {
            const enabled = sched[key] !== null;
            return (
              <View key={key} style={styles.sheetSection}>
                <View style={styles.taskTypeRow}>
                  <View style={[styles.taskTypeIcon, { backgroundColor: iconBg }]}>
                    <TaskIcon taskKey={key} color={iconColor} size={16} />
                  </View>
                  <Text style={styles.taskTypeLabel}>{label}</Text>
                  <Pressable
                    onPress={() => setSched((s) => ({
                      ...s,
                      [key]: enabled ? null : (suggestions[key] ?? 7),
                    }))}
                    style={[styles.toggle, enabled && styles.toggleOn]}
                  >
                    <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
                  </Pressable>
                </View>
                {enabled && (
                  <View style={styles.waterInputWrap}>
                    <View style={styles.waterInputRow}>
                      <TextInput
                        style={styles.waterInput}
                        keyboardType="number-pad"
                        value={sched[key] > 0 ? String(sched[key]) : ''}
                        onChangeText={(v) => {
                          const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                          setSched((s) => ({ ...s, [key]: isNaN(n) ? 0 : n }));
                        }}
                        maxLength={3}
                        selectTextOnFocus
                        placeholder="—"
                        placeholderTextColor={colors.textMute}
                      />
                      <Text style={styles.waterInputUnit}>days</Text>
                    </View>
                    {suggestions[key] != null && suggestions[key] !== sched[key] && (
                      <Text style={styles.waterInputHint}>Suggested: {suggestions[key]} days</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.sheetSaveBtn,
              !canSave && styles.sheetSaveBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.sheetSaveBtnText}>Save schedule</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────
export default function GardenScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [history, setHistory]           = useState([]);
  const [tasks, setTasks]               = useState([]);
  const [completed, setCompleted]       = useState(new Set());
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [expanded, setExpanded]         = useState(false);
  const [calMonth, setCalMonth]         = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay]   = useState(null);
  const [showSheet, setShowSheet]       = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [sheetFromReport, setSheetFromReport] = useState(false);

  const calAnim = useRef(new Animated.Value(0)).current;
  const openScheduleForRef = useRef(route.params?.openScheduleFor ?? null);
  openScheduleForRef.current = route.params?.openScheduleFor ?? null;

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const openFor = openScheduleForRef.current;

        const h = await getHistory();
        setHistory(h);
        setTasks(buildTasksFromHistory(h));

        if (openFor) {
          const target = h.find((p) => p.id === openFor);
          if (target) {
            setEditingPlant(target);
            setSheetFromReport(true);
            setShowSheet(true);
          }
          navigation.setParams({ openScheduleFor: undefined });
        }

        const unscheduled = h.filter((p) => p.water && !p.schedule?.water);
        if (unscheduled.length > 0) {
          Promise.all(
            unscheduled.map(async (p) => {
              try {
                const { intervalDays } = await fetchWaterInterval(p.water);
                await updateHistory(p.id, { schedule: { ...(p.schedule ?? {}), water: intervalDays } });
              } catch {}
            })
          ).then(async () => {
            const fresh = await getHistory();
            setHistory(fresh);
            setTasks(buildTasksFromHistory(fresh));
          });
        }
      }
      load();
    }, [])
  );

  function toggleCalendar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !expanded;
    setExpanded(next);
    Animated.timing(calAnim, {
      toValue: next ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }

  function handleExpand(id) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTaskId((prev) => (prev === id ? null : id));
  }

  async function handleToggle(id) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isMarking = !completed.has(id);
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    if (isMarking) {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        logActivity({ plantId: task.plantId, type: task.taskKey });
        const todayStr = new Date().toISOString().split('T')[0];
        const newLastCare = { ...(task.plant.lastCare ?? {}), [task.taskKey]: todayStr };
        await updateHistory(task.plantId, { lastCare: newLastCare });
        const fresh = await getHistory();
        setHistory(fresh);
        setTasks(buildTasksFromHistory(fresh));
      }
    }
  }

  async function handleReschedule(task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { taskKey, plant } = task;
    const anchorStr = plant.lastCare?.[taskKey] ?? null;
    const anchor = anchorStr
      ? new Date(anchorStr)
      : (plant.timestamp ? new Date(plant.timestamp) : new Date());
    anchor.setHours(0, 0, 0, 0);
    anchor.setDate(anchor.getDate() + 1);
    const newLastCare = { ...(plant.lastCare ?? {}), [taskKey]: anchor.toISOString().split('T')[0] };
    await updateHistory(task.plantId, { lastCare: newLastCare });
    const fresh = await getHistory();
    setHistory(fresh);
    setTasks(buildTasksFromHistory(fresh));
  }

  async function handleSaveSchedule(plantId, schedule) {
    await updateHistory(plantId, { schedule });
    const fresh = await getHistory();
    setHistory(fresh);
    setTasks(buildTasksFromHistory(fresh));
  }

  // ── Derived values ──────────────────────────────────────────
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const todayIdx  = weekdayIdx(today);
  const weekDates = getWeekDates();
  const monthDays = buildMonthDays(calMonth);

  const taskDateStrings = new Set(
    tasks.map((t) => (t.diffDays < 0 ? today : t.dueDate).toDateString())
  );

  const weekDotCols = new Set();
  tasks.forEach((t) => {
    if (t.diffDays < 0) { weekDotCols.add(todayIdx); return; }
    if (t.dueDate >= weekDates[0] && t.dueDate <= weekDates[6]) weekDotCols.add(weekdayIdx(t.dueDate));
  });

  const visibleTasks = selectedDay
    ? tasks.filter((t) => {
        if (t.dueDate.toDateString() === selectedDay.toDateString()) return true;
        return t.isOverdue && selectedDay.toDateString() === today.toDateString();
      })
    : tasks.filter((t) => t.diffDays <= 6);

  const overdueTasks  = selectedDay ? [] : visibleTasks.filter((t) => t.diffDays < 0);
  const todayTasks    = selectedDay ? [] : visibleTasks.filter((t) => t.diffDays === 0);
  const upcomingTasks = selectedDay ? [] : visibleTasks.filter((t) => t.diffDays > 0);

  const showAllCaughtUp = !selectedDay && overdueTasks.length === 0 && todayTasks.length === 0;

  const calHeight    = calAnim.interpolate({ inputRange: [0, 1], outputRange: [CAL_WEEK_H, CAL_MONTH_H] });
  const weekOpacity  = calAnim.interpolate({ inputRange: [0, 0.25], outputRange: [1, 0], extrapolate: 'clamp' });
  const monthOpacity = calAnim.interpolate({ inputRange: [0.35, 0.7], outputRange: [0, 1], extrapolate: 'clamp' });
  const chevronRot   = calAnim.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '-90deg'] });

  const selectedLabel = selectedDay
    ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  const topPad = Math.max(56, insets.top + 16);

  function renderTaskCard(t) {
    return (
      <TaskCard
        key={t.id}
        task={t}
        done={completed.has(t.id)}
        isExpanded={expandedTaskId === t.id}
        onExpand={handleExpand}
        onToggle={handleToggle}
        onReschedule={handleReschedule}
      />
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgMint, 'transparent']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }}
        style={styles.bgWash} pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerMeta}>{getWeekLabel()}</Text>
              <Text style={styles.headerTitle}>
                <Text style={styles.headerTitleItalic}>The</Text>{' garden'}
              </Text>
            </View>
            <Pressable
              onPress={() => { setEditingPlant(null); setSheetFromReport(false); setShowSheet(true); }}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
            >
              <Ico.Plus color={colors.pine} size={18} />
            </Pressable>
          </View>
        </View>

        {/* ── Calendar card ───────────────────────────────── */}
        <Animated.View style={[styles.calCard, { height: calHeight }]}>

          <Animated.View style={[styles.calLayer, { opacity: weekOpacity }]} pointerEvents={expanded ? 'none' : 'auto'}>
            <View style={styles.dayHeaderRow}>
              {WEEK_DAYS.map((d, i) => (
                <Text key={i} style={[styles.dayHeaderText, i === todayIdx && styles.dayHeaderToday]}>{d}</Text>
              ))}
            </View>
            <View style={styles.weekRow}>
              {weekDates.map((date, i) => {
                const isToday2   = i === todayIdx;
                const isSelected = selectedDay?.toDateString() === date.toDateString();
                const hasDot     = weekDotCols.has(i);
                const isPast     = i < todayIdx;
                return (
                  <Pressable
                    key={i}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDay(isSelected ? null : date); }}
                    style={[styles.dayCell, isToday2 && styles.dayCellToday, isSelected && styles.dayCellSelected]}
                  >
                    <Text style={[styles.dayNum, (isToday2 || isSelected) && styles.dayCellLightText, isPast && !isSelected && styles.dayCellPastText]}>
                      {date.getDate()}
                    </Text>
                    <View style={[styles.dayDot, hasDot && { backgroundColor: (isToday2 || isSelected) ? colors.mint : colors.leaf, opacity: isPast ? 0.45 : 1 }]} />
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View style={[styles.calLayer, { opacity: monthOpacity }]} pointerEvents={expanded ? 'auto' : 'none'}>
            <View style={styles.monthNavRow}>
              <Pressable onPress={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                style={({ pressed }) => [styles.monthNavBtn, pressed && { opacity: 0.6 }]}>
                <Ico.Back color={colors.textSoft} size={16} />
              </Pressable>
              <Text style={styles.monthNavLabel}>{getMonthLabel(calMonth)}</Text>
              <Pressable onPress={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                style={({ pressed }) => [styles.monthNavBtn, pressed && { opacity: 0.6 }]}>
                <View style={{ transform: [{ scaleX: -1 }] }}>
                  <Ico.Back color={colors.textSoft} size={16} />
                </View>
              </Pressable>
            </View>

            <View style={styles.dayHeaderRow}>
              {WEEK_DAYS.map((d, i) => <Text key={i} style={styles.dayHeaderText}>{d}</Text>)}
            </View>

            <View style={styles.monthGrid}>
              {Array.from({ length: 6 }).map((_, row) => (
                <View key={row} style={styles.monthRow}>
                  {monthDays.slice(row * 7, row * 7 + 7).map((d, col) => {
                    const inMonth    = d.getMonth() === calMonth.getMonth();
                    const isToday2   = d.toDateString() === today.toDateString();
                    const isSelected = selectedDay?.toDateString() === d.toDateString();
                    const hasDot     = taskDateStrings.has(d.toDateString()) && inMonth;
                    return (
                      <Pressable
                        key={col}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDay(isSelected ? null : d); }}
                        style={[styles.monthCell, isSelected && styles.monthCellSelected, isToday2 && !isSelected && styles.monthCellToday]}
                      >
                        <Text style={[
                          styles.monthCellNum,
                          !inMonth && styles.monthCellOutside,
                          isSelected && styles.monthCellLightText,
                          isToday2 && !isSelected && styles.monthCellTodayText,
                        ]}>
                          {d.getDate()}
                        </Text>
                        <View style={[styles.monthDot, hasDot && { backgroundColor: isSelected ? '#fff' : colors.leaf }]} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Animated.View>
        </Animated.View>

        {/* ── Expand / collapse chevron ────────────────────── */}
        <Pressable onPress={toggleCalendar} style={({ pressed }) => [styles.calChevron, pressed && { opacity: 0.6 }]}>
          <Animated.View style={{ transform: [{ rotate: chevronRot }] }}>
            <Ico.Chevron color={colors.textMute} size={16} />
          </Animated.View>
        </Pressable>

        {/* ── Selected day pill ────────────────────────────── */}
        {selectedDay && (
          <View style={styles.selectedDayRow}>
            <Text style={styles.selectedDayLabel}>{selectedLabel}</Text>
            <Pressable onPress={() => setSelectedDay(null)} style={({ pressed }) => [styles.clearDayBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.clearDayText}>Clear</Text>
            </Pressable>
          </View>
        )}

        {/* ── When a calendar day is selected ─────────────── */}
        {selectedDay && (
          <View style={styles.section}>
            <Text style={styles.sectionToday}>{selectedLabel}</Text>
            {visibleTasks.length > 0 ? (
              visibleTasks.map(renderTaskCard)
            ) : (
              <View style={styles.noTasksWrap}>
                <Text style={styles.noTasksText}>No tasks on this day</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Overdue ──────────────────────────────────────── */}
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionOverdue}>Overdue</Text>
            {overdueTasks.map(renderTaskCard)}
          </View>
        )}

        {/* ── Today ────────────────────────────────────────── */}
        {todayTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionToday}>Today</Text>
            {todayTasks.map(renderTaskCard)}
          </View>
        )}

        {/* ── All caught up ────────────────────────────────── */}
        {showAllCaughtUp && (
          <EmptyState
            onScan={() => navigation.getParent()?.navigate('Camera')}
            nextTask={upcomingTasks[0] ?? null}
          />
        )}

        {/* ── Upcoming ─────────────────────────────────────── */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionUpcoming}>Upcoming</Text>
            {upcomingTasks.map(renderTaskCard)}
          </View>
        )}
      </ScrollView>

      <ScheduleSheet
        visible={showSheet}
        plant={editingPlant}
        allPlants={history}
        onClose={() => { setShowSheet(false); setSheetFromReport(false); }}
        onSave={handleSaveSchedule}
        forceWaterSuggestion={sheetFromReport}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bgWash: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },

  // ── Header
  header: { marginBottom: 20, paddingHorizontal: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerMeta: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textMute, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  headerTitle: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.text, letterSpacing: -0.3 },
  headerTitleItalic: { fontFamily: fonts.serifItalic, fontStyle: 'italic' },
  addBtn: {
    width: 40, height: 40, borderRadius: radii.xl,
    backgroundColor: colors.bgMint, borderWidth: 1, borderColor: 'rgba(92,138,92,0.35)',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },

  // ── Calendar card
  calCard: {
    backgroundColor: colors.bgRaise,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 0,
    overflow: 'hidden',
  },
  calLayer: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12 },

  dayHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeaderText: {
    flex: 1, textAlign: 'center',
    fontFamily: fonts.mono, fontSize: 9, color: colors.textMute,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  dayHeaderToday: { color: colors.pine },

  weekRow: { flexDirection: 'row', gap: 2 },
  dayCell: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    borderRadius: 10, gap: 4,
  },
  dayCellToday: { backgroundColor: colors.forest },
  dayCellSelected: { backgroundColor: colors.pine },
  dayCellLightText: { color: '#F4F1E8' },
  dayCellPastText: { opacity: 0.38 },
  dayNum: { fontFamily: fonts.serif, fontSize: 17, color: colors.text },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },

  monthNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavBtn: { padding: 6 },
  monthNavLabel: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.textSoft, letterSpacing: 1.2, textTransform: 'uppercase' },
  monthGrid: { gap: 0 },
  monthRow: { flexDirection: 'row' },
  monthCell: { flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 8, gap: 3 },
  monthCellSelected: { backgroundColor: colors.pine },
  monthCellToday: { backgroundColor: colors.forest },
  monthCellNum: { fontFamily: fonts.serif, fontSize: 14, color: colors.text },
  monthCellOutside: { opacity: 0.28 },
  monthCellLightText: { color: '#F4F1E8' },
  monthCellTodayText: { color: '#F4F1E8' },
  monthDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },

  calChevron: {
    alignSelf: 'center', marginTop: -1, marginBottom: 16,
    width: 40, height: 24,
    backgroundColor: colors.bgRaise,
    borderWidth: 1, borderColor: colors.line,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    borderTopWidth: 0,
    alignItems: 'center', justifyContent: 'center',
  },

  selectedDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  selectedDayLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.text },
  clearDayBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.line },
  clearDayText: { fontFamily: fonts.sansBold, fontSize: 11.5, color: colors.textMute },

  // ── Section headers
  section: { marginBottom: 8 },
  sectionOverdue: {
    fontFamily: fonts.mono, fontSize: 10.5, color: colors.amber,
    letterSpacing: 1.4, textTransform: 'uppercase',
    marginBottom: 10, paddingHorizontal: 4,
  },
  sectionToday: {
    fontFamily: fonts.serifItalic, fontStyle: 'italic',
    fontSize: 20, lineHeight: 24, color: colors.text,
    letterSpacing: -0.2, marginBottom: 10, paddingHorizontal: 4,
  },
  sectionUpcoming: {
    fontFamily: fonts.mono, fontSize: 10.5, color: colors.textMute,
    letterSpacing: 1.4, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 10, paddingHorizontal: 4,
  },

  // ── Task card
  taskCard: {
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
    overflow: 'hidden',
  },
  taskCardExpanded: {
    backgroundColor: colors.bgMint,
    borderColor: 'rgba(92,138,92,0.25)',
  },
  taskCardAccentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: colors.leaf,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingLeft: 14,
  },
  taskThumb: {
    width: 44, height: 44,
    borderRadius: 10,
    backgroundColor: colors.bgSage,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  taskThumbImg: { width: 44, height: 44, borderRadius: 10 },
  taskCardBody: { flex: 1, minWidth: 0 },
  taskCardName: {
    fontFamily: fonts.serifItalic, fontStyle: 'italic',
    fontSize: 14, lineHeight: 18,
    color: colors.text, letterSpacing: -0.1,
    marginBottom: 4,
  },
  taskCardNameDone: { textDecorationLine: 'line-through', color: colors.textMute },
  taskCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  taskCardMetaLabel: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.textSoft },
  dueDateChip: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSage,
    borderWidth: 1, borderColor: colors.line,
  },
  dueDateChipOverdue: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberLine,
  },
  dueDateChipText: { fontFamily: fonts.sansBold, fontSize: 9.5, color: colors.textSoft, letterSpacing: 0.2 },
  dueDateChipTextOverdue: { color: colors.amberDeep },

  // ── Expanded panel
  taskCardPanel: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    gap: 10,
  },
  taskCardCareText: {
    fontFamily: fonts.sans, fontSize: 13, lineHeight: 19,
    color: colors.textSoft,
  },
  markDoneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 44,
    backgroundColor: colors.pine,
    borderRadius: radii.lg,
  },
  markDoneBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', letterSpacing: 0.2 },
  rescheduleLink: { alignItems: 'center', paddingVertical: 2 },
  rescheduleLinkText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.textMute },

  // ── No tasks / empty
  noTasksWrap: { paddingVertical: 32, alignItems: 'center' },
  noTasksText: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMute },
  emptyCard: {
    marginTop: 24, padding: 32, paddingHorizontal: 28,
    borderRadius: radii['2xl'],
    backgroundColor: colors.bgRaise,
    borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.bgSage,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fonts.serif, fontSize: 20, lineHeight: 24,
    color: colors.text, letterSpacing: -0.2, textAlign: 'center',
  },
  emptyTitleItalic: { fontFamily: fonts.serifItalic, fontStyle: 'italic' },
  emptyBody: {
    fontFamily: fonts.sans, fontSize: 13, color: colors.textSoft,
    textAlign: 'center', lineHeight: 19, marginTop: 8,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, height: 42, paddingHorizontal: 20,
    backgroundColor: colors.bgMint,
    borderWidth: 1, borderColor: 'rgba(92,138,92,0.4)',
    borderRadius: radii.xl,
  },
  emptyBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.pine },

  // ── Schedule sheet
  sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgRaise,
    borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet,
    paddingHorizontal: 24, paddingTop: 16,
    shadowColor: '#0F1A12', shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: -12 }, elevation: 12,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineSoft, alignSelf: 'center', marginBottom: 20 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontFamily: fonts.serifItalic, fontStyle: 'italic', fontSize: 22, color: colors.text, letterSpacing: -0.2 },
  sheetCloseBtn: { padding: 4 },
  sheetSection: { marginBottom: 18 },
  sheetSectionLabel: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMute, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },

  plantListScroll: { maxHeight: 192, marginTop: 2 },
  plantListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: radii.xl, borderWidth: 1, borderColor: 'transparent', marginBottom: 4,
  },
  plantListRowActive: { backgroundColor: colors.bgMint, borderColor: 'rgba(92,138,92,0.35)' },
  plantListIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.bgSage, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  plantListIconActive: { backgroundColor: colors.bgMint },
  plantListBody: { flex: 1, minWidth: 0 },
  plantListName: { fontFamily: fonts.serifItalic, fontStyle: 'italic', fontSize: 15, lineHeight: 19, color: colors.text, letterSpacing: -0.1 },
  plantListNameActive: { color: colors.pine },
  plantListSpecies: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.textMute, marginTop: 1 },

  plantPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 48, paddingHorizontal: 14,
    borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  plantPickerIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: colors.bgSage, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  plantPickerIconActive: { backgroundColor: colors.bgMint },
  plantPickerText: { flex: 1, fontFamily: fonts.serifItalic, fontStyle: 'italic', fontSize: 15, color: colors.text, letterSpacing: -0.1 },
  plantPickerPlaceholder: { fontFamily: fonts.sans, fontStyle: 'normal', color: colors.textMute },

  taskTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  taskTypeIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  taskTypeLabel: { flex: 1, fontFamily: fonts.sansBold, fontSize: 14, color: colors.text },

  toggle: { width: 42, height: 25, borderRadius: 13, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.lineSoft, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: colors.bgMint, borderColor: 'rgba(92,138,92,0.4)' },
  toggleThumb: { width: 17, height: 17, borderRadius: 9, backgroundColor: colors.textMute },
  toggleThumbOn: { backgroundColor: colors.pine, alignSelf: 'flex-end' },

  intervalLoading: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMute, paddingVertical: 10 },

  waterInputWrap: { gap: 6 },
  waterInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waterInput: {
    width: 80, height: 48,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    fontFamily: fonts.serif, fontSize: 22, color: colors.text,
    textAlign: 'center',
  },
  waterInputUnit: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textSoft },
  waterInputHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMute, paddingHorizontal: 2 },

  sheetSaveBtn: { height: 52, borderRadius: radii.xl, backgroundColor: colors.pine, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetSaveBtnDisabled: { backgroundColor: colors.bgAlt },
  sheetSaveBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff', letterSpacing: 0.2 },
});
