import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { Button, Input } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

export default function SignupScreen() {
  const { signup, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classLevel, setClassLevel] = useState('10');
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');

    const result = await signup(name.trim(), email.trim(), password, parseInt(classLevel) || 10, language);
    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      setError(result.error || 'Signup failed');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your learning journey</Text>
        </View>

        <View style={styles.form}>
          <Input label="Full Name" icon="person-outline" placeholder="Enter your name"
            value={name} onChangeText={setName} autoCapitalize="words" />
          <Input label="Email" icon="mail-outline" placeholder="Enter your email"
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" icon="lock-closed-outline" placeholder="Min 6 characters"
            value={password} onChangeText={setPassword} secureTextEntry />

          <Text style={styles.fieldLabel}>Class Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(level => (
              <TouchableOpacity
                key={level}
                onPress={() => setClassLevel(String(level))}
                style={[styles.chip, parseInt(classLevel) === level && styles.chipActive]}
              >
                <Text style={[styles.chipText, parseInt(classLevel) === level && { color: '#FFF' }]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Language</Text>
          <View style={styles.langRow}>
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'Hindi' },
              { code: 'gu', label: 'Gujarati' },
            ].map(l => (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLanguage(l.code)}
                style={[styles.langChip, language === l.code && styles.chipActive]}
              >
                <Text style={[styles.chipText, language === l.code && { color: '#FFF' }]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button title="Create Account" onPress={handleSignup} loading={isLoading}
            fullWidth size="lg" style={{ marginTop: Spacing.xl }} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing.xxl, paddingTop: 60 },
  header: { marginBottom: 30 },
  backBtn: { marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4 },
  form: { width: '100%' },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  chip: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  langChip: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  errorText: {
    color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.sm,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xxl },
  footerText: { fontSize: FontSize.md, color: Colors.textSecondary },
  footerLink: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '700' },
});
