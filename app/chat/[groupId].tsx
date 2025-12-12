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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme';
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

export default function IndividualChatScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (groupId) {
      loadMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [groupId]);

  const loadMessages = async () => {
    if (!groupId) return;
    
    try {
      const response = await apiService.getMessages(groupId);
      if (response.data) {
        setMessages(response.data);
        // Scroll to bottom after loading
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
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
      // Show success feedback (message appears in chat, so no alert needed)
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user?.user_id) return;

    try {
      const message = messages.find((m) => m.message_id === messageId);
      const hasReaction = message?.reactions.some(
        (r) => r.user_id === user.user_id && r.emoji_type === emoji
      );

      if (hasReaction) {
        await apiService.removeReaction(messageId, user.user_id, emoji);
      } else {
        await apiService.addReaction(messageId, user.user_id, emoji);
      }
      await loadMessages();
    } catch (error: any) {
      console.error('Error toggling reaction:', error);
    }
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const shouldShowDateSeparator = (current: Message, previous: Message | null) => {
    if (!previous) return true;
    const currentDate = new Date(current.timestamp).toDateString();
    const previousDate = new Date(previous.timestamp).toDateString();
    return currentDate !== previousDate;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.user_id === user?.user_id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = shouldShowDateSeparator(item, previousMessage);
    const showAvatar = !isMe && (!previousMessage || previousMessage.user_id !== item.user_id);

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatTime(item.timestamp)}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isMe ? styles.messageContainerRight : styles.messageContainerLeft,
          ]}
        >
          {showAvatar && item.user && (
            <Image
              source={{ uri: item.user.profile_image || 'https://via.placeholder.com/30' }}
              style={styles.messageAvatar}
            />
          )}
          <View
            style={[
              styles.messageBubble,
              isMe ? styles.messageBubbleRight : styles.messageBubbleLeft,
            ]}
          >
            {!isMe && item.user && (
              <Text style={styles.senderName}>{item.user.name}</Text>
            )}
            {item.type === 'text' && (
              <Text style={[styles.messageText, isMe && styles.messageTextRight]}>
                {typeof item.content === 'string' ? item.content : 'Message'}
              </Text>
            )}
            {item.type === 'image' && (
              <Image
                source={{ uri: item.content?.url || item.content }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            )}
            {item.reactions && item.reactions.length > 0 && (
              <View style={styles.reactionsContainer}>
                {Array.from(new Set(item.reactions.map((r) => r.emoji_type))).map((emoji) => {
                  const count = item.reactions.filter((r) => r.emoji_type === emoji).length;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionBadge}
                      onPress={() => handleReaction(item.message_id, emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      <Text style={styles.reactionCount}>{count}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {messages[0]?.user?.name || 'Chat'}
        </Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputIcon}>
            <Ionicons name="happy-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Send a message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.inputIcon}>
            <Ionicons name="camera-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: borderRadius.lg,
  },
  messageBubbleLeft: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 20,
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.md,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  inputIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.lg,
    fontSize: 15,
    color: Colors.light.text,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.inputBackground,
  },
});

