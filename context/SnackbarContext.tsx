import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SnackbarOptions = {
  position?: 'top' | 'bottom';
  duration?: number;
};

type SnackbarContextValue = {
  showSnackbar: (message: string, options?: SnackbarOptions) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const DEFAULT_DURATION_MS = 3500;
const AUTH_SNACKBAR_DURATION_MS = 3000;

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(
    (isTop: boolean) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: isTop ? -24 : 24,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMessage(null);
      });
    },
    [opacity, translateY]
  );

  const showSnackbar = useCallback(
    (msg: string, options?: SnackbarOptions) => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      const isTop = options?.position === 'top';
      const duration = options?.duration ?? (isTop ? AUTH_SNACKBAR_DURATION_MS : DEFAULT_DURATION_MS);
      setMessage(msg);
      setPosition(isTop ? 'top' : 'bottom');
      opacity.setValue(0);
      translateY.setValue(isTop ? -24 : 24);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      hideTimeout.current = setTimeout(() => {
        hideTimeout.current = null;
        hide(isTop);
      }, duration);
    },
    [opacity, translateY, hide]
  );

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {message !== null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.snackbar,
            position === 'top'
              ? { top: Math.max(insets.top, 12) + 12 }
              : { bottom: Math.max(insets.bottom, 12) + 12 },
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.snackbarInner}>
            <Text style={styles.snackbarText} numberOfLines={2}>
              {message}
            </Text>
          </View>
        </Animated.View>
      )}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  snackbarInner: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
