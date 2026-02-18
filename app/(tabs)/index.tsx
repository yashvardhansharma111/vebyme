import BusinessCard from '@/components/BusinessCard';
import SwipeableEventCard from '@/components/SwipeableEventCard';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';
import { clearPostCreated } from '@/store/slices/postCreatedSlice';
import { useSnackbar } from '@/context/SnackbarContext';
import ShareToChatModal from '@/components/ShareToChatModal';
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

const FILTERS = ['Running', 'Social', 'Fitness', 'Sports', 'Today', 'Tomorrow', 'Weekend'];
const CATEGORY_FILTERS = ['Running', 'Social', 'Fitness', 'Sports'];
const TEMPORAL_FILTERS = ['Today', 'Tomorrow', 'Weekend'];

function isEventDateInRange(eventDate: string | Date | undefined, filter: string): boolean {
  if (!eventDate) return false;
  const d = typeof eventDate === 'string' ? new Date(eventDate) : new Date(eventDate.getTime());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const eventDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
  if (filter === 'Today') return eventDayStart >= todayStart && eventDayStart < tomorrowStart;
  if (filter === 'Tomorrow') return eventDayStart >= tomorrowStart && eventDayStart < tomorrowStart + 24 * 60 * 60 * 1000;
  if (filter === 'Weekend') return dayOfWeek === 0 || dayOfWeek === 6;
  return false;
}

function sortPostsByTimestamp(posts: any[]): any[] {
  return [...posts].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });
}

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
    is_repost?: boolean;
    repost_data?: { original_plan_id?: string } | null;
    original_author_name?: string;
    original_post_title?: string;
    original_post_description?: string;
    interacted_users?: Array<{ id: string; avatar?: string | null }>;
  };
}

