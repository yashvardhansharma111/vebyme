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
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import LoginModal from '@/components/LoginModal';

type TabType = 'their_plans' | 'my_plans' | 'groups';

interface ChatItem {
  group_id: string;
  plan_id: string;
  plan_title: string;
  plan_description: string;
  plan_media: any[];
  author_id: string;
  author_name: string;
  author_image: string | null;
  last_message: {
    content: any;
    type: string;
    timestamp: Date;
    user_id: string;
  } | null;
  member_count: number;
  is_group: boolean;
  group_name: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>('their_plans');
  const [theirPlans, setTheirPlans] = useState<ChatItem[]>([]);
  const [myPlans, setMyPlans] = useState<ChatItem[]>([]);
  const [groups, setGroups] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      loadChats();
    } else {
      setShowLoginModal(true);
    }
  }, [isAuthenticated, user]);

  const loadChats = async () => {
    if (!user?.user_id) return;
    
    try {
      setLoading(true);
      const response = await apiService.getChatLists(user.user_id);
      if (response.data) {
        setTheirPlans(response.data.their_plans || []);
        setMyPlans(response.data.my_plans || []);
        setGroups(response.data.groups || []);
      }
    } catch (error: any) {
      console.error('Error loading chats:', error);
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

  const formatTime = (timestamp: Date | string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getLastMessageText = (item: ChatItem) => {
    if (!item.last_message) return 'No messages yet';
    
    if (item.last_message.type === 'text') {
      return typeof item.last_message.content === 'string' 
        ? item.last_message.content 
        : 'Message';
    }
    if (item.last_message.type === 'image') {
      return '📷 Photo';
    }
    if (item.last_message.type === 'poll') {
      return '📊 Poll';
    }
    return 'Message';
  };

  const handleChatPress = (item: ChatItem) => {
    // Navigate to chat - the chat screen will show the conversation
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
    // For individual chats, show the other user's name and image
    // For group chats, show group name and plan image
    const displayName = item.is_group 
      ? item.group_name 
      : (item.other_user?.name || item.author_name);
    const displayImage = item.is_group 
      ? (item.plan_media?.[0]?.url || item.author_image)
      : (item.other_user?.profile_image || item.author_image);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: displayImage || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
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

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            loadChats();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'their_plans' && styles.tabActive]}
          onPress={() => setActiveTab('their_plans')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'their_plans' && styles.tabTextActive,
            ]}
          >
            Their Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my_plans' && styles.tabActive]}
          onPress={() => setActiveTab('my_plans')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'my_plans' && styles.tabTextActive,
            ]}
          >
            My Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'groups' && styles.tabTextActive,
            ]}
          >
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
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
              <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
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
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 16,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});
