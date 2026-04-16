import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useNetwork } from '../../src/hooks/useNetwork';
import { apiGetDashboard } from '../../src/services/api';
import { getCoursesByUser } from '../../src/services/database';
import { getApiBaseUrl, setApiBaseUrl } from '../../src/services/api';
import { removeCourseOffline } from '../../src/services/offlineSync';
import { Card, Button, ProgressBar } from '../../src/components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const { isOnline, checkNow } = useNetwork();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [downloadedCourses, setDownloadedCourses] = useState<any[]>([]);
  const [serverUrl, setServerUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);

  useEffect(() => {
    loadData();
    setServerUrl(getApiBaseUrl());
  }, [user]);

  async function loadData() {
    if (!user) return;

    // Downloaded courses
    const local = await getCoursesByUser(user.id);
    setDownloadedCourses(local);

    // Online stats
    if (isOnline) {
      try {
        const dash = await apiGetDashboard();
        setStats(dash?.stats || null);
      } catch {}
    }
  }

  async function handleSaveUrl() {
    if (!serverUrl.trim()) return;
    await setApiBaseUrl(serverUrl.trim());
    const online = await checkNow();
    Alert.alert(
      online ? 'Connected!' : 'Cannot reach server',
      online ? `Connected to ${serverUrl}` : 'Check the URL and ensure the server is running.'
    );
    if (online) {
      refreshProfile();
      loadData();
    }
  }

  async function handleRemoveDownload(courseId: string, title: string) {
    Alert.alert('Remove Download', `Remove "${title}" from offline storage?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeCourseOffline(courseId);
          const local = await getCoursesByUser(user!.id);
          setDownloadedCourses(local);
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  // Calculate storage estimate
  const storageEstimate = downloadedCourses.reduce((sum, c) => sum + (c.total_topics || 0) * 2, 0); // ~2KB per topic

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top }}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{(user?.name || 'S')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'Student'}</Text>
        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: Colors.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: Colors.primary }]}>Class {user?.classLevel || 10}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: (isOnline ? Colors.success : Colors.warning) + '15' }]}>
            <Ionicons name={isOnline ? 'cloud-done' : 'cloud-offline'} size={14} color={isOnline ? Colors.success : Colors.warning} />
            <Text style={[styles.badgeText, { color: isOnline ? Colors.success : Colors.warning }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Stats</Text>
          <Card style={styles.statsGrid}>
            {[
              { label: 'Enrolled', value: stats.totalCourses || 0, icon: 'book', color: Colors.primary },
              { label: 'Completed', value: stats.coursesCompleted || 0, icon: 'checkmark-circle', color: Colors.success },
              { label: 'Topics', value: stats.totalTopicsCompleted || 0, icon: 'document-text', color: Colors.accent },
              { label: 'Avg Score', value: `${Math.round(stats.avgQuizScore || 0)}%`, icon: 'trophy', color: Colors.warning },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                  <Ionicons name={s.icon as any} size={20} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Downloads Management */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={() => setShowDownloads(!showDownloads)}>
          <View style={styles.menuLeft}>
            <Ionicons name="download-outline" size={22} color={Colors.text} />
            <View>
              <Text style={styles.menuText}>Downloaded Courses ({downloadedCourses.length})</Text>
              <Text style={styles.menuHint}>~{storageEstimate} KB used</Text>
            </View>
          </View>
          <Ionicons name={showDownloads ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        {showDownloads && (
          <View style={styles.downloadsList}>
            {downloadedCourses.length === 0 ? (
              <Text style={styles.emptyDownloads}>No downloaded courses.</Text>
            ) : (
              downloadedCourses.map(c => (
                <View key={c.id} style={styles.downloadItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.downloadTitle} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.downloadMeta}>{c.total_topics || 0} topics - {Math.round(c.progress || 0)}% done</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveDownload(c.id, c.title)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Server Settings */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={() => setShowSettings(!showSettings)}>
          <View style={styles.menuLeft}>
            <Ionicons name="server-outline" size={22} color={Colors.text} />
            <Text style={styles.menuText}>Server Settings</Text>
          </View>
          <Ionicons name={showSettings ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        {showSettings && (
          <Card style={{ marginTop: Spacing.md }}>
            <Text style={styles.fieldLabel}>Backend Server URL</Text>
            <Text style={styles.fieldHint}>
              Your Learnify backend address. Required for login, course generation, and quizzes.
            </Text>
            <TextInput
              style={styles.urlInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.100:5000"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Button title="Save & Test" onPress={handleSaveUrl} icon="wifi-outline" fullWidth size="md" />
          </Card>
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert('Learnify', 'AI-Powered Learning Platform\nVersion 1.0.0\n\nBuild for Bharat')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="information-circle-outline" size={22} color={Colors.text} />
            <Text style={styles.menuText}>About Learnify</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <Button title="Logout" onPress={handleLogout} variant="danger" icon="log-out-outline" fullWidth size="lg" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xxl },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  profileName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
  section: { paddingHorizontal: Spacing.xxl, marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statItem: { width: '48%', alignItems: 'center', paddingVertical: Spacing.md },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  menuRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.lg, ...Shadow.sm,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  menuHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  downloadsList: { marginTop: Spacing.sm, paddingLeft: Spacing.md },
  emptyDownloads: { fontSize: FontSize.sm, color: Colors.textTertiary, paddingVertical: Spacing.md, textAlign: 'center' },
  downloadItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  downloadTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  downloadMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  fieldHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  urlInput: {
    borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 12, fontSize: FontSize.md,
    color: Colors.text, marginBottom: Spacing.lg, backgroundColor: Colors.surfaceAlt,
  },
});
