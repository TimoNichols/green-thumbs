import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, NativeViewGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

import { colors, fonts, radii } from '../utils/theme';
import { getHistory, deleteFromHistory, addToHistory } from '../utils/history';
import { getWishlist, addToWishlist, deleteFromWishlist } from '../utils/wishlist';
import { fetchCare } from '../utils/api';
import { getHomeEnvironment } from '../utils/homeEnvironment';
import { PlantPlaceholder } from './HomeScreen';
import * as Ico from '../components/Ico';

const FILTERS = ['All', 'Healthy', 'Flagged'];
const DELETE_W = 80;

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diffDays = Math.floor((Date.now() - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Swipeable row wrapper ────────────────────────────────────
function SwipeableRow({ children, onDelete, simultaneousHandlers }) {
  const tx = useSharedValue(0);
  const startX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .simultaneousWithExternalGesture(simultaneousHandlers)
    .activeOffsetX([-40, 40])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      startX.value = tx.value;
    })
    .onUpdate((e) => {
      tx.value = Math.min(0, Math.max(-DELETE_W, startX.value + e.translationX));
    })
    .onEnd((e) => {
      const farEnough = tx.value < -(DELETE_W / 2);
      const flick = e.translationX < -40 && e.velocityX < -500;
      tx.value = (farEnough || flick)
        ? withTiming(-DELETE_W, { duration: 180 })
        : withSpring(0, { damping: 20, stiffness: 200 });
    })
    .onFinalize((_, success) => {
      if (!success) {
        tx.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeDeleteBg}>
        <Pressable
          style={({ pressed }) => [styles.swipeDeleteBtn, pressed && { opacity: 0.75 }]}
          onPress={onDelete}
        >
          <Ico.Trash color="#fff" size={16} />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={animStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Plant row ────────────────────────────────────────────────
function PlantRow({ item, onPress, onMenuPress }) {
  const genus = item.species?.split(' ')[0] ?? item.common_name?.split(' ')[0] ?? 'Plant';
  const displayName = item.common_name || item.species || 'Unknown';
  const showBinomial = !!item.common_name && !!item.species;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.85 }]}
    >
      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.rowPhoto} contentFit="cover" />
      ) : (
        <PlantPlaceholder size={64} rx={14} label={genus.toUpperCase()} />
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
        {showBinomial && <Text style={styles.rowBinomial} numberOfLines={1}>{item.species}</Text>}
        <Text style={styles.rowDate}>{formatDate(item.timestamp)}</Text>
      </View>
      {item.symptom ? (
        <View style={styles.pillAmber}>
          <View style={styles.pillDot} />
          <Text style={styles.pillAmberText} numberOfLines={1}>{item.symptom}</Text>
        </View>
      ) : (
        <View style={styles.pillHealthy}>
          <View style={[styles.pillDot, styles.pillDotLeaf]} />
          <Text style={styles.pillHealthyText}>Healthy</Text>
        </View>
      )}
      <Pressable
        onPress={onMenuPress}
        hitSlop={8}
        style={({ pressed }) => [styles.rowMenuBtn, pressed && { opacity: 0.5 }]}
      >
        <Ico.More color={colors.textMute} size={16} />
      </Pressable>
    </Pressable>
  );
}

// ─── Wishlist row ─────────────────────────────────────────────
function WishlistRow({ item, onGotIt, onDelete, simultaneousHandlers }) {
  const genus = item.species?.split(' ')[0] ?? item.common_name?.split(' ')[0] ?? 'Plant';
  const displayName = item.common_name || item.species || 'Unknown';
  const showBinomial = !!item.common_name && !!item.species;

  return (
    <SwipeableRow onDelete={onDelete} simultaneousHandlers={simultaneousHandlers}>
      <View style={styles.rowCard}>
        <PlantPlaceholder size={64} rx={14} label={genus.toUpperCase()} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
          {showBinomial && <Text style={styles.rowBinomial} numberOfLines={1}>{item.species}</Text>}
          <Text style={styles.rowDate}>{formatDate(item.timestamp)}</Text>
        </View>
        <Pressable
          onPress={onGotIt}
          style={({ pressed }) => [styles.gotItBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.gotItText}>GOT IT</Text>
        </Pressable>
      </View>
    </SwipeableRow>
  );
}

// ─── Empty states ─────────────────────────────────────────────
function PlantsEmpty({ onScan }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconWrap}>
          <Ico.Leaf color={colors.pine} size={26} />
        </View>
        <Text style={styles.emptyTitle}>No plants yet</Text>
        <Text style={styles.emptyBody}>Scan a plant or tap + to add one manually</Text>
        <Pressable
          onPress={onScan}
          style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
        >
          <Ico.Scan color={colors.pine} size={16} />
          <Text style={styles.emptyBtnText}>Scan a plant</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WishlistEmpty() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconWrap}>
          <Ico.Bookmark color={colors.pine} size={24} />
        </View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyBody}>Plants you want to grow show up here. Tap + to add one.</Text>
      </View>
    </View>
  );
}

