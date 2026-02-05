import SwipeableEventCard from '@/components/SwipeableEventCard';
import BusinessCard from '@/components/BusinessCard';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, Image, Platform, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';
import LoginModal from '@/components/LoginModal';
import { Colors } from '@/constants/theme';
import Avatar from '@/components/Avatar';

function ProfileAvatar() {
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (user?.session_id && !currentUser) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [user, currentUser, dispatch]);

  return (
    <Avatar
      uri={currentUser?.profile_image}
      size={44}
      style={styles.headerAvatar}
      showBorder={true}
      borderColor="rgba(255,255,255,0.5)"
    />
  );
}

const FILTERS = ['Clubs', 'Today', 'Music', 'Cafe', 'Comedy', 'Sports'];

interface FeedPost {
  post_id: string;
  user_id: string;
  title: string;
  description: string;
  media: Array<{ url: string; type: string }>;
  tags: string[];
  timestamp: string | Date;
  location: any;
  is_active: boolean;
  interaction_count: number;
}

interface FormattedEvent {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    time: string;
  };
  event: {
    title: string;
    description: string;
    tags: string[];
    image: string;
  };
}

export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState('Clubs');
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [businessEvents, setBusinessEvents] = useState<FormattedEvent[]>([]);
  const [businessPostsData, setBusinessPostsData] = useState<any[]>([]); // Store raw post data for BusinessCard
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

  // User profile cache to avoid fetching same user multiple times
  const [userCache, setUserCache] = useState<{ [key: string]: { name: string; profile_image: string | null } }>({});

  useEffect(() => {
    if (user?.session_id && !currentUser) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [user, currentUser, dispatch]);

  const fetchUserProfile = useCallback(async (user_id: string) => {
    // Check cache first - if we've already fetched this user (even if they don't exist), return cached data
    if (userCache[user_id]) {
      return userCache[user_id];
    }

    // Check if we're currently fetching this user to avoid duplicate requests
    const fetchingKey = `fetching_${user_id}`;
    if ((userCache as any)[fetchingKey]) {
      // Wait a bit and return default to avoid blocking
      return {
        name: 'Unknown User',
        profile_image: 'https://via.placeholder.com/44',
      };
    }

    // Mark as fetching
    (userCache as any)[fetchingKey] = true;

    try {
      const response = await apiService.getUserProfile(user_id);
      if (response.data) {
        const userData = {
          name: response.data.name || 'Unknown User',
          profile_image: response.data.profile_image || 'https://via.placeholder.com/44',
        };
        setUserCache((prev) => {
          const newCache = { ...prev, [user_id]: userData };
          delete (newCache as any)[fetchingKey];
          return newCache;
        });
        return userData;
      }
    } catch (error: any) {
      // Silently handle missing users - don't log errors for 404s
      // This is expected when users are deleted or don't exist
      if (error.message?.includes('User not found') || error.message?.includes('404')) {
        // User doesn't exist, use default values and cache it to prevent future requests
        const defaultData = {
          name: 'Unknown User',
          profile_image: 'https://via.placeholder.com/44',
        };
        setUserCache((prev) => {
          const newCache = { ...prev, [user_id]: defaultData };
          delete (newCache as any)[fetchingKey];
          return newCache;
        });
        return defaultData;
      }
      // Only log unexpected errors (not user not found)
      // Silently ignore expected errors
    } finally {
      // Clean up fetching flag
      setUserCache((prev) => {
        const newCache = { ...prev };
        delete (newCache as any)[fetchingKey];
        return newCache;
      });
    }

    // Return default if fetch fails
    const defaultData = {
      name: 'Unknown User',
      profile_image: 'https://via.placeholder.com/44',
    };
    setUserCache((prev) => {
      const newCache = { ...prev, [user_id]: defaultData };
      delete (newCache as any)[fetchingKey];
      return newCache;
    });
    return defaultData;
  }, [userCache]);

  const formatTimestamp = (timestamp: string | Date): string => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  const formatFeedData = useCallback(async (posts: FeedPost[]): Promise<FormattedEvent[]> => {
    const formattedEvents = await Promise.all(
      posts.map(async (post: any) => {
        const userData = await fetchUserProfile(post.user_id);
        const imageUrl = post.media && post.media.length > 0 ? post.media[0].url : 'https://picsum.photos/id/1011/200/300';

        // Handle reposts
        let originalAuthorName = null;
        let originalPostTitle = null;
        let originalPostDescription = null;
        
        let originalAuthorAvatar = null;
        if (post.is_repost && post.repost_data) {
          const originalAuthorData = await fetchUserProfile(post.repost_data.original_author_id);
          originalAuthorName = originalAuthorData.name;
          originalAuthorAvatar = originalAuthorData.profile_image || null;

          // Get original post details
          try {
            const originalPost = await apiService.getPost(post.repost_data.original_plan_id);
            if (originalPost.data) {
              originalPostTitle = originalPost.data.title;
              originalPostDescription = originalPost.data.description;
            }
          } catch (error) {
            // Silently handle errors
          }
        }

        // Interacted users: backend may send interacted_users or recent_interactor_ids
        const rawInteracted = post.interacted_users || post.recent_interactors || [];
        const interactedUsers = rawInteracted.slice(0, 3).map((u: any) => ({
          id: u.user_id || u.id,
          name: u.name || 'User',
          avatar: u.profile_image || u.avatar || null,
        }));

        return {
          id: post.post_id,
          user: {
            id: post.user_id,
            name: userData.name,
            avatar: userData.profile_image || 'https://via.placeholder.com/44',
            time: formatTimestamp(post.timestamp),
          },
          event: {
            title: post.title || 'Untitled Post',
            description: post.description || 'No description',
            tags: post.tags && post.tags.length > 0 ? post.tags : ['General'],
            image: imageUrl,
            is_repost: post.is_repost || !!(post.repost_data),
            repost_data: post.repost_data || null,
            // Reposter's title/description (prefer repost_data; avoid falling back to original)
            repost_title: post.repost_data?.repost_title ?? post.repost_title ?? (post.is_repost || post.repost_data ? '' : post.title),
            repost_description: post.repost_data?.repost_description ?? post.repost_description ?? (post.is_repost || post.repost_data ? '' : post.description),
            original_author_name: originalAuthorName,
            original_author_avatar: originalAuthorAvatar,
            original_post_title: originalPostTitle || post.title,
            original_post_description: originalPostDescription || post.description,
            interaction_count: post.interaction_count ?? 0,
            interacted_users: interactedUsers,
          },
        };
      })
    );

    return formattedEvents;
  }, [fetchUserProfile]);

  const loadFeed = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Map filter to category if applicable
      const filters: any = {};
      const categoryFilters = ['Clubs', 'Music', 'Cafe'];
      if (activeFilter && categoryFilters.includes(activeFilter)) {
        filters.category_main = activeFilter.toLowerCase();
      }
      // Note: 'Today', 'Comedy', 'Sports' filters could be implemented with temporal_tags or other logic
      // For now, we'll just show all posts when these are selected

      // Allow guests to view feed (user_id is optional)
      const response = await apiService.getHomeFeed(user?.user_id, filters, { limit: 30, offset: 0 });
      
      if (response.data && Array.isArray(response.data)) {
        const formatted = await formatFeedData(response.data);
        
        // Separate business plans from regular plans
        const businessPlans = formatted.filter(item => {
          const post = response.data.find((p: any) => p.post_id === item.id);
          return post?.type === 'business';
        });
        
        // Store raw business post data for BusinessCard component
        const rawBusinessPosts = response.data.filter((p: any) => p.type === 'business');
        setBusinessPostsData(rawBusinessPosts);
        
        // Filter out business plans from main feed
        const regularPlans = formatted.filter(item => {
          const post = response.data.find((p: any) => p.post_id === item.id);
          return post?.type !== 'business';
        });
        
        setBusinessEvents(businessPlans);
        setEvents(regularPlans);
      } else {
        setBusinessEvents([]);
        setBusinessPostsData([]);
        setEvents([]);
      }
    } catch (err: any) {
      console.error('Error loading feed:', err);
      setError(err.message || 'Failed to load feed');
      setEvents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, activeFilter, formatFeedData]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = useCallback(() => {
    loadFeed(true);
  }, [loadFeed]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        
        {/* 1. TOP GRADIENT (Purple -> Transparent) */}
        <LinearGradient
          colors={['#4A3B69', '#6B5B8E', '#F2F2F7']} 
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }} // Stops earlier so it doesn't cover whole screen
          style={styles.topGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFF" />
            }
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.locationContainer}>
                <View style={styles.locationIconBg}>
                  <Ionicons name="location-sharp" size={18} color="#FFF" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.locationTitle}>Indiranagar</Text>
                    <Ionicons name="chevron-down" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                  <Text style={styles.locationSubtitle}>Bengaluru</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                {/* QR Scanner Icon for Business Owners */}
                {isAuthenticated && currentUser?.is_business && (
                  <TouchableOpacity
                    style={styles.qrScannerButton}
                    onPress={() => router.push('/qr-scanner')}
                  >
                    <Ionicons name="qr-code-outline" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    if (isAuthenticated) {
                      router.push('/profile');
                    } else {
                      setShowLoginModal(true);
                    }
                  }}
                >
                  {isAuthenticated ? (
                    <ProfileAvatar />
                  ) : (
                    <View style={styles.guestAvatar}>
                      <Ionicons name="person-outline" size={24} color={Colors.light.text} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {FILTERS.map((filter, index) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={index}
                    style={isActive ? styles.activeFilterChip : styles.filterChip}
                    onPress={() => {
                      setActiveFilter(filter);
                      // Feed will reload automatically via useEffect when activeFilter changes
                    }}
                  >
                    <Text style={isActive ? styles.activeFilterText : styles.filterText}>{filter}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Business Plans Horizontal Section */}
            {businessEvents.length > 0 && (
              <View style={styles.businessSection}>
                <View style={styles.businessSectionHeader}>
                  <Text style={styles.businessSectionTitle}>Happening near me</Text>
                  <TouchableOpacity
                    style={styles.businessSectionArrow}
                    onPress={() => router.push('/business-posts')}
                  >
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.businessScrollContent}
                >
                  {businessEvents.map((item, index) => {
                    const rawPost = businessPostsData.find((p: any) => p.post_id === item.id);
                    return (
                      <BusinessCard
                        key={item.id}
                        plan={{
                          plan_id: item.id,
                          title: item.event.title,
                          description: item.event.description,
                          media: rawPost?.media || [{ url: item.event.image, type: 'image' }],
                          category_sub: item.event.tags,
                          location_text: rawPost?.location_text || '',
                          date: rawPost?.timestamp || new Date(),
                          time: rawPost?.time || '',
                        }}
                        user={item.user}
                        attendeesCount={7}
                        isSwipeable={false}
                        containerStyle={styles.businessCardContainer}
                        onPress={() => {
                          router.push({ pathname: '/business-plan/[planId]', params: { planId: item.id } } as any);
                        }}
                        onRegisterPress={async () => {
                          if (isAuthenticated && user?.user_id) {
                            try {
                              const response = await apiService.registerForEvent(item.id, user.user_id);
                              if (response.success && response.data?.ticket) {
                                const ticketData = encodeURIComponent(JSON.stringify(response.data.ticket));
                                router.push({
                                  pathname: '/ticket/[ticketId]',
                                  params: { 
                                    ticketId: response.data.ticket.ticket_id,
                                    planId: item.id,
                                    ticketData: ticketData
                                  }
                                } as any);
                              }
                            } catch (error: any) {
                              Alert.alert('Registration Failed', error.message || 'Failed to register for event');
                            }
                          } else {
                            setShowLoginModal(true);
                          }
                        }}
                        onRequireAuth={() => {
                          if (!isAuthenticated) {
                            setShowLoginModal(true);
                          }
                        }}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Feed */}
            <View style={styles.feed}>
              {isLoading && events.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4A3B69" />
                  <Text style={styles.loadingText}>Loading feed...</Text>
                </View>
              ) : error && events.length === 0 ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={() => loadFeed()}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : events.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No posts found</Text>
                  <Text style={styles.emptySubtext}>Be the first to create a post!</Text>
                </View>
              ) : (
                events.map((item) => (
                  <SwipeableEventCard
                    key={item.id}
                    user={item.user}
                    event={item.event}
                    postId={item.id}
                    isRepost={item.event.is_repost || false}
                    originalAuthor={item.event.original_author_name}
                    originalPostTitle={item.event.original_post_title}
                    originalPostDescription={item.event.original_post_description}
                    onUserPress={(userId: string) => {
                      if (isAuthenticated) {
                        router.push({ pathname: '/profile/[userId]', params: { userId } } as any);
                      } else {
                        setShowLoginModal(true);
                      }
                    }}
                    onRequireAuth={() => {
                      if (!isAuthenticated) {
                        setShowLoginModal(true);
                      }
                    }}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* 2. BOTTOM GRADIENT (Transparent -> Dark Fade) */}
        {/* This sits absolutely at the bottom to create the vignette behind tabs */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.2)']} 
          style={styles.bottomGradient}
          pointerEvents="none" // Allows touching through the gradient
        />
        
      </View>
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          // Reload feed after login
          loadFeed();
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', 
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 400,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150, // Height of the fade at the bottom
    zIndex: 1, // Above content, below tabs (Tabs are zIndex 100)
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingBottom: 130, // Ensure content isn't hidden by bottom tabs
    paddingTop: 10,
  },
  // ... Header, Filter, and Card Styles remain exactly as previously defined ...
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qrScannerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  locationIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  locationTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  locationSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  guestAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  filterScroll: { marginBottom: 24 },
  filterContent: { paddingHorizontal: 20, gap: 12 },
  activeFilterChip: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  activeFilterText: { color: '#FFF', fontWeight: '600' },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  filterText: { color: '#333', fontWeight: '600' },
  feed: { paddingBottom: 20 },
  loadingContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  errorContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14, color: '#FF3B30', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
  businessSection: {
    marginBottom: 24,
  },
  businessSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  businessSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  businessSectionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessScrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  businessCardContainer: {
    width: 320,
    marginHorizontal: 0,
    marginRight: 16,
  },
});