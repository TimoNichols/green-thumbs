import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '../utils/theme';
import { getHistory, deleteFromHistory } from '../utils/history';
import { PlantPlaceholder } from './HomeScreen';
import * as Ico from '../components/Ico';

const FILTERS = ['All', 'Healthy', 'Flagged'];

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const diffDays = Math.floor((Date.now() - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Plant row ────────────────────────────────────────────────
function PlantRow({ item, isLongPressed, onPress, onLongPress, onDelete }) {
  const genus = item.species?.split(' ')[0] ?? 'Plant';
  const displayName = item.common_name || item.species || 'Unknown';
  // Only show binomial on second line when there is a distinct common name
  const showBinomial = !!item.common_name && !!item.species;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.rowCard,
        isLongPressed && styles.rowCardActive,
        pressed && !isLongPressed && { opacity: 0.85 },
      ]}
    >
      {/* Left: plant photo or striped placeholder */}
      {item.photoUri ? (
        <Image
          source={{ uri: item.photoUri }}
          style={styles.rowPhoto}
          contentFit="cover"
        />
      ) : (
        <PlantPlaceholder size={64} rx={14} label={genus.toUpperCase()} />
      )}

      {/* Middle: names + date */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
        {showBinomial && (
          <Text style={styles.rowBinomial} numberOfLines={1}>{item.species}</Text>
        )}
        <Text style={styles.rowDate}>{formatDate(item.timestamp)}</Text>
      </View>

      {/* Right: delete button (long-pressed) or status pill */}
      {isLongPressed ? (
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.85 }]}
        >
          <Ico.Trash color="#fff" size={14} />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      ) : item.symptom ? (
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
    </Pressable>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function EmptyState({ onScan }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconWrap}>
          <Ico.Leaf color={colors.pine} size={26} />
        </View>
        <Text style={styles.emptyTitle}>No plants yet</Text>
        <Text style={styles.emptyBody}>Scan a plant to get started</Text>
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

// ─── Screen ───────────────────────────────────────────────────
export default function MyPlantsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('All');
  const [longPressedId, setLongPressedId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setItems);
      // Dismiss any open delete button when navigating back to this tab
      setLongPressedId(null);
    }, [])
  );

  const filtered =
    filter === 'Healthy' ? items.filter((i) => !i.symptom) :
    filter === 'Flagged' ? items.filter((i) => !!i.symptom) :
    items;

  async function handleDelete(id) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteFromHistory(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setLongPressedId(null);
  }

  function handleRowPress(item) {
    if (longPressedId === item.id) {
      setLongPressedId(null);
      return;
    }
    setLongPressedId(null);
    navigation.navigate('Report', { report: item });
  }

  async function handleRowLongPress(item) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLongPressedId(item.id);
  }

  const topPad = Math.max(56, insets.top + 8);
  const count = items.length;
  const countLabel = `${count} ${count === 1 ? 'plant' : 'plants'}`;

  const ListHeader = (
    <View>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.headerMeta}>My Plants</Text>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerItalic}>Your</Text>
          {' plants'}
        </Text>
        <Text style={styles.headerCount}>{countLabel}</Text>
      </View>

      {/* ── Filter chips ────────────────────────────────── */}
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
              onPress={() => { setFilter(f); setLongPressedId(null); }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlantRow
            item={item}
            isLongPressed={longPressedId === item.id}
            onPress={() => handleRowPress(item)}
            onLongPress={() => handleRowLongPress(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState onScan={() => navigation.getParent()?.navigate('Camera')} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setLongPressedId(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: 140,
  },

  // ── Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  headerItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  headerCount: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMute,
  },

  // ── Filter chips
  filterScroll: {
    marginBottom: 12,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
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
  filterChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.textMute,
  },
  filterChipTextActive: {
    color: colors.pine,
  },

  // ── Plant row
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgRaise,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    gap: 0,
  },
  rowCardActive: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  rowPhoto: {
    width: 64,
    height: 64,
    borderRadius: 14,
    flexShrink: 0,
  },
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
    letterSpacing: 0,
  },
  rowDate: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMute,
    marginTop: 4,
  },

  // ── Delete button (long press reveal)
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.danger,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
    marginLeft: 8,
  },
  deleteBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.2,
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
  pillHealthyText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    color: colors.pine,
  },
  pillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.amber,
    flexShrink: 0,
  },
  pillDotLeaf: {
    backgroundColor: colors.leaf,
  },

  // ── Empty state
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
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
  emptyBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.pine,
  },
});