// ─── Add manually sheet ───────────────────────────────────────
function AddManuallySheet({ visible, tab, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [destination, setDestination] = useState(tab);
  const [carePreview, setCarePreview] = useState(null);
  const [careLoading, setCareLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setDestination(tab);
    } else {
      setCarePreview(null);
      setCareLoading(false);
    }
  }, [visible, tab]);

  async function handleGetCare() {
    const s = species.trim();
    if (!s) return;
    setCareLoading(true);
    setCarePreview(null);
    try {
      const homeEnv = await getHomeEnvironment();
      const env = (homeEnv.humidity || homeEnv.light || homeEnv.temperature) ? homeEnv : null;
      const data = await fetchCare(s, env);
      setCarePreview(data);
      if (data.common_name && !name.trim()) setName(data.common_name);
    } catch (e) {
      Alert.alert('Could not fetch care data', e.message || 'Check your connection and try again.');
    } finally {
      setCareLoading(false);
    }
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const plantData = { common_name: trimmed, species: species.trim() || null };
    if (carePreview) {
      const { source: _src, ...care } = carePreview;
      Object.assign(plantData, care);
    }
    onSave(plantData, destination);
    setName('');
    setSpecies('');
    setCarePreview(null);
    onClose();
  }

  const careReady = !!species.trim() && !careLoading;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 28) }]}>
          <View style={styles.sheetHandle} />

          <View style={[styles.segControl, { marginHorizontal: 0, marginBottom: 20 }]}>
            <Pressable
              onPress={() => setDestination('plants')}
              style={[styles.segItem, destination === 'plants' && styles.segItemActive]}
            >
              <Text style={[styles.segText, destination === 'plants' && styles.segTextActive]}>
                My Plants
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDestination('wishlist')}
              style={[styles.segItem, destination === 'wishlist' && styles.segItemActive]}
            >
              <Text style={[styles.segText, destination === 'wishlist' && styles.segTextActive]}>
                Wishlist
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sheetTitle}>Add plant</Text>

          <TextInput
            style={styles.input}
            placeholder="Common name"
            placeholderTextColor={colors.textMute}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
            autoCapitalize="words"
          />

          {/* Species row + Get care details button */}
          <View style={styles.speciesRow}>
            <TextInput
              style={[styles.input, styles.speciesInput]}
              placeholder="Latin name e.g. Monstera deliciosa"
              placeholderTextColor={colors.textMute}
              value={species}
              onChangeText={(t) => { setSpecies(t); if (carePreview) setCarePreview(null); }}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoCapitalize="words"
            />
            <Pressable
              onPress={handleGetCare}
              disabled={!careReady}
              style={({ pressed }) => [
                styles.getCareBtn,
                !careReady && styles.getCareBtnDisabled,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ico.Leaf color={careReady ? colors.pine : colors.textMute} size={14} />
              <Text style={[styles.getCareBtnText, !careReady && styles.getCareBtnTextDisabled]}>
                {careLoading ? 'Loading…' : 'Get care'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.speciesHint}>Use the scientific name for accurate care details</Text>

          {/* Care preview card */}
          {carePreview && (
            <View style={styles.carePreview}>
              <View style={styles.carePreviewTop}>
                <Text style={styles.carePreviewName} numberOfLines={1}>
                  {carePreview.common_name || species}
                </Text>
                {carePreview.difficulty && (
                  <View style={[
                    styles.carePreviewDiff,
                    carePreview.difficulty === 'easy' ? styles.diffEasy :
                    carePreview.difficulty === 'hard' ? styles.diffHard : styles.diffMed,
                  ]}>
                    <Text style={[
                      styles.carePreviewDiffText,
                      carePreview.difficulty === 'easy' ? { color: colors.pine } :
                      carePreview.difficulty === 'hard' ? { color: '#fff' } :
                      { color: colors.amberDeep },
                    ]}>
                      {carePreview.difficulty.charAt(0).toUpperCase() + carePreview.difficulty.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.carePreviewDetails}>
                {carePreview.water && (
                  <View style={styles.carePreviewItem}>
                    <Ico.Drop color={colors.pine} size={12} />
                    <Text style={styles.carePreviewItemText} numberOfLines={1}>{carePreview.water}</Text>
                  </View>
                )}
                {carePreview.sunlight && (
                  <View style={styles.carePreviewItem}>
                    <Ico.Sun color={colors.amber} size={12} />
                    <Text style={styles.carePreviewItemText} numberOfLines={1}>{carePreview.sunlight}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <Pressable
            onPress={handleSave}
            disabled={!name.trim()}
            style={({ pressed }) => [
              styles.sheetSaveBtn,
              !name.trim() && styles.sheetSaveBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.sheetSaveBtnText}>
              {destination === 'wishlist' ? 'Add to Wishlist' : 'Add to My Plants'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────
export default function MyPlantsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('plants');
  const [items, setItems] = useState([]);
  const [wishlist, setWishlistItems] = useState([]);
  const [filter, setFilter] = useState('All');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const flatListRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      setReloadKey((k) => k + 1);
      getHistory().then(setItems);
      getWishlist().then(setWishlistItems);
    }, [])
  );

  const filtered =
    filter === 'Healthy' ? items.filter((i) => !i.symptom) :
    filter === 'Flagged'  ? items.filter((i) => !!i.symptom) :
    items;

  async function handleDeletePlant(id, photoUri) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteFromHistory(id, photoUri);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleDeleteWishlist(id) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteFromWishlist(id);
    setWishlistItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleGotIt(item) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { id, ...plantData } = item;
    const plant = await addToHistory({ ...plantData, source: 'manual' });
    await deleteFromWishlist(id);
    setWishlistItems((prev) => prev.filter((i) => i.id !== id));
    if (plant) setItems((prev) => [plant, ...prev]);
  }

  async function handleAddSave(data, destination) {
    if (destination === 'wishlist') {
      const entry = await addToWishlist(data);
      if (entry) setWishlistItems((prev) => [entry, ...prev]);
    } else {
      const entry = await addToHistory({ ...data, source: 'manual' });
      if (entry) setItems((prev) => [entry, ...prev]);
    }
  }

  const topPad = Math.max(56, insets.top + 8);
  const listData = tab === 'plants' ? filtered : wishlist;
  const count = tab === 'plants' ? items.length : wishlist.length;
  const countLabel = tab === 'wishlist'
    ? `${count} ${count === 1 ? 'plant' : 'plants'} on wishlist`
    : `${count} ${count === 1 ? 'plant' : 'plants'}`;

  const ListHeader = (
    <View>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerMeta}>My Plants</Text>
            <Text style={styles.headerTitle}>
              <Text style={styles.headerItalic}>Your</Text>
              {' plants'}
            </Text>
            <Text style={styles.headerCount}>{countLabel}</Text>
          </View>
          <Pressable
            onPress={() => setShowAddSheet(true)}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          >
            <Ico.Plus color={colors.pine} size={18} />
          </Pressable>
        </View>
      </View>

      {/* ── Segmented control ───────────────────────────── */}
      <View style={styles.segControl}>
        <Pressable
          onPress={() => setTab('plants')}
          style={[styles.segItem, tab === 'plants' && styles.segItemActive]}
        >
          <Text style={[styles.segText, tab === 'plants' && styles.segTextActive]}>Plants</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('wishlist')}
          style={[styles.segItem, tab === 'wishlist' && styles.segItemActive]}
        >
          <Text style={[styles.segText, tab === 'wishlist' && styles.segTextActive]}>Wishlist</Text>
        </Pressable>
      </View>

      {/* ── Filter chips (plants tab only) ──────────────── */}
      {tab === 'plants' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {FILTERS.map((f) => {
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
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <NativeViewGestureHandler ref={flatListRef}>
        <FlatList
          data={listData}
          keyExtractor={(item) => `${reloadKey}-${item.id}`}
          renderItem={({ item }) =>
            tab === 'plants' ? (
              <SwipeableRow
                onDelete={() => handleDeletePlant(item.id, item.photoUri)}
                simultaneousHandlers={flatListRef}
              >
                <PlantRow
                  item={item}
                  onPress={() => navigation.navigate('Report', { report: item })}
                  onMenuPress={() => Alert.alert(
                    item.common_name || item.species || 'Plant',
                    undefined,
                    [
                      {
                        text: 'Delete plant',
                        style: 'destructive',
                        onPress: () => handleDeletePlant(item.id, item.photoUri),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ],
                  )}
                />
              </SwipeableRow>
            ) : (
              <WishlistRow
                item={item}
                onGotIt={() => handleGotIt(item)}
                onDelete={() => handleDeleteWishlist(item.id)}
                simultaneousHandlers={flatListRef}
              />
            )
          }
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            tab === 'plants'
              ? <PlantsEmpty onScan={() => navigation.getParent()?.navigate('Camera')} />
              : <WishlistEmpty />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </NativeViewGestureHandler>

      <AddManuallySheet
        visible={showAddSheet}
        tab={tab}
        onClose={() => setShowAddSheet(false)}
        onSave={handleAddSave}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingBottom: 140 },

  // ── Header
  header: { paddingHorizontal: 24, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
    marginBottom: 6,
  },
  headerItalic: { fontFamily: fonts.serifItalic, fontStyle: 'italic' },
  headerCount: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMute },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  // ── Segmented control
  segControl: {
    flexDirection: 'row',
    backgroundColor: colors.bgAlt,
    borderRadius: radii.pill,
    padding: 3,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  segItem: {
    flex: 1,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segItemActive: {
    backgroundColor: colors.bgRaise,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.textMute },
  segTextActive: { color: colors.text },

  // ── Filter chips
  filterScroll: { marginBottom: 12 },
  filterRow: { gap: 8, paddingHorizontal: 24, paddingVertical: 4 },
  filterChip: {
    height: 32,
    paddingHorizontal: 14,
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
  filterChipText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.textMute },
  filterChipTextActive: { color: colors.pine },

  // ── Swipeable row
  swipeContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  swipeDeleteBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_W,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteBtn: { alignItems: 'center', gap: 4 },
  swipeDeleteText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#fff' },

  // ── Plant / wishlist row card
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  rowPhoto: { width: 64, height: 64, borderRadius: 14, flexShrink: 0 },
  rowMenuBtn: { padding: 4, marginLeft: 4, flexShrink: 0 },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
    justifyContent: 'center',
  },
  rowName: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
    letterSpacing: -0.1,
  },
  rowBinomial: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMute,
    marginTop: 2,
  },
  rowDate: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMute,
    marginTop: 4,
  },

  // ── Status pills
  pillAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberLine,
    flexShrink: 0,
    marginLeft: 8,
    maxWidth: 96,
  },
  pillAmberText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    color: colors.amberDeep,
    flexShrink: 1,
  },
  pillHealthy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.35)',
    flexShrink: 0,
    marginLeft: 8,
  },
  pillHealthyText: { fontFamily: fonts.sansBold, fontSize: 10.5, color: colors.pine },
  pillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.amber,
    flexShrink: 0,
  },
  pillDotLeaf: { backgroundColor: colors.leaf },

  // ── GOT IT button
  gotItBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.35)',
    flexShrink: 0,
    marginLeft: 8,
  },
  gotItText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.pine,
    letterSpacing: 0.6,
  },

  // ── Empty states
  emptyWrap: { paddingHorizontal: 16, paddingTop: 24 },
  emptyCard: {
    padding: 36,
    paddingHorizontal: 28,
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: radii['2xl'],
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
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
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
  emptyBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.pine },

  // ── Add manually sheet
  sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgRaise,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: 24,
    paddingTop: 16,
    shadowColor: '#0F1A12',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineSoft,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 22,
    color: colors.text,
    marginBottom: 20,
    letterSpacing: -0.2,
  },
  input: {
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  sheetSaveBtn: {
    height: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sheetSaveBtnDisabled: { backgroundColor: colors.bgAlt },
  sheetSaveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
  },

  // ── Species row + Get care button
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  speciesInput: {
    flex: 1,
    marginBottom: 0,
  },
  getCareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.35)',
    flexShrink: 0,
  },
  getCareBtnDisabled: {
    backgroundColor: colors.bgAlt,
    borderColor: colors.lineSoft,
    opacity: 0.55,
  },
  getCareBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.pine,
  },
  getCareBtnTextDisabled: {
    color: colors.textMute,
  },
  speciesHint: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.textMute,
    marginTop: -6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  // ── Care preview card
  carePreview: {
    backgroundColor: colors.bgMint,
    borderWidth: 1,
    borderColor: 'rgba(92,138,92,0.35)',
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  carePreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carePreviewName: {
    flex: 1,
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.text,
    letterSpacing: -0.1,
  },
  carePreviewDiff: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  diffEasy: { backgroundColor: colors.bgMint, borderColor: 'rgba(92,138,92,0.35)' },
  diffMed:  { backgroundColor: colors.amberSoft, borderColor: colors.amberLine },
  diffHard: { backgroundColor: colors.danger, borderColor: colors.danger },
  carePreviewDiffText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
  carePreviewDetails: {
    gap: 4,
  },
  carePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carePreviewItemText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSoft,
  },
});
