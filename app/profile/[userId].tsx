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
import { BlurView } from 'expo-blur';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserProfile, fetchUserStats } from '@/store/slices/profileSlice';
import { apiService } from '@/services/api';

const INTEREST_ICONS: { [key: string]: string } = {
  Rooftop: 'business',
  Rave: 'musical-notes',
  Art: 'color-palette',
  Sports: 'football',
  Karaoke: 'mic',
  Cycling: 'bicycle',
  Breakfast: 'restaurant',
  Lunch: 'restaurant',
  Dinner: 'restaurant',
  Coffee: 'cafe',
  Music: 'musical-notes',
  Movies: 'film',
  'Board Games': 'dice',
  'House Party': 'home',
  'Road Trip': 'car',
  Concert: 'mic',
  Cooking: 'restaurant',
  'Live Music': 'guitar',
  Party: 'balloon',
  Health: 'heart',
  Nature: 'leaf',
  Standup: 'mic',
  Workshops: 'construct',
  Podcasts: 'radio',
};

const TAG_ICONS: { [key: string]: string } = {
  Weekend: 'calendar',
  Evening: 'sunny',
  Hitchhiking: 'thumbs-up',
  Today: 'today',
  Tomorrow: 'calendar-outline',
  Morning: 'sunny-outline',
  Night: 'moon',
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
            Alert.alert('Success', 'User reported successfully');
          },
        },
      ]
    );
  };

  if (isLoading && !viewedUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      </SafeAreaView>
    );
  }

  const socialMedia = (viewedUser as any)?.social_media || {};
  const interests = viewedUser?.interests || [];
  const hasProfileImage = viewedUser?.profile_image;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
              <Ionicons name="close" size={16} color="#FFF" style={styles.closeIcon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Picture Section */}
        {hasProfileImage ? (
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: viewedUser.profile_image! }}
              style={styles.profileImageBackground}
              resizeMode="cover"
            />
            <View style={styles.profileContent}>
              <View style={styles.profileImageWrapper}>
                <Image
                  source={{ uri: viewedUser.profile_image! }}
                  style={styles.profileImageCircle}
                  resizeMode="cover"
                />
              </View>
              <BlurView intensity={40} tint="dark" style={styles.profileInfoBlur}>
                <View style={styles.profileInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{viewedUser?.name || 'User'}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" style={styles.verifiedIcon} />
                  </View>
                  {viewedUser?.bio && (
                    <Text style={styles.bio} numberOfLines={2}>
                      {viewedUser.bio}
                    </Text>
                  )}
                </View>
              </BlurView>
            </View>
          </View>
        ) : (
          <View style={styles.profileImageContainerNoImage}>
            <View style={styles.profileInfoNoImage}>
              <View style={styles.nameRow}>
                <Text style={styles.userNameNoImage}>{viewedUser?.name || 'User'}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#1C1C1E" style={styles.verifiedIcon} />
              </View>
              {viewedUser?.bio && (
                <Text style={styles.bioNoImage} numberOfLines={2}>
                  {viewedUser.bio}
                </Text>
              )}
            </View>
          </View>
        )}

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

        {/* Social Media Card */}
        {(socialMedia.instagram || socialMedia.twitter) && (
          <View style={styles.sectionCard}>
            {socialMedia.instagram && (
              <View style={styles.socialRow}>
                <View style={styles.socialIconContainer}>
                  <Ionicons name="logo-instagram" size={20} color="#1C1C1E" />
                </View>
                <Text style={styles.socialText}>{socialMedia.instagram}</Text>
              </View>
            )}
            {socialMedia.twitter && (
              <View style={styles.socialRow}>
                <View style={styles.socialIconContainer}>
                  <Ionicons name="logo-twitter" size={20} color="#1C1C1E" />
                </View>
                <Text style={styles.socialText}>{socialMedia.twitter}</Text>
              </View>
            )}
          </View>
        )}

        {/* Interests Card - CENTERED */}
        {interests.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>#interests</Text>
            <View style={[styles.interestsGrid, { justifyContent: 'center' }]}>
              {interests.map((interest, index) => (
                <View key={index} style={styles.interestChip}>
                  <Ionicons
                    name={(INTEREST_ICONS[interest] || 'ellipse') as any}
                    size={14}
                    color="#1C1C1E"
                    style={styles.interestIcon}
                  />
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Plans - SEPARATE HEADER & CARDS */}
        <Text style={styles.sectionHeaderTitle}>Recent Plans</Text>

        {loadingPlans ? (
          <ActivityIndicator size="small" color="#1C1C1E" style={styles.loading} />
        ) : recentPlans.length === 0 ? (
          <Text style={styles.emptyText}>No plans yet</Text>
        ) : (
          recentPlans.map((plan) => {
            const allTags = [
              ...(plan.temporal_tags || []),
              ...(plan.category_sub || []),
            ].slice(0, 3);

            return (
              <View key={plan.plan_id} style={styles.standalonePlanCard}>
                <View style={styles.planRow}>
                  {/* Left Content */}
                  <View style={styles.planContent}>
                    <Text style={styles.planTitle}>{plan.title || 'Untitled Plan'}</Text>
                    <Text style={styles.planDescription} numberOfLines={3}>
                      {plan.description || 'No description'}
                    </Text>
                    
                    {allTags.length > 0 && (
                      <View style={styles.planTags}>
                        {allTags.map((tag: string, idx: number) => (
                          <View key={idx} style={styles.planTag}>
                            <Ionicons
                              name={(TAG_ICONS[tag] || 'ellipse') as any}
                              size={12}
                              color="#1C1C1E"
                              style={styles.tagIcon}
                            />
                            <Text style={styles.planTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {/* "vybeme!" text check - if available in data */}
                    <Text style={styles.vybemeText}>vybeme!</Text>
                  </View>

                  {/* Right Image (if exists) */}
                  {plan.media && plan.media.length > 0 && (
                    <Image
                      source={{ uri: plan.media[0].url }}
                      style={styles.planImage}
                      resizeMode="cover"
                    />
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Report User */}
        <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
          <Ionicons name="person-remove-outline" size={18} color="#FF3B30" />
          <Text style={styles.reportText}>Report User</Text>
        </TouchableOpacity>

        {/* Chat Button */}
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
        
        {/* Bottom padding for scroll */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    position: 'absolute',
    zIndex: 10,
    top: 40,
    left: 0,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    marginLeft: -4,
  },
  profileImageContainer: {
    width: '100%',
    height: 400, // Slightly taller based on UI
    position: 'relative',
    marginBottom: 20,
  },
  profileImageBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  profileContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 20,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImageCircle: {
    width: '100%',
    height: '100%',
  },
  profileInfoBlur: {
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
  },
  profileInfo: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)', // Fallback/Overlay
  },
  profileImageContainerNoImage: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 80, // Space for header
    paddingBottom: 20,
    marginBottom: 20,
  },
  profileInfoNoImage: {
    width: '100%',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginRight: 8,
  },
  userNameNoImage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginRight: 8,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  bioNoImage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 10,
    marginBottom: 16,
    textAlign: 'center', // Centered title outside cards
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  socialIconContainer: {
    width: 24,
    alignItems: 'center',
  },
  socialText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 12,
    fontWeight: '500',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  interestIcon: {
    marginRight: 2,
  },
  interestText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  loading: {
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  // New Styles for Separate Cards
  standalonePlanCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planContent: {
    flex: 1,
    marginRight: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  planTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  planTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  tagIcon: {
    marginRight: 2,
  },
  planTagText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  vybemeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 4,
  },
  planImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginTop: 4,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  chatButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  chatButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});