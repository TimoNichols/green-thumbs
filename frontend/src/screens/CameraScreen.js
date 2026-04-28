import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';

import { colors, fonts, radii } from '../utils/theme';
import * as Ico from '../components/Ico';

const SYMPTOMS = ['None', 'Yellow edges', 'Brown tips', 'Drooping', 'Spots'];

export default function CameraScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [symptom, setSymptom] = useState('None');
  const [taking, setTaking] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.permCenter]}>
        <Text style={styles.permText}>Camera access is needed to scan plants.</Text>
        <Pressable onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  async function handleShutter() {
    if (taking || !cameraRef.current) return;
    setTaking(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      navigation.replace('Analyzing', {
        photoUri: photo.uri,
        mediaType: 'image/jpeg',
        symptom,
      });
    } catch {
      setTaking(false);
    }
  }

  async function handleGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';
      navigation.replace('Analyzing', {
        photoUri: asset.uri,
        mediaType,
        symptom,
      });
    }
  }

  const topPad = Math.max(56, insets.top + 8);
  const bottomPad = Math.max(40, insets.bottom + 16);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Live viewfinder */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        flash={flash}
      />

      {/* Rule-of-thirds grid + focus brackets */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
          <Line x1="33.33%" y1="0%" x2="33.33%" y2="100%" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <Line x1="66.66%" y1="0%" x2="66.66%" y2="100%" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <Line x1="0%" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <Line x1="0%" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        </Svg>
        <View style={[styles.bracket, styles.bracketTL]} />
        <View style={[styles.bracket, styles.bracketTR]} />
        <View style={[styles.bracket, styles.bracketBL]} />
        <View style={[styles.bracket, styles.bracketBR]} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { top: topPad }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
        >
          <Ico.Back color="#F4F1E8" size={22} />
        </Pressable>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Identifying</Text>
        </View>

        <Pressable
          onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
        >
          <Ico.Flash color={flash === 'on' ? colors.mint : '#F4F1E8'} size={20} />
        </Pressable>
      </View>

      {/* Bottom chrome: guide hint + chip row + shutter */}
      <View style={[styles.bottomChrome, { paddingBottom: bottomPad }]}>
        <Text style={styles.guideText} pointerEvents="none">Frame the whole plant</Text>

        {/* Symptom chips */}
        <View style={styles.chipSection}>
          <Text style={styles.chipLabel}>
            What looks off?{'  '}
            <Text style={styles.chipHint}>select before shooting</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {SYMPTOMS.map((s) => {
              const active = symptom === s;
              const isNone = s === 'None';
              return (
                <Pressable
                  key={s}
                  onPress={() => setSymptom(s)}
                  style={[
                    styles.chip,
                    active && (isNone ? styles.chipActiveNone : styles.chipActiveSymptom),
                  ]}
                >
                  {active && !isNone && <View style={styles.chipDot} />}
                  {active && isNone && <Ico.Check color={colors.mint} size={12} />}
                  <Text
                    style={[
                      styles.chipText,
                      active && (isNone ? styles.chipTextNone : styles.chipTextSymptom),
                    ]}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <Pressable
            onPress={handleGallery}
            style={({ pressed }) => [styles.sideBtn, pressed && { opacity: 0.7 }]}
          >
            <Ico.Gallery color="#F4F1E8" size={22} />
          </Pressable>

          <Pressable
            onPress={handleShutter}
            disabled={taking}
            style={[styles.shutterOuter, taking && { opacity: 0.6 }]}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
            style={({ pressed }) => [styles.sideBtn, pressed && { opacity: 0.7 }]}
          >
            <Ico.Flip color="#F4F1E8" size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  permCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  permText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: '#F4F1E8',
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  permBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#F4F1E8',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
  statusText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#F4F1E8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Focus brackets
  bracket: {
    position: 'absolute',
    width: 28,
    height: 28,
  },
  bracketTL: {
    top: '26%',
    left: '16%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: colors.mint,
    borderLeftColor: colors.mint,
    borderTopLeftRadius: 4,
  },
  bracketTR: {
    top: '26%',
    right: '16%',
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopColor: colors.mint,
    borderRightColor: colors.mint,
    borderTopRightRadius: 4,
  },
  bracketBL: {
    bottom: '38%',
    left: '16%',
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomColor: colors.mint,
    borderLeftColor: colors.mint,
    borderBottomLeftRadius: 4,
  },
  bracketBR: {
    bottom: '38%',
    right: '16%',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: colors.mint,
    borderRightColor: colors.mint,
    borderBottomRightRadius: 4,
  },

  // Bottom chrome
  bottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  guideText: {
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(244,241,232,0.6)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Symptom chips
  chipSection: {
    marginBottom: 10,
  },
  chipLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(184,213,166,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  chipHint: {
    color: 'rgba(244,241,232,0.5)',
    textTransform: 'none',
    letterSpacing: 0,
  },
  chipRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  chip: {
    flexShrink: 0,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActiveNone: {
    backgroundColor: 'rgba(184,213,166,0.25)',
    borderColor: 'rgba(184,213,166,0.6)',
  },
  chipActiveSymptom: {
    backgroundColor: 'rgba(217,176,116,0.25)',
    borderColor: 'rgba(217,176,116,0.6)',
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F0CC85',
  },
  chipText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#F4F1E8',
  },
  chipTextNone: {
    color: colors.mint,
  },
  chipTextSymptom: {
    color: '#F0CC85',
  },

  // Shutter row
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#F4F1E8',
    padding: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    flex: 1,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#F4F1E8',
  },
});
