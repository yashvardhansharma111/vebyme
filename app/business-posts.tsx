import BusinessCard from '@/components/BusinessCard';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppSelector } from '@/store/hooks';
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

export default function BusinessPostsScreen() {
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
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

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

      // Fetch all posts and filter for business plans
      const response = await apiService.getHomeFeed(user?.user_id, {}, { limit: 50, offset: 0 });
      
      if (response.data && Array.isArray(response.data)) {
        // Filter only business plans
        const businessPlans = response.data.filter((post: any) => post.type === 'business');
        setBusinessPostsData(businessPlans);
        const formatted = await formatFeedData(businessPlans);
        setEvents(formatted);
      } else {
        setBusinessPostsData([]);
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
  }, [user, formatFeedData]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = useCallback(() => {
    loadFeed(true);
  }, [loadFeed]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#4A3B69', '#6B5B8E', '#F2F2F7']} 
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.3 }}
          style={styles.topGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Business Plans</Text>
            <View style={styles.placeholder} />
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
                <Text style={styles.emptyText}>No business plans found</Text>
                <Text style={styles.emptySubtext}>Check back later for new business events!</Text>
              </View>
            ) : (
              <View style={styles.feed}>
                {events.map((item) => {
                  const rawPost = businessPostsData.find((p: any) => p.post_id === item.id);
                  return (
                    <BusinessCard
                      key={item.id}
                      plan={{
                        plan_id: item.id,
                        title: item.event.title,
                        description: item.event.description,
                        media: rawPost?.media || [{ url: item.event.image, type: 'image' }],
                        category_main: rawPost?.category_main || '',
                        category_sub: item.event.tags || rawPost?.tags || [],
                        location_text: rawPost?.location_text || '',
                        date: rawPost?.date || rawPost?.timestamp || new Date(),
                        time: rawPost?.time || '',
                        passes: rawPost?.passes || [],
                      }}
                      user={item.user}
                      attendeesCount={rawPost?.joins_count ?? 0}
                      isSwipeable={true}
                      onPress={() => {
                        router.push({ pathname: '/business-plan/[planId]', params: { planId: item.id } } as any);
                      }}
                      onRegisterPress={async () => {
                        if (isAuthenticated && user?.user_id) {
                          try {
                            const alreadyRegistered = await apiService.hasTicketForPlan(item.id, user.user_id);
                            if (alreadyRegistered) {
                              Alert.alert(
                                'Already Registered',
                                "You are already registered for this event. You can check your pass from your profile."
                              );
                              return;
                            }
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
                      onSharePress={() => {
                        if (!isAuthenticated) {
                          setShowLoginModal(true);
                          return;
                        }
                        setSharedBusinessPlan({
                          planId: item.id,
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
    backgroundColor: '#F2F2F7',
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 200,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    paddingTop: 16,
    paddingHorizontal: 0,
  },
  feed: {
    paddingBottom: 20,
  },
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
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
