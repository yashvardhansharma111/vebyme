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
  poll?: {
    poll_id: string;
    question: string;
    options: Array<{
      option_id: string;
      option_text: string;
      vote_count: number;
    }>;
  };
}

interface GroupDetails {
  group_id: string;
  group_name: string;
  plan: {
    plan_id: string;
    title: string;
    description: string;
    media: any[];
  } | null;
  members: Array<{
    user_id: string;
    name: string;
    profile_image: string;
  }>;
  is_closed: boolean;
}

export default function GroupChatScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAppSelector((state) => state.auth);
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
      // Poll for new messages every 3 seconds
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
    if (groupDetails?.is_closed) {
      Alert.alert('Chat Disabled', 'Messaging has been disabled by admin');
      return;
    }

    try {
      setSending(true);
      const content = inputText.trim();
      await apiService.sendMessage(groupId, user.user_id, 'text', content);
      setInputText('');
      await loadMessages();
      // Message appears in chat, providing visual feedback
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (!user?.user_id) return;

    try {
      await apiService.votePoll(pollId, user.user_id, optionId);
      await loadMessages();
      // Vote is reflected in the poll UI, providing visual feedback
    } catch (error: any) {
      Alert.alert('Error', 'Failed to vote. Please try again.');
      console.error('Error voting:', error);
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

  const renderPoll = (message: Message) => {
    if (!message.poll) return null;

    const totalVotes = message.poll.options.reduce((sum, opt) => sum + opt.vote_count, 0);

    return (
      <View style={styles.pollContainer}>
        <Text style={styles.pollQuestion}>{message.poll.question}</Text>
        <Text style={styles.pollVotes}>{totalVotes} votes</Text>
        {message.poll.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
          return (
            <TouchableOpacity
              key={option.option_id}
              style={styles.pollOption}
              onPress={() => handleVotePoll(message.poll!.poll_id, option.option_id)}
            >
              <View style={styles.pollOptionContent}>
                <Text style={styles.pollOptionText}>{option.option_text}</Text>
                <Text style={styles.pollPercentage}>{Math.round(percentage)}%</Text>
              </View>
              <View style={styles.pollBarContainer}>
                <View style={[styles.pollBar, { width: `${percentage}%` }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.user_id === user?.user_id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = shouldShowDateSeparator(item, previousMessage);
    const showAvatar = !isMe && (!previousMessage || previousMessage.user_id !== item.user_id);

    // Check if this is a plan message (first message from "You Interacted" and others)
    const isPlanMessage = item.type === 'text' && item.content?.plan_id;

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatTime(item.timestamp)}</Text>
          </View>
        )}
        {isPlanMessage && (
          <View style={styles.planMessageContainer}>
            <Text style={styles.planMessageLabel}>You Interacted</Text>
            <Text style={styles.planMessageOthers}>+{groupDetails?.members.length ? groupDetails.members.length - 1 : 0} Others</Text>
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
            {item.type === 'text' && !item.poll && (
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
            {item.type === 'poll' && item.poll && renderPoll(item)}
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

  const isClosed = groupDetails?.is_closed || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => {
            router.push({
              pathname: '/chat/group/details/[groupId]',
              params: { groupId: groupId || '' },
            } as any);
          }}
        >
          {groupDetails?.members && groupDetails.members.length > 0 && (
            <View style={styles.headerAvatars}>
              {groupDetails.members.slice(0, 3).map((member, idx) => (
                <Image
                  key={member.user_id}
                  source={{ uri: member.profile_image || 'https://via.placeholder.com/30' }}
                  style={[styles.headerAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}
                />
              ))}
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupDetails?.group_name || 'Group Chat'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/chat/group/details/[groupId]',
              params: { groupId: groupId || '' },
            } as any);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {isClosed && (
        <View style={styles.disabledBanner}>
          <Text style={styles.disabledText}>Messaging disabled by admin</Text>
        </View>
      )}

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
          <TouchableOpacity
            style={styles.inputIcon}
            onPress={() => {
              router.push({
                pathname: '/chat/poll/create',
                params: { groupId: groupId || '' },
              } as any);
            }}
          >
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
            editable={!isClosed}
          />
          <TouchableOpacity style={styles.inputIcon}>
            <Ionicons name="camera-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending || isClosed) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending || isClosed}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={inputText.trim() && !isClosed ? '#FFFFFF' : '#9CA3AF'}
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
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  disabledBanner: {
    backgroundColor: '#2C2C2E',
    padding: 12,
    alignItems: 'center',
  },
  disabledText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  planMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  planMessageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  planMessageOthers: {
    fontSize: 12,
    color: '#6B7280',
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
  pollContainer: {
    marginTop: 4,
  },
  pollQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  pollVotes: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  pollOption: {
    marginBottom: 8,
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pollOptionText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  pollPercentage: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  pollBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  pollBar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 3,
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

