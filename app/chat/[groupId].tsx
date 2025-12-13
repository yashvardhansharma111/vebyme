import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

interface Message {
  message_id: string;
  user_id: string;
  type: 'text' | 'image' | 'poll';
  content: any;
  timestamp: Date | string;
  reactions: Array<{
    reaction_id: string;
    user_id: string;
    emoji_type: string;
  }>;
  user?: {
    user_id: string;
    name: string;
    profile_image: string;
  };
}

interface GroupDetails {
  group_id: string;
  group_name: string;
  members: Array<{
    user_id: string;
    name: string;
    profile_image: string;
  }>;
}

export default function IndividualChatScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [groupId]);

  const loadGroupDetails = async () => {
    if (!groupId) return;
    
    try {
      const response = await apiService.getGroupDetails(groupId);
      if (response.data) {
        setGroupDetails(response.data);
      }
    } catch (error: any) {
      console.error('Error loading group details:', error);
    }
  };

  const loadMessages = async () => {
    if (!groupId) return;
    try {
      const response = await apiService.getMessages(groupId);
      if (response.data) {
        setMessages(response.data);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user?.user_id || !groupId || sending) return;

    try {
      setSending(true);
      const content = inputText.trim();
      await apiService.sendMessage(groupId, user.user_id, 'text', content);
      setInputText('');
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const formatTimeHeader = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const renderHeader = () => {
    // Get the other user from group details (for individual chats)
    const otherUser = groupDetails?.members?.find(m => m.user_id !== user?.user_id);
    const chatImage = otherUser?.profile_image;
    const chatName = otherUser?.name || 'Chat';
    const otherUserId = otherUser?.user_id;

    const handleProfilePress = () => {
      if (otherUserId) {
        router.push(`/profile/${otherUserId}` as any);
      }
    };

    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>

          {/* Pill Shaped User Header - Left Aligned - Clickable to go to profile */}
          <TouchableOpacity 
            style={styles.headerPill}
            onPress={handleProfilePress}
            disabled={!otherUserId}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: chatImage || 'https://via.placeholder.com/40' }}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerName} numberOfLines={1}>
              {chatName}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right side placeholder (optional, keeps layout balanced if needed) */}
        <View style={styles.headerRightPlaceholder} />
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.user_id === user?.user_id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    
    const showTimeHeader = !previousMessage || 
      (new Date(item.timestamp).getTime() - new Date(previousMessage.timestamp).getTime() > 3600000);

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {showTimeHeader && (
          <View style={styles.timeHeaderContainer}>
            <Text style={styles.timeHeaderText}>{formatTimeHeader(item.timestamp)}</Text>
          </View>
        )}

        <View
          style={[
            styles.messageRow,
            isMe ? styles.rowRight : styles.rowLeft,
          ]}
        >
          {!isMe && (
            <Image
              source={{ uri: item.user?.profile_image || 'https://via.placeholder.com/30' }}
              style={styles.messageAvatar}
            />
          )}

          <View
            style={[
              styles.messageBubble,
              isMe ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            {item.type === 'text' && (
              <Text style={[styles.messageText, isMe ? styles.textRight : styles.textLeft]}>
                {typeof item.content === 'string' ? item.content : ''}
              </Text>
            )}
            {item.type === 'image' && (
              <Image
                source={{ uri: item.content?.url || item.content }}
                style={styles.messageImage}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header is OUTSIDE KeyboardAvoidingView to stay fixed at top */}
      {renderHeader()}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 10 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Input Area */}
        <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          
          {/* Input Pill: Text + Camera Icon */}
          <View style={styles.inputPill}>
            <TextInput
              style={styles.input}
              placeholder="Send a message"
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline={false} // Keeping single line usually looks cleaner for "pill" inputs
            />
            
            {/* Gallery/Camera Icon INSIDE the pill */}
            <TouchableOpacity style={styles.iconButton}>
               <Ionicons name="image-outline" size={24} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Send Button OUTSIDE the pill */}
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  
  // --- Header Styles ---
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // Subtle separator
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#DDD',
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    maxWidth: 150, // prevent overly long names from breaking layout
  },
  headerRightPlaceholder: {
    width: 40, 
  },

  // --- List Styles ---
  listContent: {
    paddingTop: 10,
  },
  timeHeaderContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  timeHeaderText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  // --- Message Bubbles ---
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24, // Fully curvy
  },
  bubbleLeft: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#2D2D2D',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textLeft: {
    color: '#1F2937',
  },
  textRight: {
    color: '#FFFFFF',
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 16,
  },

  // --- Input Bar Styles ---
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inputPill: {
    flex: 1, // Takes available space
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6, // Controls height of pill
    marginRight: 10, // Space between pill and send button
    // Shadow for pill
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4, // Adjust for centering text
    maxHeight: 100,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D2D2D', // Dark circle
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});