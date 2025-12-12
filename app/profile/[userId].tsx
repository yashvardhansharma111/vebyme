import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserProfile, fetchUserStats, fetchUserPlans } from '@/store/slices/profileSlice';
import { apiService } from '@/services/api';

const INTEREST_ICONS: { [key: string]: string } = {
  Rooftop: 'business',
  Rave: 'musical-notes',
  Art: 'color-palette',
  Sports: 'football',
  Karaoke: 'mic',
  Cycling: 'bicycle',
};

export default function OtherUserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const dispatch = useAppDispatch();
  const { viewedUser, stats, isLoading } = useAppSelector((state) => state.profile);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserStats(userId));
      loadRecentPlans();
    }
  }, [dispatch, userId]);

  const loadRecentPlans = async () => {
    if (!userId) return;
    setLoadingPlans(true);
    try {
      const response = await apiService.getUserPlans(userId, 5, 0);
      if (response.data) {
        setRecentPlans(response.data);
      }
    } catch (error: any) {
      console.error('Error loading plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleChat = () => {
    if (!currentUser?.user_id || !userId) {
      Alert.alert('Error', 'Please login to start a chat');
      return;
    }
    // TODO: Navigate to chat screen when implemented
    Alert.alert('Coming Soon', 'Chat feature will be available soon');
  };

  const handleReport = () => {
    Alert.alert(
      'Report User',
      'Are you sure you want to report this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement report user API
            Alert.alert('Success', 'User reported successfully');
          },
        },
      ]
    );
  };

  if (isLoading && !viewedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const socialMedia = viewedUser?.social_media || {};
  const interests = viewedUser?.interests || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Other User Profile
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: viewedUser?.profile_image || 'https://via.placeholder.com/400x200',
            }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{viewedUser?.name || 'User'}</Text>
              {viewedUser?.name && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} />
              )}
            </View>
            <Text style={styles.bio}>{viewedUser?.bio || 'No bio yet'}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.plans_count || 0}</Text>
            <Text style={styles.statLabel}>#plans</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.interactions_count || 0}</Text>
            <Text style={styles.statLabel}>#interactions</Text>
          </View>
        </View>

        {/* Social Media */}
        {(socialMedia.instagram || socialMedia.twitter) && (
          <View style={styles.sectionCard}>
            {socialMedia.instagram && (
              <View style={styles.socialRow}>
                <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                <Text style={styles.socialText}>{socialMedia.instagram}</Text>
              </View>
            )}
            {socialMedia.twitter && (
              <View style={styles.socialRow}>
                <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                <Text style={styles.socialText}>{socialMedia.twitter}</Text>
              </View>
            )}
          </View>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>#Interests</Text>
            <View style={styles.interestsGrid}>
              {interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Ionicons
                    name={INTEREST_ICONS[interest] as any || 'ellipse'}
                    size={14}
                    color={Colors.light.text}
                    style={styles.interestIcon}
                  />
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Plans */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Plans</Text>
          {loadingPlans ? (
            <ActivityIndicator size="small" color={Colors.light.primary} style={styles.loading} />
          ) : recentPlans.length === 0 ? (
            <Text style={styles.emptyText}>No plans yet</Text>
          ) : (
            recentPlans.map((plan) => (
              <View key={plan.plan_id} style={styles.planCard}>
                <View style={styles.planContent}>
                  <Text style={styles.planTitle}>{plan.title || 'Untitled Plan'}</Text>
                  <Text style={styles.planDescription} numberOfLines={2}>
                    {plan.description || 'No description'}
                  </Text>
                  {plan.category_sub && plan.category_sub.length > 0 && (
                    <View style={styles.planTags}>
                      {plan.category_sub.slice(0, 3).map((tag: string, idx: number) => (
                        <View key={idx} style={styles.planTag}>
                          <Text style={styles.planTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                {plan.media && plan.media.length > 0 && (
                  <Image
                    source={{ uri: plan.media[0].url }}
                    style={styles.planImage}
                    resizeMode="cover"
                  />
                )}
              </View>
            ))
          )}
        </View>

        {/* Report User */}
        <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
          <Ionicons name="flag-outline" size={18} color={Colors.light.error} />
          <Text style={styles.reportText}>Report User</Text>
        </TouchableOpacity>

        {/* Chat Button */}
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  bannerContainer: {
    height: 200,
    position: 'relative',
    marginBottom: 16,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  socialText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  interestIcon: {
    marginRight: 2,
  },
  interestText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  loading: {
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
  },
  planCard: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  planContent: {
    flex: 1,
    marginRight: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  planTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  planTag: {
    backgroundColor: Colors.light.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  planTagText: {
    fontSize: 11,
    color: Colors.light.text,
    fontWeight: '500',
  },
  planImage: {
    width: 80,
    height: 60,
    borderRadius: borderRadius.md,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  reportText: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
