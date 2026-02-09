import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import { fetchUnreadCount, setUnreadCount } from '@/store/slices/notificationsSlice';
import LoginModal from '@/components/LoginModal';
import Avatar from '@/components/Avatar';
import NotificationCard from '@/components/NotificationCard';
import NotificationListItem from '@/components/NotificationListItem';
import GroupedPlanCard from '@/components/GroupedPlanCard';
import SummaryCard from '@/components/SummaryCard';

interface Interaction {
  notification_id: string;
  type: 'comment' | 'reaction' | 'join' | 'repost';
  source_user_id: string;
  user?: {
    user_id: string;
    name: string;
    profile_image?: string;
  };
  payload?: any;
  created_at: string;
}

interface NotificationGroup {
  post_id: string;
  post: {
    plan_id: string;
    title: string;
    description: string;
    media: any[];
    category_main?: string;
    category_sub?: string[];
  } | null;
  interactions: Interaction[];
  created_at: string;
}

interface PlanGroupInfo {
  has_active_group: boolean;
  latest_group: {
    group_id: string;
    group_name: string | null;
    members: string[];
    created_at: string;
  } | null;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationGroup[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [creatingGroup, setCreatingGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [userCache, setUserCache] = useState<{ [key: string]: { name: string; profile_image: string | null } }>({});
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const [announcementGroupId, setAnnouncementGroupId] = useState<string | null>(null);
  const [announcementMemberIds, setAnnouncementMemberIds] = useState<Set<string>>(new Set());
  const [loadingAnnouncementMembers, setLoadingAnnouncementMembers] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'eventsList' | 'eventDetail'>('summary');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewedCardIds, setViewedCardIds] = useState<Set<string>>(new Set());
  const announcementMembersLoadedRef = useRef(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

  const openUserProfile = useCallback(
    (userId: string) => {
      if (!userId) return;
      router.push({ pathname: '/profile/[userId]', params: { userId } } as any);
    },
    [router]
  );

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated || !user?.user_id) {
      if (!isRefresh) setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiService.getNotifications(user.user_id);
      if (response.data) {
        setNotifications(response.data);
        // Always start in summary view (Level 1)
        setViewMode('summary');
        setSelectedEventId(null);
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      if (!error.message?.includes('User not found')) {
        Alert.alert('Error', error.message || 'Failed to load notifications');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadNotifications]);

  // Clear notification badge when user opens the notifications tab
  useFocusEffect(
    useCallback(() => {
      dispatch(setUnreadCount(0));
    }, [dispatch])
  );

  // Load announcement group members when showing event cards (so Add to Community can show who's already in group)
  useEffect(() => {
    if (!isAuthenticated || viewMode === 'summary' || announcementMembersLoadedRef.current) return;
    const hasCards = notifications.some((n) => n.post?.plan_id && n.interactions?.length > 0);
    if (!hasCards) return;
    announcementMembersLoadedRef.current = true;
    apiService
      .getOrCreateAnnouncementGroup()
      .then((res: any) => {
        const gid = res?.data?.group_id ?? res?.group_id;
        if (!gid) return null;
        return apiService.getGroupDetails(gid);
      })
      .then((details: any) => {
        if (!details) return;
        const data = details?.data ?? details;
        const members = data?.members ?? [];
        const ids = new Set<string>();
        if (Array.isArray(members)) {
          members.forEach((m: any) => {
            const id = typeof m === 'string' ? m : (m?.user_id ?? m?.id);
            if (id) ids.add(String(id));
          });
        }
        setAnnouncementMemberIds(ids);
      })
      .catch(() => {});
  }, [isAuthenticated, viewMode, notifications]);

  const fetchUserProfile = useCallback(async (user_id: string) => {
    if (userCache[user_id]) {
      return userCache[user_id];
    }

    setLoadingUsers((prev) => new Set(prev).add(user_id));

    try {
      const response = await apiService.getUserProfile(user_id);
      if (response.data) {
        const userData = {
          name: response.data.name || 'Unknown',
          profile_image: response.data.profile_image || null,
        };
        setUserCache((prev) => ({ ...prev, [user_id]: userData }));
        setLoadingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(user_id);
          return newSet;
        });
        return userData;
      }
    } catch (error: any) {
      console.error(`Error fetching user ${user_id}:`, error);
      setLoadingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user_id);
        return newSet;
      });
    }
    return null;
  }, [userCache]);

  useEffect(() => {
    if (notifications.length > 0) {
      const userIds = new Set<string>();
      notifications.forEach((group) => {
        group.interactions.forEach((interaction) => {
          if (interaction.source_user_id && !userCache[interaction.source_user_id]) {
            userIds.add(interaction.source_user_id);
          }
        });
      });

      userIds.forEach((userId) => {
        fetchUserProfile(userId);
      });
    }
  }, [notifications, userCache, fetchUserProfile]);

  const openGroupModal = async (postId: string) => {
    setCurrentPostId(postId);
    setSelectedUsers(new Set());
    setShowGroupModal(true);
    setLoadingAnnouncementMembers(true);
    try {
      const res = await apiService.getOrCreateAnnouncementGroup();
      const groupId = (res as any)?.data?.group_id ?? (res as any)?.group_id ?? null;
      setAnnouncementGroupId(groupId);
      if (groupId) {
        const details = await apiService.getGroupDetails(groupId);
        const data = details?.data ?? details;
        const members = data?.members ?? [];
        const ids = new Set<string>();
        if (Array.isArray(members)) {
          members.forEach((m: any) => {
            const id = typeof m === 'string' ? m : (m?.user_id ?? m?.id);
            if (id) ids.add(String(id));
          });
        }
        setAnnouncementMemberIds(ids);
      } else {
        setAnnouncementMemberIds(new Set());
      }
    } catch {
      setAnnouncementGroupId(null);
      setAnnouncementMemberIds(new Set());
    } finally {
      setLoadingAnnouncementMembers(false);
    }
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setCurrentPostId(null);
    setSelectedUsers(new Set());
  };

  const toggleUserSelection = (userId: string) => {
    if (announcementMemberIds.has(userId)) return;
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const currentGroup = currentPostId ? notifications.find((n) => n.post_id === currentPostId) : null;
    if (!currentGroup) return;

    const uniqueUserIds = [...new Set(currentGroup.interactions.map((i) => i.source_user_id))]
      .filter((id) => id && !announcementMemberIds.has(id));
    const allSelected = uniqueUserIds.length > 0 && selectedUsers.size === uniqueUserIds.length;

    if (allSelected) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(uniqueUserIds));
    }
  };

  const handleAddToAnnouncementGroup = async () => {
    if (!user?.user_id) return;
    if (!announcementGroupId) {
      Alert.alert('Error', 'Announcement group not available');
      return;
    }
    if (selectedUsers.size === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    setCreatingGroup(currentPostId || 'adding');
    try {
      const memberIds = Array.from(selectedUsers)
        .filter((id) => id && id !== user.user_id)
        .filter((id) => !announcementMemberIds.has(id));
      if (memberIds.length === 0) {
        Alert.alert('Done', 'All selected users are already in your announcement group.');
        closeGroupModal();
        return;
      }
      await apiService.addMembersToGroup(announcementGroupId, memberIds);
      const next = new Set(announcementMemberIds);
      memberIds.forEach((id) => next.add(id));
      setAnnouncementMemberIds(next);
      Alert.alert('Done', `${memberIds.length} user(s) added to your announcement group.`);
      closeGroupModal();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add members');
    } finally {
      setCreatingGroup(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please login to view notifications</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowLoginModal(true)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => loadNotifications()}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      </SafeAreaView>
    );
  }

  const currentGroup = currentPostId ? notifications.find((n) => n.post_id === currentPostId) : null;
  const uniqueUserIds = currentGroup ? [...new Set(currentGroup.interactions.map((i) => i.source_user_id))] : [];
  const availableUserIds = uniqueUserIds.filter((id) => id && !announcementMemberIds.has(id));
  const allSelected = availableUserIds.length > 0 && selectedUsers.size === availableUserIds.length;

  // Separate grouped plan cards from individual notifications
  const groupedPlanCards = notifications
    .filter((n) => n.post !== null && n.post.plan_id && n.interactions.length > 0)
    .sort((a, b) => {
      const aLatest = Math.max(...a.interactions.map(i => new Date(i.created_at).getTime()));
      const bLatest = Math.max(...b.interactions.map(i => new Date(i.created_at).getTime()));
      return bLatest - aLatest;
    });

  // All interactions as flat list for Instagram-style notifications below the cards
  // Include plan context so each row can show "Yash commented" (and optionally "on Plan title")
  const allInteractionsForList = notifications.flatMap((group) =>
    group.interactions.map((interaction) => ({
      ...interaction,
      _planTitle: group.post?.title || null,
      _planId: group.post?.plan_id || group.post_id || null,
    }))
  );

  // Get all unique avatars from all plan cards for summary
  const getAllAvatars = () => {
    const avatarSet = new Set<string | null>();
    groupedPlanCards.forEach((group) => {
      group.interactions.forEach((interaction) => {
        const cachedUser = userCache[interaction.source_user_id];
        const user = cachedUser || interaction.user;
        if (user?.profile_image) {
          avatarSet.add(user.profile_image);
        }
      });
    });
    return Array.from(avatarSet).slice(0, 6);
  };

  type InteractionWithPlan = Interaction & { _planTitle?: string | null; _planId?: string | null };

  // Group individual notifications by time (Today, Yesterday, then by date for Earlier)
  const groupNotificationsByTime = (notifs: InteractionWithPlan[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNotifs: InteractionWithPlan[] = [];
    const yesterdayNotifs: InteractionWithPlan[] = [];
    const earlierByDate: { [key: string]: InteractionWithPlan[] } = {};

    notifs.forEach((interaction) => {
      const interactionDate = new Date(interaction.created_at);
      const interactionDay = new Date(interactionDate.getFullYear(), interactionDate.getMonth(), interactionDate.getDate());

      if (interactionDay.getTime() === today.getTime()) {
        todayNotifs.push(interaction);
      } else if (interactionDay.getTime() === yesterday.getTime()) {
        yesterdayNotifs.push(interaction);
      } else {
        const dateKey = interactionDay.toISOString().slice(0, 10);
        if (!earlierByDate[dateKey]) earlierByDate[dateKey] = [];
        earlierByDate[dateKey].push(interaction);
      }
    });

    const sortByDate = (a: Interaction, b: Interaction) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    todayNotifs.sort(sortByDate);
    yesterdayNotifs.sort(sortByDate);
    Object.keys(earlierByDate).forEach((key) => earlierByDate[key].sort(sortByDate));

    // Earlier as array of { dateLabel, items } sorted by date (newest first)
    const earlierSections = Object.entries(earlierByDate)
      .map(([dateKey, items]) => ({
        dateLabel: new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dateKey,
        items,
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    return { today: todayNotifs, yesterday: yesterdayNotifs, earlierSections };
  };

  const timeGroupedNotifications = groupNotificationsByTime(allInteractionsForList);

  // 3-Level Navigation Handlers
  const handleSummaryCardPress = () => {
    if (viewMode === 'summary') {
      // Expand to Level 2: Show all event cards (collapsed)
      setViewMode('eventsList');
      setSelectedEventId(null); // Ensure no event is selected
    } else {
      // Collapse back to Level 1: Show summary card
      setViewMode('summary');
      setSelectedEventId(null);
    }
  };

  const handleCloseStack = () => {
    setViewMode('summary');
    setSelectedEventId(null);
  };

  const handleEventCardPress = (postId: string) => {
    if (viewMode === 'eventsList') {
      // Mark this card as viewed so the count badge disappears
      setViewedCardIds((prev) => new Set(prev).add(postId));
      // Mark all interactions for this card as read when opening the event card
      const group = notifications.find((g) => g.post_id === postId);
      const ids = group?.interactions?.map((i) => i.notification_id).filter(Boolean) ?? [];
      if (ids.length > 0) {
        Promise.all(ids.map((id) => apiService.markNotificationAsRead(id).catch(() => null)))
          .catch(() => null)
          .finally(() => {
            if (user?.user_id) dispatch(fetchUnreadCount(user.user_id));
          });
      }

      // Expand to Level 3: Show interactions for this specific event
      setViewMode('eventDetail');
      setSelectedEventId(postId);
    } else if (viewMode === 'eventDetail' && selectedEventId === postId) {
      // Collapse back to Level 2: Hide interactions, keep cards visible
      setViewMode('eventsList');
      setSelectedEventId(null);
    } else if (viewMode === 'eventDetail') {
      // Switch to different event (keep in Level 3, just change selection)
      setSelectedEventId(postId);
    }
  };

  const handleCreateGroupFromCard = (postId: string) => {
    setCurrentPostId(postId);
    setSelectedUsers(new Set());
    setShowGroupModal(true);
  };

  const handleAddToCommunity = async (guests: Array<{ user_id: string; name: string; profile_image: string | null }>) => {
    if (!user?.user_id || guests.length === 0) return;
    try {
      const res = await apiService.getOrCreateAnnouncementGroup();
      const groupId = (res as any)?.data?.group_id ?? (res as any)?.group_id;
      if (!groupId) {
        Alert.alert('Error', 'Could not get announcement group');
        return;
      }
      const memberIds = guests.map((g) => g.user_id).filter((id) => id !== user.user_id);
      if (memberIds.length > 0) {
        await apiService.addMembersToGroup(groupId, memberIds);
        setAnnouncementMemberIds((prev) => {
          const next = new Set(prev);
          memberIds.forEach((id) => next.add(id));
          return next;
        });
      }
      Alert.alert('Done', `${memberIds.length} user(s) added to your announcement group.`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add to community');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>Notifications</Text>
        </View>
        {viewMode !== 'summary' ? (
          <TouchableOpacity
            style={styles.closeStackButton}
            onPress={handleCloseStack}
            accessibilityLabel="Close stack"
          >
            <Ionicons name="chevron-down" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={22} color="#FFD700" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadNotifications(true)} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>Interactions on your posts will appear here</Text>
          </View>
        ) : (
          <>
            {/* TOP SECTION: Event Cards (3-Level System) */}
            {groupedPlanCards.length > 0 && (
              <View style={styles.groupedCardsContainer}>
                {/* Level 1: Summary Card */}
                {viewMode === 'summary' && groupedPlanCards.length > 0 && (
                  <SummaryCard
                    totalCount={groupedPlanCards.length}
                    avatars={getAllAvatars()}
                    eventDescription={groupedPlanCards[0].post?.description ?? groupedPlanCards[0].post?.title ?? ''}
                    onPress={handleSummaryCardPress}
                  />
                )}

                {/* Level 2 & 3: Events List / Event Detail — no "X events" header above cards */}
                {(viewMode === 'eventsList' || viewMode === 'eventDetail') && (
                  <>
                    {groupedPlanCards.map((group, index) => {
                      // In Level 2, all cards are collapsed. In Level 3, only selected card is expanded
                      const isExpanded = viewMode === 'eventDetail' && selectedEventId === group.post_id;
                      const shouldShowInteractions = viewMode === 'eventDetail' && selectedEventId === group.post_id;
                      
                      return (
                        <GroupedPlanCard
                          key={group.post_id}
                          post_id={group.post_id}
                          post={group.post}
                          interactions={group.interactions}
                          created_at={group.created_at}
                          userCache={userCache}
                          isExpanded={isExpanded}
                          onExpand={() => handleEventCardPress(group.post_id)}
                          onCreateGroup={() => handleCreateGroupFromCard(group.post_id)}
                          onAddToCommunity={handleAddToCommunity}
                          index={index}
                          showInteractions={shouldShowInteractions}
                          hideCountBadge={viewedCardIds.has(group.post_id)}
                          alreadyInAnnouncementGroupIds={announcementMemberIds}
                        />
                      );
                    })}
                  </>
                )}
              </View>
            )}

            {/* BOTTOM SECTION: Individual Notifications (Instagram-style, always below cards) */}
            {(timeGroupedNotifications.today.length > 0 ||
              timeGroupedNotifications.yesterday.length > 0 ||
              timeGroupedNotifications.earlierSections.length > 0) && (
              <View style={styles.listContainer}>
                {/* Today Section */}
                {timeGroupedNotifications.today.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>Today</Text>
                    </View>
                    {timeGroupedNotifications.today.map((interaction, index) => {
                      const isLast = index === timeGroupedNotifications.today.length - 1 &&
                        timeGroupedNotifications.yesterday.length === 0 &&
                        timeGroupedNotifications.earlierSections.length === 0;
                      return (
                        <NotificationListItem
                          key={interaction.notification_id}
                          interaction={interaction}
                          userCache={userCache}
                          onUserPress={openUserProfile}
                          onPress={() => {
                            const planId = (interaction as any)._planId || interaction.payload?.plan_id;
                            if (planId) {
                              router.push({
                                pathname: '/plan/[planId]',
                                params: { planId },
                              } as any);
                            }
                          }}
                          showDivider={!isLast}
                        />
                      );
                    })}
                  </>
                )}

                {/* Yesterday Section */}
                {timeGroupedNotifications.yesterday.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>Yesterday</Text>
                    </View>
                    {timeGroupedNotifications.yesterday.map((interaction, index) => {
                      const isLast = index === timeGroupedNotifications.yesterday.length - 1 &&
                        timeGroupedNotifications.earlierSections.length === 0;
                      return (
                        <NotificationListItem
                          key={interaction.notification_id}
                          interaction={interaction}
                          userCache={userCache}
                          onUserPress={openUserProfile}
                          onPress={() => {
                            const planId = (interaction as any)._planId || interaction.payload?.plan_id;
                            if (planId) {
                              router.push({
                                pathname: '/plan/[planId]',
                                params: { planId },
                              } as any);
                            }
                          }}
                          showDivider={!isLast}
                        />
                      );
                    })}
                  </>
                )}

                {/* Earlier: one section per date */}
                {timeGroupedNotifications.earlierSections.map((section) => (
                  <React.Fragment key={section.dateKey}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>{section.dateLabel}</Text>
                    </View>
                    {section.items.map((interaction, index) => {
                      const isLast = index === section.items.length - 1;
                      return (
                        <NotificationListItem
                          key={interaction.notification_id}
                          interaction={interaction}
                          userCache={userCache}
                          onUserPress={openUserProfile}
                          onPress={() => {
                            const planId = (interaction as any)._planId || interaction.payload?.plan_id;
                            if (planId) {
                              router.push({
                                pathname: '/plan/[planId]',
                                params: { planId },
                              } as any);
                            }
                          }}
                          showDivider={!isLast}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Group Creation Modal - Centered */}
      <Modal
        visible={showGroupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeGroupModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeGroupModal}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="bicycle-outline" size={24} color="#1C1C1E" />
                <Text style={styles.modalHeaderText}>Announcement Group</Text>
              </View>
              <TouchableOpacity onPress={closeGroupModal}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            {/* User List */}
            <ScrollView 
              style={styles.userList}
              showsVerticalScrollIndicator={false}
            >
              {currentGroup && uniqueUserIds.map((userId) => {
                const interaction = currentGroup.interactions.find((i) => i.source_user_id === userId);
                const cachedUser = userCache[userId];
                const user = cachedUser || interaction?.user;
                const isSelected = selectedUsers.has(userId);
                const isAlreadyAdded = announcementMemberIds.has(userId);
                
                return (
                  <TouchableOpacity
                    key={userId}
                    style={[styles.userItem, isAlreadyAdded && styles.userItemDisabled]}
                    onPress={() => toggleUserSelection(userId)}
                    disabled={isAlreadyAdded}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      uri={user?.profile_image || null}
                      size={40}
                    />
                    <Text style={[styles.userName, isAlreadyAdded && styles.userNameDisabled]}>{user?.name || 'Unknown'}</Text>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              {/* Select All */}
              <TouchableOpacity
                style={styles.selectAllItem}
                onPress={toggleSelectAll}
                activeOpacity={0.7}
              >
                <Text style={styles.selectAllText}>Select All</Text>
                <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
                  {allSelected && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.modalActionButton,
                (selectedUsers.size === 0 || creatingGroup !== null || loadingAnnouncementMembers) &&
                  styles.modalActionButtonDisabled,
              ]}
              onPress={handleAddToAnnouncementGroup}
              disabled={selectedUsers.size === 0 || creatingGroup !== null || loadingAnnouncementMembers}
              activeOpacity={0.8}
            >
              {creatingGroup ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalActionButtonText}>
                  {loadingAnnouncementMembers ? 'Loading…' : 'Add to Announcement Group'}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => loadNotifications()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  closeStackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  highlightedCardContainer: {
    padding: 20,
    paddingBottom: 0,
    backgroundColor: '#F2F2F7',
  },
  groupedCardsContainer: {
    padding: 20,
    paddingBottom: 20,
    backgroundColor: '#F2F2F7',
  },
  listContainer: {
    backgroundColor: '#F2F2F7',
    paddingTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  userList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  userItemDisabled: {
    opacity: 0.45,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  userNameDisabled: {
    color: '#8E8E93',
  },
  selectAllItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectAllText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  groupNameInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalActionButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.6,
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
