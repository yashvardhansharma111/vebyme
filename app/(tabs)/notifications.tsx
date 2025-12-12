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
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
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

  const toggleExpand = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      setSelectedUsers(new Set());
      setGroupName('');
    } else {
      setExpandedPostId(postId);
      setSelectedUsers(new Set());
      setGroupName('');
    }
  };

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
      const response = await apiService.approveJoinRequest(interactionId);
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
                  if (chatResponse.data?.group_id) {
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

    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreatingGroup(postId);
    try {
      const memberIds = Array.from(selectedUsers);
      const response = await apiService.createGroup(postId, user.user_id, memberIds, groupName.trim());
      
      if (response.data) {
        Alert.alert(
          'Group Created! 🎉',
          `"${groupName.trim()}" group has been created. You can now chat with ${selectedUsers.size} member${selectedUsers.size > 1 ? 's' : ''} about this plan.`,
          [
            {
              text: 'Go to Chat',
              onPress: () => {
                router.push({
                  pathname: '/chat/group/[groupId]',
                  params: { groupId: response.data.group_id },
                } as any);
              },
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
        setExpandedPostId(null);
        setSelectedUsers(new Set());
        setGroupName('');
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

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return 'chatbubble-outline';
      case 'reaction':
        return 'heart-outline';
      case 'join':
        return 'person-add-outline';
      case 'repost':
        return 'repeat-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getInteractionText = (interaction: Interaction) => {
    const userName = interaction.user?.name || 'Someone';
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

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

            return (
              <View key={group.post_id} style={styles.notificationCard}>
                {/* Header with avatars and post info */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleExpand(group.post_id)}
                  activeOpacity={0.7}
                >
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

                  <View style={styles.cardContent}>
                    <Text style={styles.postText} numberOfLines={2}>
                      {group.post?.description || group.post?.title || 'Post interaction'}
                    </Text>
                    <Text style={styles.timeText}>{formatTime(group.created_at)}</Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.light.text}
                  />
                </TouchableOpacity>

                {/* Expanded interactions */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {group.interactions.map((interaction) => {
                      const isSelected = selectedUsers.has(interaction.source_user_id);
                      // Check if interaction is pending (has request_id and status is pending)
                      const isPending = interaction.payload?.request_id && 
                                       interaction.payload?.status === 'pending';
                      
                      // Check if interaction is approved
                      const isApproved = interaction.payload?.status === 'approved' || 
                                        interaction.status === 'approved';
                      
                      return (
                        <View key={interaction.notification_id} style={styles.interactionContainer}>
                          <View style={styles.interactionRow}>
                            <TouchableOpacity
                              style={styles.userInfoSection}
                              onPress={() => {
                                if (interaction.source_user_id) {
                                  // If approved, allow starting individual chat
                                  if (isApproved && group.post_id) {
                                    handleStartIndividualChat(group.post_id, interaction.source_user_id);
                                  } else {
                                    // Navigate to profile
                                    router.push({
                                      pathname: '/profile/[userId]',
                                      params: { userId: interaction.source_user_id },
                                    } as any);
                                  }
                                }
                              }}
                            >
                              <Image
                                source={{
                                  uri:
                                    interaction.user?.profile_image ||
                                    'https://via.placeholder.com/44',
                                }}
                                style={styles.interactionAvatar}
                              />
                              <View style={styles.interactionInfo}>
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
                              </View>
                            </TouchableOpacity>
                            
                            <View style={styles.interactionActions}>
                              <TouchableOpacity
                                style={styles.checkbox}
                                onPress={() => toggleUserSelection(interaction.source_user_id)}
                              >
                                {isSelected && (
                                  <Ionicons name="checkmark" size={16} color={Colors.light.primary} />
                                )}
                              </TouchableOpacity>
                              <Ionicons
                                name={getInteractionIcon(interaction.type)}
                                size={20}
                                color={Colors.light.text}
                                style={styles.interactionIcon}
                              />
                            </View>
                          </View>
                          
                          {/* Approve/Reject buttons for pending requests */}
                          {isPending && interaction.payload?.request_id && (
                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.approveButton]}
                                onPress={() => handleApprove(
                                  interaction.payload.request_id,
                                  group.post_id,
                                  interaction.source_user_id
                                )}
                              >
                                <Text style={styles.actionButtonText}>Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={() => handleReject(interaction.payload.request_id)}
                              >
                                <Text style={styles.actionButtonText}>Reject</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          
                          {/* Show "Start Chat" button for approved requests */}
                          {isApproved && !isPending && group.post_id && (
                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.chatButton]}
                                onPress={() => handleStartIndividualChat(group.post_id, interaction.source_user_id)}
                              >
                                <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.actionButtonText}>Start Chat</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          
                          {/* Show "Start Chat" button for approved requests */}
                          {isApproved && !isPending && group.post_id && (
                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.chatButton]}
                                onPress={() => handleStartIndividualChat(group.post_id, interaction.source_user_id)}
                              >
                                <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.actionButtonText}>Start Chat</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {/* Group creation section */}
                    {selectedUsers.size > 0 && (
                      <View style={styles.groupCreationSection}>
                        <TextInput
                          style={styles.groupNameInput}
                          placeholder="Group Name"
                          placeholderTextColor="#9CA3AF"
                          value={groupName}
                          onChangeText={setGroupName}
                        />
                        <TouchableOpacity
                          style={[
                            styles.createGroupButton,
                            (!groupName.trim() || creatingGroup === group.post_id) &&
                              styles.createGroupButtonDisabled,
                          ]}
                          onPress={() => handleCreateGroup(group.post_id)}
                          disabled={!groupName.trim() || creatingGroup === group.post_id}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
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
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  avatarOverlay: {
    backgroundColor: Colors.light.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  postText: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  interactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  interactionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  interactionInfo: {
    flex: 1,
  },
  interactionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: '#6B7280',
  },
  interactionIcon: {
    marginLeft: 8,
  },
  interactionContainer: {
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginLeft: 76, // Align with content
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  approveButton: {
    backgroundColor: Colors.light.success || Colors.light.primary,
  },
  rejectButton: {
    backgroundColor: Colors.light.error,
  },
  chatButton: {
    backgroundColor: Colors.light.primary,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emojiText: {
    fontSize: 20,
    marginTop: 4,
  },
  groupCreationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  groupNameInput: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 12,
  },
  createGroupButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
