import { View, Text, StyleSheet } from 'react-native';
import { Colors, borderRadius } from '@/constants/theme';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Coming soon...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: borderRadius.lg,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
});
