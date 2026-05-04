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

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    const e = email.trim().toLowerCase();
    if (!e || !password || !confirm) {
      Alert.alert('Missing fields', 'Fill in all fields to continue.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Re-enter your password to confirm.');
      return;
    }
    setLoading(true);
    try {
      const data = await signUp(e, password);
      if (data?.session) {
        // Email confirmation is disabled — onAuthStateChange will fire and
        // RootNavigator automatically switches to the main app stack.
      } else {
        setSuccess(true);
      }
    } catch (err) {
      Alert.alert('Registration failed', err.message || 'Something went wrong. Please try again.');
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ico.Leaf color={colors.pine} size={32} />
          </View>
          <Text style={styles.appName}>Green Thumbs</Text>
          <Text style={styles.tagline}>
            {'Create your '}
            <Text style={styles.taglineItalic}>account</Text>
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMute}
              secureTextEntry
              returnKeyType="next"
              autoComplete="new-password"
            />
          </View>

          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor={colors.textMute}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              autoComplete="new-password"
            />
          </View>
        </View>

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Account created!</Text>
            <Text style={styles.successSub}>
              Check your email for a confirmation link, then sign in.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={({ pressed }) => [styles.goToSignInBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.goToSignInText}>Go to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaBtnText}>Create account</Text>
              }
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={({ pressed }) => [styles.signInLink, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.signInLinkText}>
                {'Already have an account? '}
                <Text style={styles.signInLinkHighlight}>Sign in</Text>
              </Text>
            </Pressable>
          </>
        )}
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

  successBox: {
    borderRadius: radii.xl,
    backgroundColor: colors.bgSage,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  successText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.pine,
  },
  successSub: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSoft,
    textAlign: 'center',
  },
  goToSignInBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.pine,
  },
  goToSignInText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.pine,
  },

  signInLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  signInLinkText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSoft,
  },
  signInLinkHighlight: {
    fontFamily: fonts.sansBold,
    color: colors.pine,
  },
});
