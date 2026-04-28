import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, gradients } from '../utils/theme';
import { getHistory, deleteFromHistory } from '../utils/history';
import { PlantPlaceholder } from './HomeScreen';
import * as Ico from '../components/Ico';

const SPRING = { damping: 20, stiffness: 200, mass: 0.8 };
const FILTERS = ['All', 'Healthy', 'Flagged'];

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const diffDays = Math.floor((Date.now() - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Swipeable row ────────────────────────────────────────────
function SwipeableRow({ id, swipedId, onSwipeOpen, onDelete, deleteLabel = 'Delete', children }) {
  const tx = useSharedValue(0);

  useEffect(() => {
    if (swipedId !== id) {
      tx.value = withSpring(0, SPRING);
    }
  }, [swipedId]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate(e => {
      tx.value = Math.min(0, Math.max(-100, e.translationX));
    })
    .onEnd(e => {
      if (e.translationX < -50) {
        tx.value = withSpring(-92, SPRING);
        runOnJS(onSwipeOpen)(id);
      } else {
        tx.value = withSpring(0, SPRING);
        runOnJS(onSwipeOpen)(null);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View style={styles.swipeWrap}>
      <View style={styles.deleteUnderlay}>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Ico.Trash color="#fff" size={18} />
          <Text style={styles.deleteBtnText}>{deleteLabel}</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={animStyle}>
          {children}
        </ReAnimated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function EmptyState({ title, body, cta, onCta }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ico.Leaf color={colors.pine} size={24} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <Pressable onPress={onCta} style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}>
        <Text style={styles.emptyBtnText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

// ─── Chip row (water / light selectors in AddManually) ────────
function ChipRow({ options, labels, value, onChange, style }) {
  return (
    <View style={[styles.chipRowWrap, style]}>
      {options.map(o => {
        const active = value === o;
        const label = labels[o] ?? o ?? '—';
        return (
          <Pressable
            key={o || 'none'}
            onPress={() => onChange(o)}
            style={[styles.knowChip, active && styles.knowChipActive]}
          >
            <Text style={[styles.knowChipText, active && styles.knowChipTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Add Manually sheet ───────────────────────────────────────
function AddManuallySheet({ defaultTarget = 'plants', onClose, onSubmit }) {
  const [target, setTarget] = useState(defaultTarget);
  const [name, setName] = useState('');
  const [common, setCommon] = useState('');
  const [water, setWater] = useState('');
  const [light, setLight] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('Medium');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
      easing: Easing.bezier(0.2, 0.9, 0.25, 1),
    }).start();
  }, []);

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }

  const canSubmit = name.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      target,
      name: name.trim(),
      common: common.trim() || '—',
      water: water || null,
      light: light || null,
      note: note.trim() || null,
      priority,
    });
  }

  const sheetTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [700, 0],
  });
  const scrimOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.sheetOverlay} pointerEvents="box-none">
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
        pointerEvents="auto"
      >
        <View style={styles.grip} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetMetaLabel}>No scan needed</Text>
                <Text style={styles.sheetTitle}>
                  Add{' '}
                  <Text style={styles.sheetTitleItalic}>manually</Text>
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.sheetCloseBtn, pressed && { opacity: 0.7 }]}
              >
                <Ico.Close color={colors.text} size={18} />
              </Pressable>
            </View>

            {/* Where to save */}
            <Text style={styles.fieldLabel}>Where to save</Text>
            <View style={styles.segControl}>
              {[{ id: 'plants', label: 'My plants' }, { id: 'wishlist', label: 'Wishlist' }].map(opt => {
                const active = target === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setTarget(opt.id)}
                    style={[styles.segPill, active && styles.segPillActive]}
                  >
                    <Text style={[styles.segPillText, active && styles.segPillTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Plant name */}
            <Text style={styles.fieldLabel}>
              Plant name{' '}
              <Text style={styles.fieldRequired}>required</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Monstera deliciosa"
              placeholderTextColor={colors.textMute}
              style={[styles.textInput, styles.textInputSerif]}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Common name */}
            <Text style={styles.fieldLabel}>
              Common name{' '}
              <Text style={styles.fieldOptional}>optional</Text>
            </Text>
            <TextInput
              value={common}
              onChangeText={setCommon}
              placeholder="e.g. Swiss cheese plant"
              placeholderTextColor={colors.textMute}
              style={styles.textInput}
            />

            {target === 'plants' ? (
              <>
                <Text style={styles.fieldLabel}>
                  What you know{' '}
                  <Text style={styles.fieldOptional}>optional</Text>
                </Text>
                <ChipRow
                  options={['', 'Low', 'Medium', 'High']}
                  labels={{ '': 'Water —', Low: 'Low water', Medium: 'Med water', High: 'High water' }}
                  value={water}
                  onChange={setWater}
                />
                <ChipRow
                  options={['', 'Low', 'Bright indirect', 'Direct']}
                  labels={{ '': 'Light —', Low: 'Low light', 'Bright indirect': 'Bright indirect', Direct: 'Direct sun' }}
                  value={light}
                  onChange={setLight}
                  style={{ marginTop: 8 }}
                />
                <View style={styles.infoBanner}>
                  <Ico.Leaf color={colors.pine} size={16} />
                  <Text style={styles.infoBannerText}>
                    Adding what you already know means we won't query the AI for this plant unless you ask for a diagnosis later.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {['Low', 'Medium', 'High'].map(p => {
                    const active = priority === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setPriority(p)}
                        style={[styles.priorityBtn, active && styles.priorityBtnActive]}
                      >
                        <Text style={[styles.priorityBtnText, active && styles.priorityBtnTextActive]}>
                          {p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.fieldLabel}>
                  Note{' '}
                  <Text style={styles.fieldOptional}>optional</Text>
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Saw at the nursery"
                  placeholderTextColor={colors.textMute}
                  style={styles.textInput}
                />
              </>
            )}

            {/* Footer */}
            <View style={styles.sheetFooter}>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [styles.submitBtnWrap, pressed && canSubmit && { opacity: 0.9 }]}
              >
                <LinearGradient
                  colors={canSubmit ? gradients.cta : ['rgba(31,58,40,0.12)', 'rgba(31,58,40,0.12)']}
                  style={styles.submitBtn}
                >
                  <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
                    {target === 'plants' ? 'Add to my plants' : 'Add to wishlist'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────
export default function MyPlantsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('plants');
  const [items, setItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [filter, setFilter] = useState('All');
  const [swipedId, setSwipedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addTarget, setAddTarget] = useState('plants');

  // Track manually added plant rows so they survive re-focus reloads
  const manualRef = useRef([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(history => {
        setItems([...manualRef.current, ...history]);
      });
    }, [])
  );

  const filtered = useMemo(() => {
    if (tab !== 'plants') return items;
    if (filter === 'Healthy') return items.filter(i => !i.symptom);
    if (filter === 'Flagged') return items.filter(i => !!i.symptom);
    return items;
  }, [items, filter, tab]);

  function handleAdd(entry) {
    if (entry.target === 'plants') {
      const newItem = {
        id: 'p' + Date.now(),
        species: entry.name,
        common_name: entry.common,
        timestamp: new Date().toISOString(),
        symptom: null,
        confidence: null,
        manual: true,
        water: entry.water || null,
        sunlight: entry.light || null,
      };
      manualRef.current = [newItem, ...manualRef.current];
      setItems(prev => [newItem, ...prev]);
      setTab('plants');
    } else {
      setWishlist(prev => [
        { id: 'w' + Date.now(), ...entry, priority: entry.priority || 'Medium' },
        ...prev,
      ]);
      setTab('wishlist');
    }
    setShowAdd(false);
  }

  function removePlant(id) {
    const item = items.find(i => i.id === id);
    if (item && !item.manual) deleteFromHistory(id);
    manualRef.current = manualRef.current.filter(i => i.id !== id);
    setItems(prev => prev.filter(i => i.id !== id));
    setSwipedId(null);
  }

  function removeWish(id) {
    setWishlist(prev => prev.filter(i => i.id !== id));
    setSwipedId(null);
  }

  function gotIt(id) {
    const w = wishlist.find(i => i.id === id);
    if (!w) return;
    const newItem = {
      id: 'p' + Date.now(),
      species: w.name,
      common_name: w.common || w.common_name || '—',
      timestamp: new Date().toISOString(),
      symptom: null,
      confidence: null,
      manual: true,
    };
    manualRef.current = [newItem, ...manualRef.current];
    setWishlist(prev => prev.filter(i => i.id !== id));
    setItems(prev => [newItem, ...prev]);
    setTab('plants');
    setSwipedId(null);
  }

  function handleRowPress(item) {
    if (swipedId === item.id) {
      setSwipedId(null);
      return;
    }
    setSwipedId(null);
    if (!item.manual) navigation.navigate('Report', { report: item });
  }

  const topPad = Math.max(56, insets.top + 8);
  const headerCount = tab === 'plants' ? items.length : wishlist.length;
  const headerMetaLabel = tab === 'plants'
    ? `Saved · ${items.length} ${items.length === 1 ? 'plant' : 'plants'}`
    : `Wishlist · ${wishlist.length} ${wishlist.length === 1 ? 'plant' : 'plants'}`;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setSwipedId(null)}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ───────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerMeta}>{headerMetaLabel}</Text>
            <Text style={styles.headerTitle}>
              {tab === 'plants'
                ? <><Text style={styles.italic}>My</Text>{' plants'}</>
                : <><Text style={styles.italic}>Wish</Text>{'list'}</>
              }
            </Text>
          </View>
          <View style={styles.headerBtns}>
            <Pressable
              onPress={() => { setAddTarget(tab); setShowAdd(true); }}
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
            >
              <Ico.Plus color={colors.text} size={22} />
            </Pressable>
            <Pressable
              onPress={() => navigation.getParent()?.navigate('Camera')}
              style={({ pressed }) => [styles.headerScanBtn, pressed && { opacity: 0.85 }]}
            >
              <Ico.Scan color="#FBFAF3" size={22} />
            </Pressable>
          </View>
        </View>

        {/* ── Segmented control ────────────────────────────── */}
        <View style={styles.segContainer}>
          {[
            { id: 'plants',   label: 'Plants',   count: items.length },
            { id: 'wishlist', label: 'Wishlist', count: wishlist.length, icon: true },
          ].map(s => {
            const active = tab === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => { setTab(s.id); setSwipedId(null); }}
                style={[styles.segTab, active && styles.segTabActive]}
              >
                {s.icon && <Ico.Bookmark color={active ? colors.bg : colors.textSoft} size={14} />}
                <Text style={[styles.segTabText, active && styles.segTabTextActive]}>
                  {s.label}
                </Text>
                <Text style={[styles.segTabCount, active && styles.segTabCountActive]}>
                  {s.count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Filter chips (Plants only) ───────────────────── */}
        {tab === 'plants' && (
          <View style={styles.filterRow}>
            {FILTERS.map(f => {
              const active = f === filter;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Plants list ──────────────────────────────────── */}
        {tab === 'plants' && (
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <EmptyState
                title="No plants yet"
                body="Scan one with the camera, or add manually if you already know the species."
                cta="Add a plant"
                onCta={() => { setAddTarget('plants'); setShowAdd(true); }}
              />
            ) : (
              <>
                {filtered.map(item => {
                  const genus = item.species?.split(' ')[0] ?? item.species ?? 'Plant';
                  const displayDate = item.date || formatDate(item.timestamp);
                  return (
                    <SwipeableRow
                      key={item.id}
                      id={item.id}
                      swipedId={swipedId}
                      onSwipeOpen={setSwipedId}
                      onDelete={() => removePlant(item.id)}
                      deleteLabel="Delete"
                    >
                      <Pressable
                        onPress={() => handleRowPress(item)}
                        style={({ pressed }) => [styles.plantRow, pressed && { opacity: 0.85 }]}
                      >
                        <PlantPlaceholder size={56} rx={14} label={genus.toUpperCase()} />
                        <View style={styles.rowInfo}>
                          <Text style={styles.rowSpecies} numberOfLines={1}>{item.species}</Text>
                          <Text style={styles.rowCommon} numberOfLines={1}>
                            {item.common_name || '—'}
                          </Text>
                          <View style={styles.rowMeta}>
                            <Text style={styles.rowDate}>{displayDate.toUpperCase()}</Text>
                            {item.manual ? (
                              <View style={[styles.statusChip, styles.statusManual]}>
                                <Text style={[styles.statusChipText, { color: colors.textSoft }]}>
                                  Manual
                                </Text>
                              </View>
                            ) : item.symptom ? (
                              <View style={[styles.statusChip, styles.statusSymptom]}>
                                <View style={styles.statusDotAmber} />
                                <Text style={[styles.statusChipText, { color: colors.amberDeep }]}>
                                  {item.symptom}
                                </Text>
                              </View>
                            ) : (
                              <View style={[styles.statusChip, styles.statusHealthy]}>
                                <View style={styles.statusDotLeaf} />
                                <Text style={[styles.statusChipText, { color: colors.pine }]}>
                                  Healthy
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {!item.manual && <Ico.Chevron color={colors.textMute} size={18} />}
                      </Pressable>
                    </SwipeableRow>
                  );
                })}
                <Text style={styles.swipeHint}>← swipe to delete</Text>
              </>
            )}
          </View>
        )}

        {/* ── Wishlist ─────────────────────────────────────── */}
        {tab === 'wishlist' && (
          <View style={styles.list}>
            {wishlist.length === 0 ? (
              <EmptyState
                title="Your wishlist is empty"
                body="Save plants you're hunting for. We won't scan or query — just keep the list for you."
                cta="Add to wishlist"
                onCta={() => { setAddTarget('wishlist'); setShowAdd(true); }}
              />
            ) : (
              <>
                {wishlist.map(item => {
                  const priorityStyle = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.Medium;
                  return (
                    <SwipeableRow
                      key={item.id}
                      id={item.id}
                      swipedId={swipedId}
                      onSwipeOpen={setSwipedId}
                      onDelete={() => removeWish(item.id)}
                      deleteLabel="Remove"
                    >
                      <View style={styles.plantRow}>
                        <View style={styles.wishIconTile}>
                          <Ico.Bookmark color={colors.pine} size={22} />
                        </View>
                        <View style={styles.rowInfo}>
                          <Text style={styles.rowSpecies} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.rowCommon} numberOfLines={1}>
                            {item.common || '—'}
                          </Text>
                          <View style={styles.rowMeta}>
                            <View style={[styles.statusChip, { backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }]}>
                              <Text style={[styles.statusChipText, { color: priorityStyle.text }]}>
                                {item.priority} priority
                              </Text>
                            </View>
                            {item.note ? (
                              <Text style={styles.wishNote} numberOfLines={1}>"{item.note}"</Text>
                            ) : null}
                          </View>
                        </View>
                        <Pressable
                          onPress={() => gotIt(item.id)}
                          style={({ pressed }) => [styles.gotItBtn, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={styles.gotItText}>GOT IT</Text>
                        </Pressable>
                      </View>
                    </SwipeableRow>
                  );
                })}
                <Text style={styles.swipeHint}>tap "Got it" to move into your plants</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Add Manually sheet ───────────────────────────────── */}
      {showAdd && (
        <AddManuallySheet
          defaultTarget={addTarget}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </View>
  );
}

const PRIORITY_STYLES = {
  High:   { bg: colors.amberSoft,  border: colors.amberLine,              text: colors.amberDeep },
  Medium: { bg: colors.bgSage,     border: 'rgba(143,169,136,0.4)',        text: colors.pine },
  Low:    { bg: colors.bgRaise,    border: colors.line,                    text: colors.textSoft },
};

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 140 },
  italic: { fontFamily: fonts.serifItalic, fontStyle: 'italic' },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
    marginBottom: 18,
  },
  headerMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 36,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerScanBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.leaf,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  // ── Segmented control
  segContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    padding: 4,
    borderRadius: radii.xl,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  segTab: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
  segTabActive: {
    backgroundColor: colors.text,
  },
  segTabText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.textSoft,
  },
  segTabTextActive: {
    color: colors.bg,
  },
  segTabCount: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    opacity: 0.65,
  },
  segTabCountActive: {
    color: colors.bg,
  },

  // ── Filter chips
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  filterChip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.bgMint,
    borderColor: 'rgba(92,138,92,0.35)',
  },
  filterChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 11.5,
    color: colors.textMute,
  },
  filterChipTextActive: {
    color: colors.pine,
  },

  // ── List
  list: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  swipeHint: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    opacity: 0.65,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Swipeable row
  swipeWrap: {
    position: 'relative',
    borderRadius: 14,
    marginBottom: 6,
    overflow: 'hidden',
  },
  deleteUnderlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 92,
    backgroundColor: colors.danger,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: '#fff',
  },

  // ── Plant row
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowSpecies: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 16,
    color: colors.text,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  rowCommon: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    color: colors.textSoft,
    marginTop: 3,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  rowDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 0.6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusManual: {
    backgroundColor: colors.bgSage,
    borderColor: 'rgba(143,169,136,0.4)',
  },
  statusSymptom: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberLine,
  },
  statusHealthy: {
    backgroundColor: colors.bgMint,
    borderColor: 'rgba(92,138,92,0.3)',
  },
  statusChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
  },
  statusDotAmber: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.amber,
  },
  statusDotLeaf: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.leaf,
  },

  // ── Wishlist row extras
  wishIconTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.bgSage,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wishNote: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.textMute,
    fontStyle: 'italic',
    flex: 1,
  },
  gotItBtn: {
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gotItText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    color: colors.pine,
    letterSpacing: 0.4,
  },

  // ── Empty state
  emptyCard: {
    margin: 12,
    padding: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 8,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 16,
    height: 40,
    paddingHorizontal: 20,
    backgroundColor: colors.text,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.bg,
  },

  // ── AddManually sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,26,18,0.45)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    shadowColor: '#0F1A12',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 20,
  },
  grip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetContent: {
    padding: 22,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetMetaLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sheetTitle: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sheetTitleItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // ── Sheet fields
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  fieldRequired: {
    fontFamily: fonts.sans,
    color: colors.amber,
    textTransform: 'none',
    letterSpacing: 0,
  },
  fieldOptional: {
    fontFamily: fonts.sans,
    color: colors.textMute,
    textTransform: 'none',
    letterSpacing: 0,
    opacity: 0.7,
  },
  textInput: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
  },
  textInputSerif: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 17,
  },
  segControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segPill: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segPillActive: {
    backgroundColor: colors.text,
  },
  segPillText: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: colors.textSoft,
  },
  segPillTextActive: {
    color: colors.bg,
  },
  chipRowWrap: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  knowChip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knowChipActive: {
    backgroundColor: colors.bgMint,
    borderColor: 'rgba(92,138,92,0.4)',
  },
  knowChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.textSoft,
  },
  knowChipTextActive: {
    color: colors.pine,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.bgSage,
    borderWidth: 1,
    borderColor: 'rgba(143,169,136,0.4)',
    borderRadius: 10,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.pine,
    lineHeight: 16,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBtnActive: {
    backgroundColor: colors.text,
    borderWidth: 0,
  },
  priorityBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: colors.textSoft,
  },
  priorityBtnTextActive: {
    color: colors.bg,
  },

  // ── Sheet footer
  sheetFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textSoft,
  },
  submitBtnWrap: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FBFAF3',
    letterSpacing: 0.3,
  },
  submitBtnTextDisabled: {
    color: colors.textMute,
  },
});
