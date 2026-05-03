import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../utils/theme';
import { analyzeImage } from '../utils/api';
import { addToHistory, updateHistory, uploadPlantPhoto } from '../utils/history';
import { PlantPlaceholder } from './HomeScreen';
import * as Ico from '../components/Ico';

const STEPS = [
  { label: 'Identifying species',    sub: 'plant.id' },
  { label: 'Checking care database', sub: '4,212 species indexed' },
  { label: 'Generating diagnosis',   sub: 'reasoning over symptoms' },
];

export default function AnalyzingScreen({ navigation, route }) {
  const { photoUri, mediaType = 'image/jpeg', symptom = 'None', linkedPlantId, knownSpecies = '' } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const initialStep = knownSpecies ? 1 : 0;
  const [step, setStep] = useState(initialStep);
  const [report, setReport] = useState(null);

  const rowOpacities = useRef(
    STEPS.map((_, i) => new Animated.Value(i <= initialStep ? 1 : 0.35))
  ).current;

  const spinAnim     = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(initialStep / STEPS.length)).current;
  const scanAnim     = useRef(new Animated.Value(0)).current;

  // ── Spinner loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Scanline loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Step timer (1.2 s per step)
  useEffect(() => {
    if (step >= STEPS.length) return;
    const t = setTimeout(() => setStep(s => s + 1), 1200);
    return () => clearTimeout(t);
  }, [step]);

  // ── Row opacities + progress bar on each step change
  useEffect(() => {
    rowOpacities.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i <= step ? 1 : 0.35,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
    Animated.timing(progressAnim, {
      toValue: Math.min(step / STEPS.length, 1),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // ── API call + photo upload — fires once on mount
  useEffect(() => {
    const run = async () => {
      // Run species analysis and photo upload in parallel
      const [data, photoUrl] = await Promise.all([
        analyzeImage(photoUri, mediaType, symptom, knownSpecies),
        uploadPlantPhoto(photoUri),
      ]);

      const reportWithPhoto = { ...data, photoUri: photoUrl };
      let saved;
      if (linkedPlantId) {
        saved = await updateHistory(linkedPlantId, { ...reportWithPhoto, source: null });
      } else {
        saved = await addToHistory(reportWithPhoto);
      }
      setReport(saved ?? reportWithPhoto);
    };

    run().catch(err => {
      Alert.alert(
        'Analysis failed',
        err.message || 'Something went wrong. Please try again.',
        [{ text: 'Try again', onPress: () => navigation.replace('Camera') }],
      );
    });
  }, []);

  // ── Navigate when animation AND API are both done
  useEffect(() => {
    if (step < STEPS.length || !report) return;
    const t = setTimeout(() => {
      navigation.replace('Report', { report });
    }, 600);
    return () => clearTimeout(t);
  }, [step, report]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });
  const scanOpacity = scanAnim.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const topPad = Math.max(72, insets.top + 24);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgMint, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={styles.bgWash}
        pointerEvents="none"
      />

      <View style={[styles.inner, { paddingTop: topPad }]}>
        {/* Plant image with scanline */}
        <View style={styles.imageWrap}>
          <PlantPlaceholder size={140} rx={16} />
          <View style={[StyleSheet.absoluteFillObject, styles.scanlineClip]} pointerEvents="none">
            <Animated.View
              style={[
                styles.scanline,
                { opacity: scanOpacity, transform: [{ translateY: scanTranslate }] },
              ]}
            />
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.metaLabel}>Analyzing</Text>
          <Text style={styles.headline}>
            <Text style={styles.headlineItalic}>Reading</Text>
            {' '}the leaves…
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsList}>
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <Animated.View
                key={i}
                style={[styles.stepRow, { opacity: rowOpacities[i] }]}
              >
                <View style={[
                  styles.stepIcon,
                  done   && styles.stepIconDone,
                  active && styles.stepIconActive,
                ]}>
                  {done   && <Ico.Check color={colors.leaf} size={14} />}
                  {active && (
                    <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
                  )}
                  {!done && !active && <View style={styles.stepDot} />}
                </View>
                <View style={styles.stepText}>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                    {s.label}
                  </Text>
                  <Text style={styles.stepSub}>{s.sub}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>~ a few seconds ~</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bgWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },

  imageWrap: {
    alignSelf: 'center',
    marginBottom: 40,
  },
  scanlineClip: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.leaf,
    shadowColor: colors.leaf,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  header: {
    alignItems: 'center',
    marginBottom: 44,
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
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 12,
  },
  headlineItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },

  stepsList: {
    gap: 4,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(31,58,40,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(31,58,40,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIconDone: {
    backgroundColor: colors.bgMint,
    borderColor: colors.leaf,
  },
  stepIconActive: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberLine,
  },
  stepDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textMute,
  },
  spinner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.amber,
    borderTopColor: 'transparent',
  },
  stepText: {
    flex: 1,
  },
  stepLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.text,
  },
  stepLabelDone: {
    color: colors.textMute,
    textDecorationLine: 'line-through',
    textDecorationColor: 'rgba(75,90,75,0.4)',
  },
  stepSub: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textMute,
    marginTop: 2,
    letterSpacing: 0.4,
  },

  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.bgMint,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.leaf,
  },

  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
