import BusinessCard from '@/components/BusinessCard';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppSelector } from '@/store/hooks';
import { useSnackbar } from '@/context/SnackbarContext';
import LoginModal from '@/components/LoginModal';
import ShareToChatModal from '@/components/ShareToChatModal';

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
  type?: string;
}

const FILTERS = ['Clubs', 'Today', 'Tomorrow', 'Music', 'Cafe', 'Comedy', 'Sports', 'Travel'];
const CATEGORY_FILTERS = ['Clubs', 'Music', 'Cafe', 'Travel', 'Comedy', 'Sports'];
const TEMPORAL_FILTERS = ['Today', 'Tomorrow'];

function isEventDateInRange(eventDate: string | Date | undefined, filter: string): boolean {
  if (!eventDate) return false;
  const d = typeof eventDate === 'string' ? new Date(eventDate) : new Date(eventDate.getTime());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const eventDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (filter === 'Today') return eventDayStart >= todayStart && eventDayStart < tomorrowStart;
  if (filter === 'Tomorrow') return eventDayStart >= tomorrowStart && eventDayStart < tomorrowStart + 24 * 60 * 60 * 1000;
  return false;
}

function sortPostsByTimestamp(posts: any[]): any[] {
  return [...posts].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });
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
    interacted_users?: Array<{ id: string; avatar?: string | null }>;
  };
}

export default function BusinessPostsScreen() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [businessPostsData, setBusinessPostsData] = useState<any[]>([]); // Store raw post data
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBusinessShareModal, setShowBusinessShareModal] = useState(false);
  const [sharedBusinessPlan, setSharedBusinessPlan] = useState<{
    planId: string;
    title: string;
    description: string;
    media: Array<{ url: string; type?: string }>;
    tags?: string[];
    category_main?: string;
  } | null>(null);
  const [plansUserHasTicket, setPlansUserHasTicket] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const { showSnackbar } = useSnackbar();

  // User profile cache
  const [userCache, setUserCache] = useState<{ [key: string]: { name: string; profile_image: string | null } }>({});

  const fetchUserProfile = useCallback(async (user_id: string) => {
    if (userCache[user_id]) {
      return userCache[user_id];
    }

    const fetchingKey = `fetching_${user_id}`;
    if ((userCache as any)[fetchingKey]) {
      return {
        name: 'Unknown User',
        profile_image: 'https://via.placeholder.com/44',
      };
    }

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
      if (error.message?.includes('User not found') || error.message?.includes('404')) {
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
    } finally {
      setUserCache((prev) => {
        const newCache = { ...prev };
        delete (newCache as any)[fetchingKey];
        return newCache;
      });
    }

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
        const rawInteracted = post.interacted_users || post.recent_interactors || [];
        const interactedUsers = rawInteracted.slice(0, 3).map((u: any) => ({
          id: u.user_id || u.id,
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
      const response = await apiService.getHomeFeed(user?.user_id, filters, { limit: 50, offset: 0 });
      let data = response.data;

      if (data && Array.isArray(data)) {
        let businessPlans = data.filter((post: any) => post.type === 'business');
        if (currentFilter && TEMPORAL_FILTERS.includes(currentFilter)) {
          businessPlans = businessPlans.filter((p: any) => isEventDateInRange(p.date ?? p.timestamp, currentFilter));
        }
        businessPlans = sortPostsByTimestamp(businessPlans);
        setBusinessPostsData(businessPlans);
        const formatted = await formatFeedData(businessPlans);
        setEvents(formatted);

        if (user?.user_id && businessPlans.length > 0) {
          const planIds = businessPlans.map((p: any) => p.repost_data?.original_plan_id || p.post_id);
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
        setBusinessPostsData([]);
        setPlansUserHasTicket({});
        setEvents([]);
      }
    } catch (err: any) {
      console.error('Error loading business feed:', err);
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
        {/* Full-page gradient: light gray top → green → white */}
        <LinearGradient
          colors={['#E0E0E0', '#B8D4BE', '#FFFFFF']}
          locations={[0, 0.5, 1]}
          style={styles.pageGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Back button + Filter tags in one row – no header title */}
          <View style={styles.headerWithFilters}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {(activeFilter ? [activeFilter, ...FILTERS.filter(f => f !== activeFilter)] : FILTERS).map((filter) => {
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
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFF" />
            }
          >
            {isLoading && events.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A3B69" />
                <Text style={styles.loadingText}>Loading business plans...</Text>
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
                  onPress={() => router.push('/(tabs)/createBusinessPost')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createPlanCtaText}>Create a plan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.feed}>
                {events.map((item, index) => {
                  const rawPost = businessPostsData.find((p: any) => p.post_id === item.id);
                  const effectivePlanId = rawPost?.repost_data?.original_plan_id || item.id;
                  return (
                    <BusinessCard
                      key={item.id}
                      containerStyle={styles.businessCardInList}
                      pillsAboveCard
                      compactVerticalPadding
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
                      isSwipeable={true}
                      hideRegisterButton={false}
                      registerButtonGreyed={rawPost?.user_id === user?.user_id || !!plansUserHasTicket[effectivePlanId]}
                      onPress={() => {
                        router.push({ pathname: '/business-plan/[planId]', params: { planId: effectivePlanId } } as any);
                      }}
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
                        if (!isAuthenticated) {
                          router.push('/login');
                        }
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
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          loadFeed();
        }}
      />
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
    backgroundColor: '#FFFFFF',
  },
  pageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  businessCardInList: {
    marginBottom: 8,
  },
  feed: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerWithFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 35,
    marginBottom: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(2, 2, 2, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    paddingBottom: 20,
    paddingTop: 8,
    paddingHorizontal: 0,
  },
  stickyFilterWrap: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
    zIndex: 10,
  },
  filterScroll: {
    flex: 1, marginBottom: 16 },
  filterContent: { paddingHorizontal: 20, gap: 12 },
  activeFilterChip: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  activeFilterText: { color: '#FFF', fontWeight: '600' },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  filterText: { color: '#1C1C1E', fontWeight: '600' },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  createPlanCta: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    marginTop: 16,
  },
  createPlanCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
