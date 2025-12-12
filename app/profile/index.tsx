import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser, fetchUserStats } from '@/store/slices/profileSlice';
import { logout } from '@/store/slices/authSlice';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { apiService } from '@/services/api';

export default function MyProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser, stats, isLoading } = useAppSelector((state) => state.profile);

  useEffect(() => {
    if (user?.session_id) {
      dispatch(fetchCurrentUser(user.session_id));
      if (user.user_id) {
        dispatch(fetchUserStats(user.user_id));
      }
    }
  }, [dispatch, user]);

  const handleLogout = async () => {
    Alert.alert(
      "You're about to Logout!",
      'You can log back in anytime using your email or phone number.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'default',
          onPress: async () => {
            await dispatch(logout());
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "You're about to delete your account!",
      'Deleting your account is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (!user?.session_id) return;
            try {
              await apiService.deleteUser(user.session_id);
              await dispatch(logout());
              router.replace('/login');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: currentUser?.profile_image || 'https://via.placeholder.com/400x200' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: currentUser?.profile_image || 'https://via.placeholder.com/100' }}
            style={styles.profileImage}
          />
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{currentUser?.name || 'User'}</Text>
            {currentUser?.name && (
              <IconSymbol name="checkmark.seal.fill" size={20} color={Colors.light.primary} />
            )}
          </View>
          <Text style={styles.bio}>{currentUser?.bio || 'No bio yet'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.plans_count || 0}</Text>
          <Text style={styles.statLabel}>Plans</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.interactions_count || 0}</Text>
          <Text style={styles.statLabel}>Interactions</Text>
        </View>
      </View>

      {/* User Details */}
      <View style={styles.section}>
        <View style={styles.detailItem}>
          <IconSymbol name="person.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.detailText}>{currentUser?.name || 'Not set'}</Text>
        </View>
        {currentUser?.phone_number && (
          <View style={styles.detailItem}>
            <IconSymbol name="phone.fill" size={20} color={Colors.light.primary} />
            <Text style={styles.detailText}>{currentUser.phone_number}</Text>
          </View>
        )}
      </View>

      {/* Interests */}
      {currentUser?.interests && currentUser.interests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>#interests</Text>
          <View style={styles.interestsContainer}>
            {currentUser.interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>#{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/your-plans')}
        >
          <IconSymbol name="list.bullet" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Your Plans</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/saved-plans')}
        >
          <IconSymbol name="bookmark.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Saved Plans</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/edit')}
        >
          <IconSymbol name="pencil" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Edit Profile</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/location-preference')}
        >
          <IconSymbol name="location.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Location Preferences</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/manage-socials')}
        >
          <IconSymbol name="link" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Manage Socials</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/manage-interests')}
        >
          <IconSymbol name="tag.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Manage Interests</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol name="envelope.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Contact Us</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.deleteItem]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  profileCard: {
    backgroundColor: Colors.light.cardBackground,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bannerContainer: {
    height: 150,
    backgroundColor: Colors.light.inputBackground,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: -50,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.light.background,
  },
  profileInfo: {
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  bio: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  deleteItem: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  deleteText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.error,
    textAlign: 'center',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
  },
});

