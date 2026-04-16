import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { LoadingScreen } from '../src/components/ui';

export default function Index() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return <LoadingScreen message="Starting Learnify..." />;
  }

  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
