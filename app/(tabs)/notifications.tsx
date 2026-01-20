import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import LoginModal from '@/components/LoginModal';
import Avatar from '@/components/Avatar';
import NotificationCard from '@/components/NotificationCard';
import NotificationListItem from '@/components/NotificationListItem';

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
  const [groupName, setGroupName] = useState<string>('');
  const [creatingGroup, setCreatingGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [planGroupInfo, setPlanGroupInfo] = useState<{ [postId: string]: PlanGroupInfo }>({});
  const [userCache, setUserCache] = useState<{ [key: string]: { name: string; profile_image: string | null } }>({});
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const router = useRouter();
  
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

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
        
        // Load group info for each plan
        const groupInfoPromises = response.data.map(async (group) => {
          if (group.post_id) {
            try {
              const groupInfo = await apiService.getPlanGroups(group.post_id, user.user_id);
              return { postId: group.post_id, info: groupInfo.data };
            } catch (error) {
              return { postId: group.post_id, info: { has_active_group: false, latest_group: null, total_active_groups: 0 } };
            }
          }
          return null;
        });
        
        const groupInfos = await Promise.all(groupInfoPromises);
        const groupInfoMap: { [postId: string]: PlanGroupInfo } = {};
        groupInfos.forEach((item) => {
          if (item && item.info) {
            groupInfoMap[item.postId] = item.info;
          }
        });
        setPlanGroupInfo(groupInfoMap);
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

  const openGroupModal = (postId: string) => {
    setCurrentPostId(postId);
    setSelectedUsers(new Set());
    setGroupName('');
    setShowGroupModal(true);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setCurrentPostId(null);
    setSelectedUsers(new Set());
    setGroupName('');
  };

  const toggleUserSelection = (userId: string) => {
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

    const uniqueUserIds = [...new Set(currentGroup.interactions.map((i) => i.source_user_id))];
    const allSelected = uniqueUserIds.length > 0 && selectedUsers.size === uniqueUserIds.length;

    if (allSelected) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(uniqueUserIds));
    }
  };

  const handleCreateGroup = async () => {
    if (!currentPostId || !user?.user_id) return;

    const name = groupName.trim();
    if (selectedUsers.size === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    if (!name && !planGroupInfo[currentPostId]?.has_active_group) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreatingGroup(currentPostId);
    try {
      const memberIds = Array.from(selectedUsers);
      const groupInfo = planGroupInfo[currentPostId];
      const hasActiveGroup = groupInfo?.has_active_group || false;
      
      if (hasActiveGroup && groupInfo?.latest_group) {
        // Add to existing group
        await apiService.addMembersToGroup(groupInfo.latest_group.group_id, memberIds);
        Alert.alert(
          'Members Added! 🎉',
          `${memberIds.length} member${memberIds.length > 1 ? 's' : ''} added to "${groupInfo.latest_group.group_name || 'the group'}"`,
          [
            {
              text: 'Go to Chat',
              onPress: () => {
                router.push({
                  pathname: '/chat/group/[groupId]',
                  params: { groupId: groupInfo.latest_group!.group_id },
                } as any);
              },
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        // Create new group
        const response = await apiService.createGroup(currentPostId, user.user_id, memberIds, name);
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
        }
      }
      
      closeGroupModal();
      loadNotifications();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
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
  const allSelected = uniqueUserIds.length > 0 && selectedUsers.size === uniqueUserIds.length;
  const groupInfo = currentPostId ? planGroupInfo[currentPostId] : null;
  const hasActiveGroup = groupInfo?.has_active_group || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentUser?.profile_image && (
            <View style={styles.headerAvatarContainer}>
              <Avatar uri={currentUser.profile_image} size={40} />
              {notifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notifications.length > 99 ? '99+' : notifications.length}
                  </Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.headerText}>Notifications</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color="#FFD700" />
        </TouchableOpacity>
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
            {/* TOP SECTION: First notification as highlighted card */}
            {notifications.length > 0 && (
              <View style={styles.highlightedCardContainer}>
                <NotificationCard
                  key={notifications[0].post_id}
                  post_id={notifications[0].post_id}
                  post={notifications[0].post}
                  interactions={notifications[0].interactions}
                  created_at={notifications[0].created_at}
                  userCache={userCache}
                  onPress={() => openGroupModal(notifications[0].post_id)}
                />
              </View>
            )}

            {/* BELOW SECTION: All other notifications as list items */}
            <View style={styles.listContainer}>
              {notifications.slice(1).flatMap((group, groupIndex) =>
                group.interactions.map((interaction, interactionIndex) => {
                  const allInteractions = notifications.slice(1).flatMap(g => g.interactions);
                  const currentIndex = notifications.slice(1).slice(0, groupIndex).reduce((sum, g) => sum + g.interactions.length, 0) + interactionIndex;
                  const isLast = currentIndex === allInteractions.length - 1;
                  
                  return (
                    <NotificationListItem
                      key={`${group.post_id}-${interaction.notification_id}`}
                      interaction={interaction}
                      userCache={userCache}
                      onPress={() => {
                        // Navigate to post details or open group modal
                        if (group.post?.plan_id) {
                          router.push({
                            pathname: '/plan/[planId]',
                            params: { planId: group.post.plan_id },
                          } as any);
                        }
                      }}
                      showDivider={!isLast}
                    />
                  );
                })
              )}
            </View>
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
                <Text style={styles.modalHeaderText}>
                  {hasActiveGroup ? (groupInfo?.latest_group?.group_name || 'Group') : 'Cycling Group'}
                </Text>
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
                
                return (
                  <TouchableOpacity
                    key={userId}
                    style={styles.userItem}
                    onPress={() => toggleUserSelection(userId)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      uri={user?.profile_image || null}
                      size={40}
                    />
                    <Text style={styles.userName}>{user?.name || 'Unknown'}</Text>
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

            {/* Group Name Input */}
            {!hasActiveGroup && (
              <TextInput
                style={styles.groupNameInput}
                placeholder="Group Name"
                placeholderTextColor="#9CA3AF"
                value={groupName}
                onChangeText={setGroupName}
              />
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.modalActionButton,
                (selectedUsers.size === 0 || (!hasActiveGroup && !groupName.trim()) || creatingGroup !== null) &&
                  styles.modalActionButtonDisabled,
              ]}
              onPress={handleCreateGroup}
              disabled={selectedUsers.size === 0 || (!hasActiveGroup && !groupName.trim()) || creatingGroup !== null}
              activeOpacity={0.8}
            >
              {creatingGroup ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalActionButtonText}>
                  {hasActiveGroup ? 'Add to Group' : 'Create group'}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatarContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#F2F2F7',
    zIndex: 10,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  highlightedCardContainer: {
    padding: 20,
    paddingBottom: 0,
    backgroundColor: '#F2F2F7',
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
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
  userName: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
  },
  selectAllItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
