import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, borderRadius, Fonts } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setChatUnreadCount } from '@/store/slices/chatSlice';
import { apiService } from '@/services/api';
import Avatar from '@/components/Avatar';

type TabType = 'their_plans' | 'my_plans' | 'groups' | 'my_events' | 'unread';

interface ChatItem {
  group_id: string;
  plan_id: string;
  plan_title: string;
  plan_description: string;
  plan_media: any[];
  author_id: string;
  author_name: string;
  author_image: string | null;
  other_user?: {
      name: string;
      profile_image: string | null;
  };
  last_message: {
    content: any;
    type: string;
    timestamp: Date;
    user_id: string;
  } | null;
  member_count: number;
  is_group: boolean;
  group_name: string;
  is_announcement_group?: boolean;
  unread_count?: number;
}

export default function ChatScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const isBusinessUser = currentUser?.is_business === true;
  const [activeTab, setActiveTab] = useState<TabType>(isBusinessUser ? 'my_plans' : 'their_plans');
  const [theirPlans, setTheirPlans] = useState<ChatItem[]>([]);
  const [myPlans, setMyPlans] = useState<ChatItem[]>([]);
  const [groups, setGroups] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      loadChats();
    }
  }, [isAuthenticated, user]);

  const loadChats = async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);
      const response = await apiService.getChatLists(user.user_id);

      // Log for announcement group debugging
      const groupsList = response?.data?.groups || [];
      const announcementGroups = groupsList.filter((g: any) => g.is_announcement_group);
      console.log('[Chat] getChatLists response:', {
        groupsCount: groupsList.length,
        groupIds: groupsList.map((g: any) => g.group_id),
        announcementGroupCount: announcementGroups.length,
        hasAnnouncementGroup: announcementGroups.length > 0,
      });
      if (groupsList.length > 0 && announcementGroups.length === 0) {
        console.log('[Chat] No announcement group in list. Backend /chat/lists may not include it.');
      }

      if (response.data) {
        setTheirPlans(response.data.their_plans || []);
        setMyPlans(response.data.my_plans || []);

        let finalGroups = groupsList;
        const hasAnnouncementInList = groupsList.some((g: any) => g.is_announcement_group || g.group_name === 'Announcement Group');

        if (isBusinessUser && !hasAnnouncementInList) {
          try {
            const annRes = await apiService.getOrCreateAnnouncementGroup();
            const annGroupId = (annRes as any)?.data?.group_id ?? (annRes as any)?.group_id;
            if (annGroupId && !groupsList.some((g: any) => g.group_id === annGroupId)) {
              const details = await apiService.getGroupDetails(annGroupId);
              const d = details?.data ?? details;
              const announcementItem: ChatItem = {
                group_id: annGroupId,
                plan_id: d?.plan_id ?? '',
                plan_title: d?.plan_title ?? 'Announcements',
                plan_description: d?.plan_description ?? '',
                plan_media: d?.plan_media ?? [],
                author_id: user?.user_id ?? '',
                author_name: d?.group_name ?? 'Announcement Group',
                author_image: currentUser?.profile_image ?? null,
                last_message: null,
                member_count: d?.members?.length ?? 0,
                is_group: true,
                group_name: d?.group_name ?? 'Announcement Group',
                ...(d ? { is_announcement_group: !!d.is_announcement_group } : {}),
              };
              finalGroups = [announcementItem, ...groupsList];
              console.log('[Chat] Announcement group added to list (was missing from backend)', { group_id: annGroupId });
            }
          } catch (annErr: any) {
            console.warn('[Chat] Could not load announcement group for list:', annErr?.message ?? annErr);
          }
        }

        // Pin announcement group on top; sort all others by recency of latest message (newest first)
        const announcementItems = finalGroups.filter((g: any) => g.is_announcement_group || g.group_name === 'Announcement Group');
        const nonAnnouncement = finalGroups.filter((g: any) => !g.is_announcement_group && g.group_name !== 'Announcement Group');
        const getTimestamp = (item: any) => {
          const ts = item?.last_message?.timestamp;
          if (!ts) return 0;
          return typeof ts === 'string' ? new Date(ts).getTime() : (ts as Date).getTime();
        };
        nonAnnouncement.sort((a: any, b: any) => getTimestamp(b) - getTimestamp(a));
        finalGroups = [...announcementItems, ...nonAnnouncement];

        setGroups(finalGroups);

        // Update global chat unread count for tab badge (sum across all lists)
        const totalUnread = [
          ...(response.data.their_plans || []),
          ...(response.data.my_plans || []),
          ...finalGroups,
        ].reduce((sum, item) => sum + (item?.unread_count ?? 0), 0);
        dispatch(setChatUnreadCount(totalUnread));
      }
    } catch (error: any) {
      console.error('[Chat] Error loading chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const getCurrentData = () => {
    if (isBusinessUser) {
      switch (activeTab) {
        case 'my_plans':
          // Organisers: show all groups (event chats + announcement) in "My events"
          return groups;
        case 'unread':
          return groups.filter((g: ChatItem) => (g.unread_count ?? 0) > 0);
        default:
          return groups;
      }
    }
    switch (activeTab) {
      case 'their_plans':
        return theirPlans;
      case 'my_plans':
        return myPlans;
      case 'groups':
        return groups;
      default:
        return [];
    }
  };

  const getBadgeCount = (type: TabType) => {
    if (isBusinessUser) {
      if (type === 'my_plans') return groups.length;
      if (type === 'unread') return groups.filter((g: ChatItem) => (g.unread_count ?? 0) > 0).length;
      return 0;
    }
    switch (type) {
      case 'their_plans': return theirPlans.length;
      case 'my_plans': return myPlans.length;
      case 'groups': return groups.length;
      default: return 0;
    }
  };

  const formatTime = (timestamp: Date | string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just Now';
    
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getLastMessageText = (item: ChatItem) => {
    if (!item.last_message) return 'No messages yet';
    
    if (item.last_message.type === 'text') {
      const text = typeof item.last_message.content === 'string' 
        ? item.last_message.content 
        : 'Message';
      return text.length > 35 ? text.substring(0, 35) + '...' : text;
    }
    if (item.last_message.type === 'image') return '📷 Photo';
    return 'Message';
  };

  const handleChatPress = (item: ChatItem) => {
    if (item.is_group) {
      router.push({
        pathname: '/chat/group/[groupId]',
        params: { groupId: item.group_id },
      } as any);
    } else {
      router.push({
        pathname: '/chat/[groupId]',
        params: { groupId: item.group_id },
      } as any);
    }
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    // Event/plan chats: show event name (plan_title); otherwise group_name or other user
    const displayName = item.is_group
      ? (item.plan_title || item.group_name)
      : (item.other_user?.name || item.author_name);

    // Groups from post/event: use that event's image as group DP
    const planMediaFirst = item.plan_media?.[0];
    const eventImageUrl = planMediaFirst
      ? (typeof planMediaFirst === 'string' ? planMediaFirst : planMediaFirst?.url)
      : null;
    const displayImage = item.is_group
      ? (eventImageUrl || item.author_image)
      : (item.other_user?.profile_image || item.author_image);

    const isAnnouncement = !!(item.is_announcement_group || item.group_name === 'Announcement Group');

    return (
      <TouchableOpacity
        style={[styles.chatItem, isAnnouncement && styles.chatItemAnnouncement]}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        {item.is_group ? (
          <View style={styles.eventPhotoWrap}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.eventPhoto} resizeMode="cover" />
            ) : (
              <View style={[styles.eventPhoto, styles.eventPhotoPlaceholder]} />
            )}
          </View>
        ) : (
          <Avatar
            uri={displayImage || null}
            size={52}
            style={styles.avatar}
          />
        )}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.last_message && (
              <Text style={styles.timestamp}>
                {formatTime(item.last_message.timestamp)}
              </Text>
            )}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {getLastMessageText(item)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Chat → Login CTA when not authenticated (no auto-redirect; show CTA)
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <View style={styles.loginCtaContainer}>
          <Text style={styles.loginCtaTitle}>Log in to view your chats</Text>
          <Text style={styles.loginCtaSubtext}>Sign in to see and continue conversations</Text>
          <TouchableOpacity
            style={styles.loginCtaButton}
            onPress={() => router.replace('/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginCtaButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {/* Tabs: business users see only My events + Unread; others see Their Plans, My Plans, Groups */}
      <View style={styles.tabsContainer}>
        {isBusinessUser ? (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my_plans' && styles.tabActive]}
              onPress={() => setActiveTab('my_plans')}
            >
              <Text style={[styles.tabText, activeTab === 'my_plans' && styles.tabTextActive]}>
                My events
              </Text>
              {getBadgeCount('my_plans') > 0 && (
                <View style={[styles.badge, activeTab === 'my_plans' && styles.badgeActive]}>
                  <Text style={[styles.badgeText, activeTab === 'my_plans' && styles.badgeTextActive]}>
                    {getBadgeCount('my_plans')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
              onPress={() => setActiveTab('unread')}
            >
              <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
                Unread
              </Text>
              {getBadgeCount('unread') > 0 && (
                <View style={[styles.badge, activeTab === 'unread' && styles.badgeActive]}>
                  <Text style={[styles.badgeText, activeTab === 'unread' && styles.badgeTextActive]}>
                    {getBadgeCount('unread')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'their_plans' && styles.tabActive]}
              onPress={() => setActiveTab('their_plans')}
            >
              <Text style={[styles.tabText, activeTab === 'their_plans' && styles.tabTextActive]}>
                Their Plans
              </Text>
              {getBadgeCount('their_plans') > 0 && (
                <View style={[styles.badge, activeTab === 'their_plans' && styles.badgeActive]}>
                  <Text style={[styles.badgeText, activeTab === 'their_plans' && styles.badgeTextActive]}>
                    {getBadgeCount('their_plans')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my_plans' && styles.tabActive]}
              onPress={() => setActiveTab('my_plans')}
            >
              <Text style={[styles.tabText, activeTab === 'my_plans' && styles.tabTextActive]}>
                My Plans
              </Text>
              {getBadgeCount('my_plans') > 0 && (
                <View style={[styles.badge, activeTab === 'my_plans' && styles.badgeActive]}>
                  <Text style={[styles.badgeText, activeTab === 'my_plans' && styles.badgeTextActive]}>
                    {getBadgeCount('my_plans')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
              onPress={() => setActiveTab('groups')}
            >
              <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
                Groups
              </Text>
              {getBadgeCount('groups') > 0 && (
                <View style={[styles.badge, activeTab === 'groups' && styles.badgeActive]}>
                  <Text style={[styles.badgeText, activeTab === 'groups' && styles.badgeTextActive]}>
                    {getBadgeCount('groups')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      ) : (
        <FlatList
          data={getCurrentData()}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.group_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation from a plan
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '800',
    fontFamily: Fonts?.sans,
    color: '#1C1C1E',
  },
  loginCtaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginCtaTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts?.sans,
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginCtaSubtext: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  loginCtaButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  loginCtaButtonText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
    color: '#FFFFFF',
  },
  
  // Tabs Styles
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F2F2F2', // Light gray default
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1C1C1E', // Dark active
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
    color: '#1C1C1E',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  // Badge Styles
  badge: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeTextActive: {
    color: '#1C1C1E',
  },

  // List Styles
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
  },
  chatItemAnnouncement: {
    backgroundColor: '#F2F2F7',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  eventPhotoWrap: {
    width: 52,
    height: 52,
    borderRadius: 0,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#F2F2F2',
  },
  eventPhoto: {
    width: 52,
    height: 52,
  },
  eventPhotoPlaceholder: {
    backgroundColor: '#E5E5EA',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 16,
    backgroundColor: '#F2F2F2',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts?.sans,
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#8E8E93',
    fontWeight: '400',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#666666',
    lineHeight: 20,
  },
  
  // Loading/Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});