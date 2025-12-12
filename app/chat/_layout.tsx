import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[groupId]" />
      <Stack.Screen name="group/[groupId]" />
      <Stack.Screen name="group/details/[groupId]" />
      <Stack.Screen name="poll/create" />
    </Stack>
  );
}