export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [businessEvents, setBusinessEvents] = useState<FormattedEvent[]>([]);
  const [businessPostsData, setBusinessPostsData] = useState<any[]>([]); // Store raw post data for BusinessCard
  const [plansUserHasTicket, setPlansUserHasTicket] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBusinessShareModal, setShowBusinessShareModal] = useState(false);
  const [sharedBusinessPlan, setSharedBusinessPlan] = useState<{
    planId: string;
    title: string;
    description: string;
    media: Array<{ url: string; type?: string }>;
    tags?: string[];
    category_main?: string;
  } | null>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const postCreated = useAppSelector((state) => state.postCreated?.value ?? null);
  const { showSnackbar } = useSnackbar();

  // User profile cache to avoid fetching same user multiple times
  const [userCache, setUserCache] = useState<{ [key: string]: { name: string; profile_image: string | null } }>({});
  const scrollViewRef = useRef<ScrollView>(null);

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
            category_main: post.category_main ?? '',
            category_sub: post.category_sub || [],
            temporal_tags: post.temporal_tags || [],
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

  const loadFeed = useCallback(async (isRefresh = false, filterOverride?: string | null) => {
    const currentFilter = filterOverride !== undefined ? filterOverride : activeFilter;
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (filterOverride === undefined) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const filters: any = {};
      if (currentFilter && CATEGORY_FILTERS.includes(currentFilter)) {
        filters.category_main = currentFilter.toLowerCase();
      }

      const response = await apiService.getHomeFeed(user?.user_id, filters, { limit: 30, offset: 0 });
      let data = response.data;

      if (data && Array.isArray(data)) {
        if (currentFilter && TEMPORAL_FILTERS.includes(currentFilter)) {
          data = data.filter((p: any) => isEventDateInRange(p.date ?? p.timestamp, currentFilter));
        }
        data = sortPostsByTimestamp(data);
        const feedData = data ?? [];

        const formatted = await formatFeedData(feedData);

        const businessPlans = formatted.filter(item => {
          const post = feedData.find((p: any) => p.post_id === item.id);
          return post?.type === 'business';
        });
        const rawBusinessPosts = feedData.filter((p: any) => p.type === 'business');
        setBusinessPostsData(rawBusinessPosts);

        const regularPlans = formatted.filter(item => {
          const post = feedData.find((p: any) => p.post_id === item.id);
          return post?.type !== 'business';
        });

        setBusinessEvents(businessPlans);
        setEvents(regularPlans);

        // For logged-in user, check which business plans they've already joined (have ticket)
        if (user?.user_id && rawBusinessPosts.length > 0) {
          const planIds = rawBusinessPosts.map((p: any) => p.repost_data?.original_plan_id || p.post_id);
          const uniqueIds = Array.from(new Set(planIds));
          const ticketMap: Record<string, boolean> = {};
          await Promise.all(
            uniqueIds.map(async (planId) => {
              try {
                const hasTicket = await apiService.hasTicketForPlan(planId, user.user_id);
                ticketMap[planId] = hasTicket;
              } catch {
                ticketMap[planId] = false;
              }
            })
          );
          setPlansUserHasTicket(ticketMap);
        } else {
          setPlansUserHasTicket({});
        }
      } else {
        setBusinessEvents([]);
        setBusinessPostsData([]);
        setPlansUserHasTicket({});
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

  // When returning from create post with success, refresh feed so new post appears (no 2nd popup – first one with preview is in create flow)
  useFocusEffect(
    useCallback(() => {
      if (postCreated) {
        loadFeed(true);
        dispatch(clearPostCreated());
      }
    }, [postCreated, loadFeed, dispatch])
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Same gradient as business-posts: light gray top → green → white */}
        <LinearGradient
          colors={['#E0E0E0', '#B8D4BE', '#FFFFFF']}
          locations={[0, 0.5, 1]}
          style={styles.pageGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Header – fixed at top */}
          <View style={styles.header}>
            <View style={styles.locationContainer}>
              <View style={styles.locationIconBg}>
                <Ionicons name="location-sharp" size={18} color="#1C1C1E" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.locationTitle}>Bengaluru</Text>
                {/* <Text style={styles.locationSubtitle}>Bengaluru</Text> */}
              </View>
            </View>
            <View style={styles.headerRight}>
              {isAuthenticated && currentUser?.is_business && (
                <TouchableOpacity
                  style={styles.qrScannerButton}
                  onPress={() => router.push('/qr-scanner')}
                >
                  <Ionicons name="qr-code-outline" size={24} color="#1C1C1E" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  if (isAuthenticated) {
                    router.push('/profile');
                  } else {
                    router.push('/login');
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

          {/* Categories – sticky below header, stays visible when scrolling */}
          <View style={styles.stickyFilterWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {(activeFilter ? [activeFilter, ...FILTERS.filter(f => f !== activeFilter)] : FILTERS).map((filter, index) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={isActive ? styles.activeFilterChip : styles.filterChip}
                    onPress={() => {
                      setActiveFilter(isActive ? null : filter);
                      loadFeed(false, isActive ? null : filter);
                    }}
                  >
                    <Text style={isActive ? styles.activeFilterText : styles.filterText}>{filter}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFF" />
            }
          >
            {/* Business plans – horizontally scrollable */}
            {businessEvents.length > 0 && (
              <View style={styles.businessHorizontalWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.businessHorizontalContent}
                >
                  {businessEvents.map((item) => {
                    const rawPost = businessPostsData.find((p: any) => p.post_id === item.id);
                    // For reposts, use original plan id so plan detail and APIs (e.g. getBusinessPlan) don't 404
                    const effectivePlanId = item.event?.repost_data?.original_plan_id || item.id;
                    return (
                      <View key={item.id} style={styles.businessHorizontalCard}>
                        <BusinessCard
                          plan={{
                            plan_id: effectivePlanId,
                            title: item.event.title,
                            description: item.event.description,
                            media: rawPost?.media || [{ url: item.event.image, type: 'image' }],
                            category_main: rawPost?.category_main ?? '',
                            category_sub: rawPost?.category_sub || item.event.tags || rawPost?.tags || [],
                            temporal_tags: rawPost?.temporal_tags || [],
                            location_text: rawPost?.location_text || '',
                            date: rawPost?.date || rawPost?.timestamp || new Date(),
                            time: rawPost?.time || '',
                            passes: rawPost?.passes || [],
                            add_details: rawPost?.add_details || [],
                            user: { user_id: rawPost?.user_id || item.user?.id, name: item.user?.name, profile_image: item.user?.avatar },
                          }}
                          user={item.user}
                          attendeesCount={rawPost?.joins_count ?? 0}
                          interactedUsers={item.event?.interacted_users}
                          isSwipeable={false}
                          containerStyle={styles.businessHorizontalCardInner}
                          fillHeight={true}
                          descriptionNumberOfLines={2}
                          showArrowButton={true}
                          onArrowPress={() => router.push({ pathname: '/business-posts', params: { filter: activeFilter ?? '' } } as any)}
                          onPress={() => {
                            router.push({ pathname: '/business-plan/[planId]', params: { planId: effectivePlanId } } as any);
                          }}
                          hideRegisterButton={false}
                          registerButtonGreyed={rawPost?.user_id === user?.user_id || !!plansUserHasTicket[effectivePlanId]}
                          onRegisterPress={() => {
                            if (!isAuthenticated || !user?.user_id) {
                              router.push('/login');
                              return;
                            }
                            if (rawPost?.user_id === user?.user_id) {
                              Alert.alert('Cannot Register', "You can't register for your own event.");
                              return;
                            }
                            if (rawPost?.is_women_only) {
                              const gender = (currentUser?.gender || '').toLowerCase();
                              if (gender !== 'female') {
                                showSnackbar('The post is for women only');
                                return;
                              }
                            }
                            // Open plan detail first so user can select a pass, then register
                            router.push({ pathname: '/business-plan/[planId]', params: { planId: effectivePlanId } } as any);
                          }}
                          onRequireAuth={() => {
                            if (!isAuthenticated) router.push('/login');
                          }}
                          onSharePress={() => {
                            if (!isAuthenticated) {
                              router.push('/login');
                              return;
                            }
                            setSharedBusinessPlan({
                              planId: effectivePlanId,
                              title: item.event.title,
                              description: item.event.description,
                              media: rawPost?.media || [{ url: item.event.image, type: 'image' }],
                              tags: item.event.tags || rawPost?.tags,
                              category_main: rawPost?.category_main,
                            });
                            setShowBusinessShareModal(true);
                          }}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {isLoading && businessEvents.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
            {!isLoading && businessEvents.length === 0 && !error && (
              <View style={styles.heroCardWrap}>
                <View style={styles.heroPlaceholderCard}>
                  <Text style={styles.heroPlaceholderText}>No plans in your area</Text>
                  <TouchableOpacity
                    style={styles.createPlanCta}
                    onPress={() => router.push('/(tabs)/createPost')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.createPlanCtaText}>Create a plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {error && businessEvents.length === 0 && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadFeed()}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* See what others are planning – scroll down 60% to user posts */}
            <TouchableOpacity
              style={styles.seeOthersButton}
              onPress={() => {
                scrollViewRef.current?.scrollTo({ y: SCREEN_HEIGHT * 0.72, animated: true });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.seeOthersButtonText}>See what others are planning</Text>
              <Ionicons name="chevron-down" size={20} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {/* User-generated posts (scroll down ~60% to see this section) */}
            <View style={styles.userFeedSection}>
              {isLoading && events.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4A3B69" />
                  <Text style={styles.loadingText}>Loading posts...</Text>
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
                  <Text style={styles.emptyText}>No plans in your area</Text>
                  <TouchableOpacity
                    style={styles.createPlanCta}
                    onPress={() => router.push('/(tabs)/createPost')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.createPlanCtaText}>Create a plan</Text>
                  </TouchableOpacity>
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
                        router.push('/login');
                      }
                    }}
                    onRequireAuth={() => {
                      if (!isAuthenticated) router.push('/login');
                    }}
                  />
                ))
              )}

              {/* CTA at end of home feed */}
              <View style={styles.ctaSection}>
                <Text style={styles.ctaText}>Didn&apos;t find a plan,</Text>
                <TouchableOpacity
                  style={styles.createCtaButton}
                  onPress={() => {
                    if (!isAuthenticated) {
                      router.push('/login');
                      return;
                    }
                    if (currentUser?.is_business) {
                      router.push('/(tabs)/createBusinessPost');
                    } else {
                      router.push('/(tabs)/createPost');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createCtaButtonText}>Create your own</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Bottom vignette behind tabs */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.06)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      </View>
      {sharedBusinessPlan && (
        <ShareToChatModal
          visible={showBusinessShareModal}
          onClose={() => {
            setShowBusinessShareModal(false);
            setSharedBusinessPlan(null);
          }}
          postId={sharedBusinessPlan.planId}
          postTitle={sharedBusinessPlan.title}
          postDescription={sharedBusinessPlan.description}
          postMedia={sharedBusinessPlan.media}
          postTags={sharedBusinessPlan.tags}
          postCategoryMain={sharedBusinessPlan.category_main}
          postIsBusiness={true}
          userId={user?.user_id ?? ''}
          currentUserAvatar={currentUser?.profile_image ?? undefined}
        />
      )}

    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8ECF1',
  },
  pageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
  locationTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  locationSubtitle: { fontSize: 13, color: '#1C1C1E' },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  guestAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  stickyFilterWrap: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
    zIndex: 10,
  },
  filterScroll: { marginBottom: 16 },
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
    marginBottom: 20,
  },
  businessSectionTitle: {
    fontSize: 22,
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
    marginTop: 22,
    width: 320,
    marginHorizontal: 0,
    marginRight: 16,
  },
  businessHorizontalWrap: {
    height: 24 + SCREEN_HEIGHT * 0.59,
    marginBottom: 12,
  },
  businessHorizontalContent: {
    paddingHorizontal: 20,
    paddingRight: 24,
    paddingTop: 24,
    gap: 16,
  },
  businessHorizontalCard: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.59,
    marginRight: 16,
  },
  businessHorizontalCardInner: {
    width: '100%',
    height: '100%',
    marginHorizontal: 0,
  },
  heroCardWrap: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  heroBusinessCard: {
    width: '100%',
    marginHorizontal: 0,
  },
  heroPlaceholderCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  createPlanCta: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  createPlanCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  seeOthersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
  },
  seeOthersButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  userFeedSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ctaSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  createCtaButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
  },
  createCtaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});