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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { apiService, getWebBaseUrl } from '@/services/api';
import JoinModal, { type JoinModalPlan, type JoinModalAuthor } from '@/components/JoinModal';
import LoginModal from '@/components/LoginModal';
import Avatar from '@/components/Avatar';
import { EventCard } from '@/components/SwipeableEventCard';

interface SavedPlan {
  post_id: string;
  user_id: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type: string }>;
  tags?: string[];
  timestamp: string | Date;
  location?: any;
  saved_at?: string | Date;
}

const TAG_ICONS: { [key: string]: string } = {
  Weekend: 'calendar',
  Evening: 'cloud',
  Hitchhiking: 'thumbs-up',
  Today: 'today',
  Tomorrow: 'calendar-outline',
  Morning: 'sunny-outline',
  Night: 'moon',
  Cycling: 'bicycle',
  Sports: 'football',
  Music: 'musical-notes',
  Cafe: 'cafe',
  Clubs: 'wine',
};

// User profile cache (mock/helper)
const userCache: { [key: string]: { name: string; profile_image: string | null } } = {};

const fetchUserProfile = async (user_id: string) => {
  if (userCache[user_id]) return userCache[user_id];
  try {
    const response = await apiService.getUserProfile(user_id);
    if (response.data) {
      const userData = {
        name: response.data.name || 'Unknown User',
        profile_image: response.data.profile_image || null,
      };
      userCache[user_id] = userData;
      return userData;
    }
  } catch (error) {
    console.error(`Error fetching user ${user_id}:`, error);
  }
  return { name: 'Unknown User', profile_image: null };
};

