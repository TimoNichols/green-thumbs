import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../utils/theme';
import * as Ico from './Ico';

export default function NoConnectionScreen({ onRetry }) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Ico.Leaf color={colors.textMute} size={40} />
      </View>
      <Text style={styles.title}>No connection</Text>
      <Text style={styles.body}>
        Green Thumbs needs an internet connection to sync your garden.
        Check your Wi-Fi or mobile data and try again.
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSoft,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryBtn: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: radii.xl,
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#fff',
  },
});
