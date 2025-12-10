import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    await dispatch(logout());
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Vybeme</Text>
        <Text style={styles.subtitle}>User ID: {user?.user_id}</Text>
        <Text style={styles.subtitle}>Session ID: {user?.session_id}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: Colors.light.error,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
