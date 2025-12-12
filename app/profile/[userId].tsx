import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserProfile, fetchUserStats } from '@/store/slices/profileSlice';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function OtherUserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const dispatch = useAppDispatch();
  const { viewedUser, stats, isLoading } = useAppSelector((state) => state.profile);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserStats(userId));
    }
  }, [dispatch, userId]);

  if (isLoading && !viewedUser) {
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {viewedUser?.name || 'User Profile'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: viewedUser?.profile_image || 'https://via.placeholder.com/400x200' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: viewedUser?.profile_image || 'https://via.placeholder.com/100' }}
            style={styles.profileImage}
          />
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{viewedUser?.name || 'User'}</Text>
            {viewedUser?.name && (
              <IconSymbol name="checkmark.seal.fill" size={20} color={Colors.light.primary} />
            )}
          </View>
          <Text style={styles.bio}>{viewedUser?.bio || 'No bio yet'}</Text>
        </View>
      </View>

      {/* View Profile Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.viewProfileButton}>
          <Text style={styles.viewProfileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol name="list.bullet" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Your Plans</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol name="bookmark.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Saved Plans</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol name="location.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Location Preferences</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol name="link" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Manage Socials</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol name="tag.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Manage Interests</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol name="envelope.fill" size={20} color={Colors.light.primary} />
          <Text style={styles.menuText}>Contact Us</Text>
          <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
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
    flex: 1,
    textAlign: 'center',
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
  buttonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  viewProfileButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  viewProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});

