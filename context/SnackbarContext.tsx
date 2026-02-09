import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SnackbarContextValue = {
  showSnackbar: (message: string) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const SNACKBAR_DURATION_MS = 3500;

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 24,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMessage(null);
    });
  }, [opacity, translateY]);

  const showSnackbar = useCallback(
    (msg: string) => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      setMessage(msg);
      opacity.setValue(0);
      translateY.setValue(24);
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
        hide();
      }, SNACKBAR_DURATION_MS);
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
            { bottom: Math.max(insets.bottom, 12) + 12 },
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
