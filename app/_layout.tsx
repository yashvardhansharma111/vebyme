import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import 'react-native-reanimated';

import { store } from '@/store/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadUser } from '@/store/slices/authSlice';
import { SnackbarProvider } from '@/context/SnackbarContext';
import { Colors } from '@/constants/theme';

const VYBEME_SCHEME = 'vybeme://';

function parsePostIdFromUrl(url: string | null): string | null {
  if (!url || !url.startsWith(VYBEME_SCHEME)) return null;
  const path = url.slice(VYBEME_SCHEME.length);
  const match = /^post\/([^/?]+)/i.exec(path);
  return match ? match[1] : null;
}

function RootLayoutNav() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading } = useAppSelector((state) => state.auth);
  const handledInitialUrl = useRef(false);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // Deep link: open post in app when user opens vybeme://post/xxx (from shared link gateway)
  useEffect(() => {
    const navigateToPost = (postId: string) => {
      router.replace(`/business-plan/${postId}` as any);
    };

    const handleUrl = (url: string | null) => {
      const postId = parsePostIdFromUrl(url);
      if (postId) navigateToPost(postId);
    };

    // Cold start: app opened from link (short delay so navigator is ready)
    if (!handledInitialUrl.current) {
      handledInitialUrl.current = true;
      Linking.getInitialURL().then((url) => {
        if (!url) return;
        const postId = parsePostIdFromUrl(url);
        if (postId) setTimeout(() => navigateToPost(postId), 100);
      });
    }

    // Warm start: app in background, user opens link
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup/profile" options={{ headerShown: false }} />
        <Stack.Screen name="signup/interests" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="feed" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="otherProfile/[id]" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SnackbarProvider>
        <RootLayoutNav />
      </SnackbarProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
