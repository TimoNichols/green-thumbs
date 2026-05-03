import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import * as Ico from '../components/Ico';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSignIn() {
    const e = email.trim().toLowerCase();
    const p = password;
    if (!e || !p) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(e, p);
    } catch (err) {
      Alert.alert('Sign in failed', err.message || 'Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(72, insets.top + 24), paddingBottom: Math.max(40, insets.bottom + 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ico.Leaf color={colors.pine} size={32} />
          </View>
          <Text style={styles.appName}>Green Thumbs</Text>
          <Text style={styles.tagline}>
            {'Sign in to your '}
            <Text style={styles.taglineItalic}>garden</Text>
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMute}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              autoComplete="email"
            />
          </View>

          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMute}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              autoComplete="password"
            />
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaBtnText}>Sign in</Text>
          }
        </Pressable>

        {/* Register link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New here?</Text>
          <Pressable
            onPress={() => navigation.navigate('Register')}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.footerLink}>Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 24,
  },

  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.bgSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.textSoft,
    letterSpacing: -0.1,
  },
  taglineItalic: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },

  card: {
    backgroundColor: colors.bgRaise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii['2xl'],
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
    marginBottom: 0,
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMute,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
  },

  ctaBtn: {
    height: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ctaBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMute,
  },
  footerLink: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.pine,
  },
});
