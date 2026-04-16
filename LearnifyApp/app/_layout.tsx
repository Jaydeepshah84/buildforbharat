import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/hooks/useAuth';
import { initApiUrl } from '../src/services/api';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  useEffect(() => {
    initApiUrl();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="learn/[topicId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="quiz-take/[id]" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </AuthProvider>
  );
}
