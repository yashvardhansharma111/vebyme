import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/services/api';
import Avatar from './Avatar';

interface ShareToChatModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  postDescription: string;
  postMedia: any[];
  userId: string;
  onShareSuccess?: () => void;
}

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
    user_id: string;
    name: string;
    profile_image: string;
  } | null;
  last_message?: {
    content: string;
    type: string;
    timestamp: string;
    user_id: string;
  } | null;
  member_count: number;
  is_group: boolean;
  group_name: string;
}

export default function ShareToChatModal({
  visible,
  onClose,
  postId,
  postTitle,
  postDescription,
  postMedia,
  userId,
  onShareSuccess,
}: ShareToChatModalProps) {
  const [chatLists, setChatLists] = useState<{
    their_plans: ChatItem[];
    my_plans: ChatItem[];
    groups: ChatItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      loadChatLists();
    }
  }, [visible, userId]);

  const loadChatLists = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChatLists(userId);
      if (response.data) {
        setChatLists(response.data);
      }
    } catch (error: any) {
      console.error('Error loading chat lists:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const handleShareToChat = async (group_id: string) => {
    if (!userId) return;

    try {
      setSharing(group_id);
      await apiService.sendMessage(group_id, userId, 'plan', {
        plan_id: postId,
        title: postTitle,
        description: postDescription,
        media: postMedia || [],
      });
      Alert.alert('Success', 'Post shared to chat!', [
        {
          text: 'OK',
          onPress: () => {
            onShareSuccess?.();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error sharing to chat:', error);
      Alert.alert('Error', error.message || 'Failed to share post');
    } finally {
      setSharing(null);
    }
  };

  const renderChatItem = (item: ChatItem) => {
    const isSharing = sharing === item.group_id;
    const displayName = item.group_name || item.plan_title || 'Chat';
    
    // Safely extract image URL
    let displayImage: string | null = null;
    if (item.is_group && item.member_count > 2) {
      // For groups, use plan media
      const mediaItem = item.plan_media?.[0];
      if (mediaItem) {
        displayImage = typeof mediaItem === 'string' ? mediaItem : mediaItem?.url || null;
      }
    } else {
      // For individual chats, use user profile image
      displayImage = item.other_user?.profile_image || item.author_image || null;
    }

    return (
      <TouchableOpacity
        key={item.group_id}
        style={styles.chatItem}
        onPress={() => handleShareToChat(item.group_id)}
        disabled={isSharing}
        activeOpacity={0.7}
      >
        <View style={styles.chatItemLeft}>
          {item.is_group && item.member_count > 2 ? (
            <View style={styles.groupAvatarContainer}>
              {displayImage && typeof displayImage === 'string' && displayImage.trim() !== '' ? (
                <Image 
                  source={{ uri: displayImage }} 
                  style={styles.groupAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.groupAvatarPlaceholder}>
                  <Ionicons name="people" size={20} color="#8E8E93" />
                </View>
              )}
            </View>
          ) : (
            <Avatar uri={displayImage} size={50} />
          )}
          <View style={styles.chatItemInfo}>
            <Text style={styles.chatItemName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.last_message && (
              <Text style={styles.chatItemLastMessage} numberOfLines={1}>
                {item.last_message.type === 'text'
                  ? item.last_message.content
                  : item.last_message.type === 'image'
                  ? '📷 Photo'
                  : item.last_message.type === 'plan'
                  ? '📋 Plan'
                  : 'Message'}
              </Text>
            )}
          </View>
        </View>
        {isSharing ? (
          <ActivityIndicator size="small" color="#1C1C1E" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        )}
      </TouchableOpacity>
    );
  };

  const allChats: ChatItem[] = [
    ...(chatLists?.their_plans || []),
    ...(chatLists?.my_plans || []),
    ...(chatLists?.groups || []),
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="paper-plane" size={24} color="#1C1C1E" />
              <Text style={styles.headerTitle}>Share to Chat</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1C1C1E" />
            </View>
          ) : allChats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyText}>No chats available</Text>
              <Text style={styles.emptySubtext}>Start a conversation to share posts</Text>
            </View>
          ) : (
            <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
              {/* Their Plans Section */}
              {chatLists?.their_plans && chatLists.their_plans.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Their Plans</Text>
                  {chatLists.their_plans.map(renderChatItem)}
                </View>
              )}

              {/* My Plans Section */}
              {chatLists?.my_plans && chatLists.my_plans.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>My Plans</Text>
                  {chatLists.my_plans.map(renderChatItem)}
                </View>
              )}

              {/* Groups Section */}
              {chatLists?.groups && chatLists.groups.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Groups</Text>
                  {chatLists.groups.map(renderChatItem)}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  chatList: {
    maxHeight: 500,
  },
  section: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  chatItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  groupAvatar: {
    width: '100%',
    height: '100%',
  },
  groupAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  chatItemLastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