// --- Saved Plan Card Component ---
function SavedPlanCard({ 
  plan, 
  onUserPress,
  onJoinPress,
  joinDisabled = false,
}: { 
  plan: SavedPlan & { user?: any }; 
  onUserPress?: (userId: string) => void;
  onJoinPress?: (postId: string) => void;
  joinDisabled?: boolean;
}) {
  
  const formatUserTime = (timestamp: string | Date): string => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[date.getDay()];
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${dayName}, ${time}`;
    } catch {
      return 'Recently';
    }
  };

  const allTags = plan.tags || [];

  return (
    <View style={styles.cardWrapper}>
      
      {/* Floating User Pill */}
      <TouchableOpacity
        style={styles.userPill}
        onPress={() => plan.user_id && onUserPress?.(plan.user_id)}
        activeOpacity={0.9}
      >
        <Avatar
          uri={plan.user?.profile_image ?? undefined}
          size={36}
        />
        <View>
          <Text style={styles.userName}>{plan.user?.name || 'Unknown User'}</Text>
          <Text style={styles.userTime}>{formatUserTime(plan.timestamp)}</Text>
        </View>
      </TouchableOpacity>

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.title}>{plan.title || 'Untitled Plan'}</Text>
          <Text style={styles.description} numberOfLines={4}>
            {plan.description || 'No description'}
            <Text style={styles.vybemeText}> vybeme!</Text>
          </Text>

          <View style={styles.middleRow}>
            {/* Tags Area */}
            <View style={styles.tagsContainer}>
              {allTags.slice(0, 3).map((tag: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Ionicons
                    name={(TAG_ICONS[tag] || 'ellipse') as any}
                    size={12}
                    color="#555"
                    style={styles.tagIcon}
                  />
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Image Area */}
            {plan.media && plan.media.length > 0 && (
              <Image 
                source={{ uri: plan.media[0].url }} 
                style={styles.eventImage} 
                resizeMode="cover"
              />
            )}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="refresh" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="paper-plane-outline" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.joinButton, joinDisabled && styles.joinButtonDisabled]}
            onPress={joinDisabled ? undefined : () => onJoinPress?.(plan)}
            disabled={joinDisabled}
          >
            <Text style={[styles.joinButtonText, joinDisabled && styles.joinButtonTextDisabled]}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function SavedPlansScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [plans, setPlans] = useState<(SavedPlan & { user?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<(SavedPlan & { user?: any }) | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const response = await apiService.getSavedPosts(user.user_id);
      if (response.data) {
        const plansWithUsers = await Promise.all(
          response.data.map(async (plan: SavedPlan) => {
            const userData = await fetchUserProfile(plan.user_id);
            return { ...plan, user: userData };
          })
        );
        setPlans(plansWithUsers);
      }
    } catch (error) {
      console.error('Error loading saved plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPress = (plan: SavedPlan & { user?: any }) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (plan.user_id && user?.user_id && String(plan.user_id) === String(user.user_id)) {
      Alert.alert('Not allowed', "You can't join or react to your own post.");
      return;
    }
    setSelectedPlan(plan);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No saved plans</Text>
            <Text style={styles.emptySubtext}>Save plans you're interested in!</Text>
          </View>
        ) : (
          plans.map((plan) => {
            const formatTime = (ts: string | Date) => {
              try {
                const d = typeof ts === 'string' ? new Date(ts) : ts;
                return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
              } catch {
                return 'Recently';
              }
            };
            return (
              <View key={plan.post_id} style={styles.savedCardWrapper}>
                <EventCard
                  user={{
                    id: plan.user_id,
                    name: plan.user?.name || 'Unknown User',
                    avatar: plan.user?.profile_image ?? 'https://via.placeholder.com/44',
                    time: plan.timestamp ? formatTime(plan.timestamp) : 'Recently',
                  }}
                  event={{
                    title: plan.title || 'Untitled Plan',
                    description: plan.description || 'No description',
                    tags: plan.tags || [],
                    image: plan.media?.[0]?.url ?? '',
                  }}
                  onUserPress={(userId: string) => {
                    router.push({ pathname: '/profile/[userId]', params: { userId } } as any);
                  }}
                  onJoinPress={() => handleJoinPress(plan)}
                  onSharePress={async () => {
                    try {
                      const baseUrl = getWebBaseUrl().replace(/\/$/, '');
                      const planUrl = `${baseUrl}/post/${plan.post_id}`;
                      const shareMessage = `Check out this plan: ${plan.title || 'Untitled Plan'}\n\n${planUrl}`;
                      await Share.share({ message: shareMessage, url: planUrl, title: plan.title || 'Plan' });
                    } catch (e: any) {
                      if (e?.message !== 'User cancelled') Alert.alert('Error', e?.message || 'Failed to share');
                    }
                  }}
                  joinDisabled={!!(user?.user_id && plan.user_id && String(plan.user_id) === String(user.user_id))}
                />
              </View>
            );
          })
        )}
      </ScrollView>

      {selectedPlan && user?.user_id && (
        <JoinModal
          visible={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          planId={selectedPlan.post_id}
          plan={{
            plan_id: selectedPlan.post_id,
            title: selectedPlan.title,
            description: selectedPlan.description,
            category_sub: selectedPlan.tags || [],
          } as JoinModalPlan}
          author={{
            name: selectedPlan.user?.name || 'Host',
            avatar: selectedPlan.user?.profile_image ?? null,
            time: selectedPlan.timestamp
              ? (() => {
                  try {
                    const d = typeof selectedPlan.timestamp === 'string' ? new Date(selectedPlan.timestamp) : selectedPlan.timestamp;
                    return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                  } catch {
                    return '';
                  }
                })()
              : undefined,
          } as JoinModalAuthor}
          onSuccess={async (payload, type) => {
            try {
              if (type === 'emoji') {
                await apiService.createJoinRequestWithReaction(selectedPlan.post_id, user.user_id, payload);
              } else {
                await apiService.createJoinRequestWithComment(selectedPlan.post_id, user.user_id, payload);
              }
              setSelectedPlan(null);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to send');
              throw err;
            }
          }}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          // After login, user can try joining again
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background based on SS
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20, // Space for first pill
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },

  // --- Card Styles ---
  savedCardWrapper: {
    marginBottom: 24,
    marginTop: 8,
  },
  cardWrapper: {
    marginBottom: 40, // Space between cards to account for pill overflow
    marginTop: 20,    // Space for own pill
    position: 'relative',
  },
  userPill: {
    position: 'absolute',
    top: -24, // Pull up to overlap border
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    // Shadow to pop out
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10, // Ensure on top
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  userTime: {
    fontSize: 11,
    color: '#666',
  },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    paddingTop: 30, // Extra padding for pill area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  cardContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 16,
  },
  vybemeText: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  eventImage: {
    width: 90,
    height: 70,
    borderRadius: 16,
  },
  
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  joinButtonDisabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.9,
  },
  joinButtonTextDisabled: {
    color: '#8E8E93',
  },
});