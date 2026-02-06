import { Stack } from 'expo-router';

export default function AnalyticsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="overall" />
      <Stack.Screen name="event/[planId]" />
    </Stack>
  );
}
