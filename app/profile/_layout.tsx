import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="your-plans" />
      <Stack.Screen name="saved-plans" />
      <Stack.Screen name="location-preference" />
      <Stack.Screen name="manage-socials" />
      <Stack.Screen name="manage-interests" />
    </Stack>
  );
}

