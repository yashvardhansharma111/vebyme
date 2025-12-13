import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import { Colors, borderRadius } from '@/constants/theme';
import LoginModal from '@/components/LoginModal';

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
  } | null;
  interactions: Interaction[];
  created_at: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationGroup[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState<{ [postId: string]: string }>({});
  const [creatingGroup, setCreatingGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userCache, setUserCache] = useState<{ [key: string]: { name: string; profile_image: string | null } }>({});
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const router = useRouter();
  
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

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

  const fetchUserProfile = useCallback(async (user_id: string) => {
    // Check cache first
    if (userCache[user_id]) {
      return userCache[user_id];
    }

    // Add to loading set
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
      // Handle error - use fallback
      console.error(`Error fetching user ${user_id}:`, error);
    }

    // Fallback if fetch fails
    const fallback = {
      name: 'Unknown',
      profile_image: null,
    };
    setUserCache((prev) => ({ ...prev, [user_id]: fallback }));
    setLoadingUsers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(user_id);
      return newSet;
    });
    return fallback;
  }, [userCache]);

  const toggleExpand = useCallback(async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      setSelectedUsers(new Set());
      setGroupName((prev) => {
        const newState = { ...prev };
        delete newState[postId];
        return newState;
      });
    } else {
      setExpandedPostId(postId);
      
      // Fetch user profiles for all interactions in this group
      const group = notifications.find((n) => n.post_id === postId);
      if (group) {
        const uniqueUserIds = [...new Set(group.interactions.map((i) => i.source_user_id))];
        // Fetch all users (caching handles duplicates)
        uniqueUserIds.forEach((userId) => {
          if (!userCache[userId] && !loadingUsers.has(userId)) {
            fetchUserProfile(userId);
          }
        });
      }
    }
  }, [expandedPostId, notifications, userCache, loadingUsers, fetchUserProfile]);

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleApprove = async (interactionId: string, postId?: string, requesterId?: string) => {
    if (!isAuthenticated || !user?.user_id) return;

    try {
      await apiService.approveJoinRequest(interactionId);
      Alert.alert(
        'Request Approved! ✅',
        'The user has been notified and can now chat with you.',
        [
          {
            text: 'Start Chat',
            onPress: async () => {
              if (postId && requesterId) {
                try {
                  const chatResponse = await apiService.createIndividualChat(postId, user.user_id, requesterId);
                  if (chatResponse.data && chatResponse.data.group_id) {
                    router.push({
                      pathname: '/chat/[groupId]',
                      params: { groupId: chatResponse.data.group_id },
                    } as any);
                  }
                } catch (error: any) {
                  console.error('Error creating individual chat:', error);
                }
              }
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
      loadNotifications();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve request');
    }
  };

  const handleReject = async (interactionId: string) => {
    if (!isAuthenticated || !user?.user_id) return;

    try {
      await apiService.rejectJoinRequest(interactionId);
      Alert.alert('Request Rejected', 'The user has been notified.');
      loadNotifications();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject request');
    }
  };

  const handleStartIndividualChat = async (postId: string, otherUserId: string) => {
    if (!isAuthenticated || !user?.user_id) return;

    try {
      const response = await apiService.createIndividualChat(postId, user.user_id, otherUserId);
      if (response.data?.group_id) {
        router.push({
          pathname: '/chat/[groupId]',
          params: { groupId: response.data.group_id },
        } as any);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start chat');
      console.error('Error creating individual chat:', error);
    }
  };

  const handleCreateGroup = async (postId: string) => {
    if (!isAuthenticated || !user?.user_id) {
      setShowLoginModal(true);
      return;
    }

    if (selectedUsers.size === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    const name = groupName[postId]?.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreatingGroup(postId);
    try {
      const memberIds = Array.from(selectedUsers);
      const response = await apiService.createGroup(postId, user.user_id, memberIds, name);
      
      if (response.data && response.data.group_id) {
        Alert.alert(
          'Group Created! 🎉',
          `"${name}" group has been created. You can now chat with ${selectedUsers.size} member${selectedUsers.size > 1 ? 's' : ''} about this plan.`,
          [
            {
              text: 'Go to Chat',
              onPress: () => {
                router.push({
                  pathname: '/chat/group/[groupId]',
                  params: { groupId: response.data!.group_id },
                } as any);
              },
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
        setExpandedPostId(null);
        setSelectedUsers(new Set());
        setGroupName((prev) => {
          const newState = { ...prev };
          delete newState[postId];
          return newState;
        });
        loadNotifications();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setCreatingGroup(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInteractionText = (interaction: Interaction) => {
    // Use cached user name if available, otherwise use interaction.user, then fallback
    const cachedUser = userCache[interaction.source_user_id];
    const userName = cachedUser?.name || 
                     interaction.user?.name || 
                     'Unknown';
    switch (interaction.type) {
      case 'comment':
        return `${userName} commented`;
      case 'reaction':
        return `${userName} reacted`;
      case 'join':
        return `${userName} joined`;
      case 'repost':
        return `${userName} reposted`;
      default:
        return `${userName} interacted`;
    }
  };

  const handleUserPress = (userId: string) => {
    if (userId) {
      router.push({
        pathname: '/profile/[userId]',
        params: { userId },
      } as any);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>
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
          notifications.map((group) => {
            const isExpanded = expandedPostId === group.post_id;
            const avatars = group.interactions
              .slice(0, 3)
              .map((i) => i.user?.profile_image || 'https://via.placeholder.com/44');
            const remainingCount = Math.max(0, group.interactions.length - 3);
            const postText = group.post?.description || group.post?.title || 'Post interaction';

            return (
              <View key={group.post_id} style={styles.notificationCard}>
                {/* Collapsed Header */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleExpand(group.post_id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.headerLeft}>
                    <View style={styles.avatarStack}>
                      {avatars.map((avatar, index) => (
                        <Image
                          key={index}
                          source={{ uri: avatar }}
                          style={[
                            styles.avatar,
                            { marginLeft: index > 0 ? -12 : 0, zIndex: 10 - index },
                          ]}
                        />
                      ))}
                      {remainingCount > 0 && (
                        <View
                          style={[
                            styles.avatar,
                            styles.avatarOverlay,
                            { marginLeft: -12, zIndex: 0 },
                          ]}
                        >
                          <Text style={styles.avatarOverlayText}>+{remainingCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postText} numberOfLines={3}>
                      {postText}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    <Text style={styles.timeText}>{formatTime(group.created_at)}</Text>
                    <TouchableOpacity 
                      style={styles.chevronButton}
                      onPress={() => toggleExpand(group.post_id)}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#1C1C1E"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {group.interactions.map((interaction) => {
                      const isSelected = selectedUsers.has(interaction.source_user_id);
                      const isPending = interaction.payload?.request_id && 
                                       interaction.payload?.status === 'pending';
                      const isApproved = interaction.payload?.status === 'approved';
                      
                      return (
                        <View key={interaction.notification_id} style={styles.interactionItem}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => toggleUserSelection(interaction.source_user_id)}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color="#1C1C1E" />
                            )}
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.userInfoRow}
                            onPress={() => handleUserPress(interaction.source_user_id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.avatarContainer}>
                              <Image
                                source={{
                                  uri: userCache[interaction.source_user_id]?.profile_image || 
                                       interaction.user?.profile_image || 
                                       'https://via.placeholder.com/40',
                                }}
                                style={styles.userAvatar}
                              />
                              {loadingUsers.has(interaction.source_user_id) && (
                                <View style={styles.loadingOverlay}>
                                  <ActivityIndicator size="small" color="#1C1C1E" />
                                </View>
                              )}
                            </View>
                            <View style={styles.userInfo}>
                              {loadingUsers.has(interaction.source_user_id) ? (
                                <View style={styles.loadingTextContainer}>
                                  <ActivityIndicator size="small" color="#8E8E93" style={{ marginRight: 8 }} />
                                  <Text style={styles.loadingText}>Loading...</Text>
                                </View>
                              ) : (
                                <>
                                  <Text style={styles.interactionText}>
                                    {getInteractionText(interaction)}
                                  </Text>
                                  {interaction.type === 'comment' && interaction.payload?.text && (
                                    <Text style={styles.commentText} numberOfLines={1}>
                                      {interaction.payload.text}
                                    </Text>
                                  )}
                                  {interaction.type === 'reaction' && interaction.payload?.emoji_type && (
                                    <Text style={styles.emojiText}>{interaction.payload.emoji_type}</Text>
                                  )}
                                </>
                              )}
                            </View>
                          </TouchableOpacity>

                          <Ionicons
                            name={
                              interaction.type === 'comment' ? 'chatbubble-outline' :
                              interaction.type === 'reaction' ? 'heart-outline' :
                              interaction.type === 'join' ? 'person-add-outline' :
                              'repeat-outline'
                            }
                            size={20}
                            color="#1C1C1E"
                            style={styles.interactionIcon}
                          />
                        </View>
                      );
                    })}

                    {/* Group Creation Section - Only show when users are selected */}
                    {selectedUsers.size > 0 && (
                      <View style={styles.groupCreationSection}>
                        <TextInput
                          style={styles.groupNameInput}
                          placeholder="Group Name"
                          placeholderTextColor="#9CA3AF"
                          value={groupName[group.post_id] || ''}
                          onChangeText={(text) => {
                            setGroupName((prev) => ({
                              ...prev,
                              [group.post_id]: text,
                            }));
                          }}
                        />
                        <TouchableOpacity
                          style={[
                            styles.createGroupButton,
                            (!groupName[group.post_id]?.trim() || creatingGroup === group.post_id) &&
                              styles.createGroupButtonDisabled,
                          ]}
                          onPress={() => handleCreateGroup(group.post_id)}
                          disabled={!groupName[group.post_id]?.trim() || creatingGroup === group.post_id}
                        >
                          {creatingGroup === group.post_id ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.createGroupButtonText}>Create Group</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

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
    padding: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E5EA',
  },
  avatarOverlay: {
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  postText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  userInfo: {
    flex: 1,
  },
  interactionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  emojiText: {
    fontSize: 16,
    marginTop: 2,
  },
  interactionIcon: {
    marginLeft: 8,
  },
  groupCreationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  groupNameInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  createGroupButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.6,
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
