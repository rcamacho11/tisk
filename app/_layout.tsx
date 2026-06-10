import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { AppThemeProvider } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/hooks/useAuth';
import { useNotifications } from '@/src/hooks/useNotifications';
import '@/src/services/locationTaskService';

export const unstable_settings = {
  anchor: 'login',
};

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inTabsGroup) {
      router.replace('/login');
    } else if (isAuthenticated && !inTabsGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

function NotificationManager() {
  const { isAuthenticated } = useAuth();
  useNotifications(isAuthenticated);
  return null;
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const bgColor = Colors[colorScheme ?? 'light'].background;

  return (
    <ThemeProvider value={colorScheme === 'dark'
      ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: bgColor } }
      : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: bgColor } }
    }>
      <AuthProvider>
        <AuthGuard />
        <NotificationManager />
        <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </SafeAreaView>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={bgColor} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootLayoutInner />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
