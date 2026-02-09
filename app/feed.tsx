import SwipeableEventCard from '@/components/SwipeableEventCard';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Platform, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import LoginModal from '@/components/LoginModal';

const FILTERS = ['Clubs', 'Today', 'Music', 'Cafe', 'Comedy', 'Sports', 'Travel'];
const CATEGORY_FILTERS = ['Clubs', 'Music', 'Cafe', 'Travel'];

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
  user: { id: string; name: string; avatar: string; time: string };
  event: {
    title: string;
    description: string;
    tags: string[];
    image: string;
    is_repost?: boolean;
    repost_data?: any;
    repost_title?: string;
    repost_description?: string;
    original_author_name?: string | null;
    original_author_avatar?: string | null;
    original_post_title?: string | null;
    original_post_description?: string | null;
    interaction_count?: number;
    interacted_users?: any[];
  };
}

export default function FeedScreen() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const [userCache, setUserCache] = useState<{ [key: string]: { name: string; profile_image: string | null } }>({});

  const fetchUserProfile = useCallback(async (user_id: string) => {
    if (userCache[user_id]) return userCache[user_id];
    const fetchingKey = `fetching_${user_id}`;
    if ((userCache as any)[fetchingKey]) {
      return { name: 'Unknown User', profile_image: 'https://via.placeholder.com/44' };
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
          const next = { ...prev, [user_id]: userData };
          delete (next as any)[fetchingKey];
          return next;
        });
        return userData;
      }
    } catch (e: any) {
      if (e.message?.includes('User not found') || e.message?.includes('404')) {
        const def = { name: 'Unknown User', profile_image: 'https://via.placeholder.com/44' };
        setUserCache((prev) => ({ ...prev, [user_id]: def }));
        return def;
      }
    } finally {
      setUserCache((prev) => {
        const next = { ...prev };
        delete (next as any)[fetchingKey];
        return next;
      });
    }
    return { name: 'Unknown User', profile_image: 'https://via.placeholder.com/44' };
  }, [userCache]);

  const formatTimestamp = (ts: string | Date): string => {
    try {
      const date = typeof ts === 'string' ? new Date(ts) : ts;
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

  const formatFeedData = useCallback(async (posts: any[]): Promise<FormattedEvent[]> => {
    const formatted = await Promise.all(
      posts.map(async (post: any) => {
        const userData = await fetchUserProfile(post.user_id);
        const imageUrl = post.media?.length > 0 ? post.media[0].url : 'https://picsum.photos/id/1011/200/300';
        let originalAuthorName: string | null = null;
        let originalPostTitle: string | null = null;
        let originalPostDescription: string | null = null;
        let originalAuthorAvatar: string | null = null;
        if (post.is_repost && post.repost_data) {
          const orig = await fetchUserProfile(post.repost_data.original_author_id);
          originalAuthorName = orig.name;
          originalAuthorAvatar = orig.profile_image || null;
          try {
            const op = await apiService.getPost(post.repost_data.original_plan_id);
            if (op.data) {
              originalPostTitle = op.data.title;
              originalPostDescription = op.data.description;
            }
          } catch (_) {}
        }
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
            tags: post.tags?.length > 0 ? post.tags : ['General'],
            image: imageUrl,
            is_repost: post.is_repost || !!(post.repost_data),
            repost_data: post.repost_data || null,
            repost_title: post.repost_data?.repost_title ?? post.repost_title ?? '',
            repost_description: post.repost_data?.repost_description ?? post.repost_description ?? '',
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
    return formatted;
  }, [fetchUserProfile]);

  const loadFeed = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      const filters: any = {};
      if (activeFilter && CATEGORY_FILTERS.includes(activeFilter)) {
        filters.category_main = activeFilter.toLowerCase();
      }
      const response = await apiService.getHomeFeed(user?.user_id, filters, { limit: 30, offset: 0 });
      if (response.data && Array.isArray(response.data)) {
        const regularOnly = response.data.filter((p: any) => p.type !== 'business');
        const formatted = await formatFeedData(regularOnly);
        setEvents(formatted);
      } else {
        setEvents([]);
      }
    } catch (err: any) {
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

  const handleCreateYourOwn = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (currentUser?.is_business) {
      router.push('/(tabs)/createBusinessPost');
    } else {
      router.push('/(tabs)/createPost');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4A3B69', '#6B5B8E', '#F2F2F7']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={styles.topGradient}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>What others are planning</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadFeed(true)} tintColor="#FFF" />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {FILTERS.map((f, i) => {
              const isActive = activeFilter === f;
              return (
                <TouchableOpacity key={i} style={isActive ? styles.activeFilterChip : styles.filterChip} onPress={() => setActiveFilter(f)}>
                  <Text style={isActive ? styles.activeFilterText : styles.filterText}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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
          ) : (
            <View style={styles.feed}>
              {events.map((item) => (
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
                    if (isAuthenticated) router.push({ pathname: '/profile/[userId]', params: { userId } } as any);
                    else setShowLoginModal(true);
                  }}
                  onRequireAuth={() => {
                    if (!isAuthenticated) setShowLoginModal(true);
                  }}
                />
              ))}

              {/* CTA at end of home feed */}
              <View style={styles.ctaSection}>
                <Text style={styles.ctaText}>Didn&apos;t find a plan,</Text>
                <TouchableOpacity style={styles.createCtaButton} onPress={handleCreateYourOwn} activeOpacity={0.8}>
                  <Text style={styles.createCtaButtonText}>Create your own</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          loadFeed();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  topGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 280 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  placeholder: { width: 40 },
  scrollContainer: { paddingBottom: 120, paddingTop: 8 },
  filterScroll: { marginBottom: 20 },
  filterContent: { paddingHorizontal: 20, gap: 12 },
  activeFilterChip: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  activeFilterText: { color: '#FFF', fontWeight: '600' },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  filterText: { color: '#1C1C1E', fontWeight: '600' },
  feed: { paddingBottom: 24 },
  loadingContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  errorContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14, color: '#FF3B30', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  ctaSection: {
    marginTop: 32,
    marginBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    color: '#3C3C43',
    marginBottom: 12,
  },
  createCtaButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  createCtaButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
