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
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

// --- Interfaces ---
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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (!user?.user_id) return;
    if (groupDetails?.is_closed) {
      Alert.alert('Chat Disabled', 'Messaging has been disabled by admin');
      return;
    }
    try {
      await apiService.votePoll(pollId, user.user_id, optionId);
      await loadMessages();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to vote.');
    }
  };

  const handlePickImage = async () => {
    if (groupDetails?.is_closed) {
      Alert.alert('Chat Disabled', 'Messaging has been disabled by admin');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user?.user_id && groupId) {
        try {
          setSending(true);
          const asset = result.assets[0];
          
          // Upload image first
          const formData = new FormData();
          // @ts-ignore
          formData.append('file', {
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
            name: 'image.jpg',
            type: 'image/jpeg',
          });

          const uploadResponse = await apiService.uploadImage(formData, user.access_token);
          if (uploadResponse.data?.url) {
            // Send image as message
            await apiService.sendMessage(groupId, user.user_id, 'image', {
              url: uploadResponse.data.url,
            });
            await loadMessages();
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        } catch (error: any) {
          Alert.alert('Error', 'Failed to send image.');
          console.error('Error sending image:', error);
        } finally {
          setSending(false);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Error picking image:', error);
    }
  };

  const handleCreatePoll = () => {
    if (groupDetails?.is_closed) {
      Alert.alert('Chat Disabled', 'Messaging has been disabled by admin');
      return;
    }
    router.push({
      pathname: '/chat/poll/create',
      params: { groupId: groupId || '' },
    } as any);
  };

  const formatTimeHeader = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    }).toLowerCase();

    if (isToday) return `Today, ${timeStr}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  // --- Render Functions ---

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerPill}
            onPress={() => router.push(`/chat/group/details/${groupId}` as any)}
          >
            {groupDetails?.members && groupDetails.members.length > 0 && (
              <View style={styles.avatarStack}>
                {groupDetails.members.slice(0, 3).map((member, idx) => (
                  <Image
                    key={member.user_id}
                    source={{ uri: member.profile_image || 'https://via.placeholder.com/30' }}
                    style={[styles.headerAvatar, { marginLeft: idx > 0 ? -12 : 0, zIndex: 3 - idx }]}
                  />
                ))}
              </View>
            )}
            <Text style={styles.headerName} numberOfLines={1}>
              {groupDetails?.group_name || 'Group'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push(`/chat/group/details/${groupId}` as any)}>
           <Ionicons name="ellipsis-vertical" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPlanCard = () => {
    if (!groupDetails?.plan) return null;
    const { plan } = groupDetails;
    const memberCount = groupDetails.members?.length || 0;
    const otherMembersCount = memberCount > 1 ? memberCount - 1 : 0;

    return (
      <View style={styles.planContainer}>
        <View style={styles.planCard}>
          <View style={styles.planBadgeRow}>
            <View style={styles.planBadgeDark}>
              <Text style={styles.planBadgeTextDark}>You Interacted</Text>
            </View>
            {otherMembersCount > 0 && (
              <View style={styles.planBadgeLight}>
                <Text style={styles.planBadgeTextLight}>+{otherMembersCount} {otherMembersCount === 1 ? 'Other' : 'Others'}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.planTitle}>{plan.title || 'Trip Plan'}</Text>
          <Text style={styles.planDescription}>
            {plan.description} 
            <Text style={{fontWeight: '700'}}> vybeme!</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderPoll = (message: Message) => {
    if (!message.poll) return null;
    const totalVotes = message.poll.options.reduce((sum, opt) => sum + opt.vote_count, 0);

    // Sort to find the "winner" visual for styling
    const maxVotes = Math.max(...message.poll.options.map(o => o.vote_count));

    return (
      <View style={styles.pollWrapper}>
        <Text style={styles.pollQuestion}>{message.poll.question}</Text>
        <Text style={styles.pollVoteCount}>{totalVotes} votes</Text>
        
        {message.poll.options.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
          // If this option is the leader (or arbitrarily selected), make it dark
          const isLeader = option.vote_count === maxVotes && option.vote_count > 0;

          return (
            <TouchableOpacity
              key={option.option_id}
              style={[styles.pollOptionPill, isLeader ? styles.pollOptionDark : styles.pollOptionLight]}
              onPress={() => handleVotePoll(message.poll!.poll_id, option.option_id)}
            >
              <Text style={[styles.pollOptionText, isLeader ? { color: '#FFF' } : { color: '#000' }]}>
                {option.option_text}
              </Text>

              <View style={styles.pollRightContent}>
                {/* Mocking voter avatars for visual match */}
                {option.vote_count > 0 && (
                   <View style={styles.voterStack}>
                      <Image source={{uri: 'https://via.placeholder.com/20'}} style={styles.voterAvatar} />
                      <Image source={{uri: 'https://via.placeholder.com/20'}} style={[styles.voterAvatar, { marginLeft: -8 }]} />
                      <Image source={{uri: 'https://via.placeholder.com/20'}} style={[styles.voterAvatar, { marginLeft: -8 }]} />
                   </View>
                )}
                <Text style={[styles.pollPercent, isLeader ? { color: '#FFF' } : { color: '#000' }]}>
                  {percentage}%
                </Text>
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
    const showTimeHeader = !previousMessage || 
      (new Date(item.timestamp).getTime() - new Date(previousMessage.timestamp).getTime() > 3600000);
    const showAvatar = !isMe && (!previousMessage || previousMessage.user_id !== item.user_id);

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {showTimeHeader && (
          <View style={styles.timeHeaderContainer}>
            <Text style={styles.timeHeaderText}>{formatTimeHeader(item.timestamp)}</Text>
          </View>
        )}

        {/* Polls render full width usually, but here handled inside bubble structure or standalone */}
        {item.type === 'poll' ? (
           <View style={{ marginBottom: 20 }}>{renderPoll(item)}</View>
        ) : (
          <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
            {!isMe && (
               <Image 
                 source={{ uri: item.user?.profile_image || 'https://via.placeholder.com/30' }} 
                 style={[styles.messageAvatar, { opacity: showAvatar ? 1 : 0 }]} 
               />
            )}
            
            <View style={[styles.messageBubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
              {item.type === 'text' && (
                <Text style={[styles.messageText, isMe ? styles.textRight : styles.textLeft]}>
                  {item.content}
                </Text>
              )}
              {item.type === 'image' && (
                 <Image 
                    source={{ uri: item.content?.url || item.content }} 
                    style={styles.messageImage} 
                    resizeMode="cover"
                 />
              )}
            </View>
          </View>
        )}
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
          ListHeaderComponent={renderPlanCard} // This puts the Plan at the top
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Input Area */}
        {!groupDetails?.is_closed ? (
           <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
             <View style={styles.inputPill}>
               <TextInput
                 style={styles.input}
                 placeholder="Send a message"
                 placeholderTextColor="#999"
                 value={inputText}
                 onChangeText={setInputText}
                 multiline={false}
               />
               <TouchableOpacity 
                 style={styles.iconButton}
                 onPress={handlePickImage}
                 disabled={sending}
               >
                  <Ionicons name="image-outline" size={24} color="#999" />
               </TouchableOpacity>
               <TouchableOpacity 
                 style={styles.iconButton}
                 onPress={handleCreatePoll}
                 disabled={sending}
               >
                  <Ionicons name="bar-chart-outline" size={24} color="#999" />
               </TouchableOpacity>
             </View>
             <TouchableOpacity 
               style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
               onPress={handleSend}
               disabled={!inputText.trim() || sending}
             >
               <Ionicons name="arrow-up" size={20} color="#FFF" />
             </TouchableOpacity>
           </View>
        ) : (
          <View style={styles.disabledBanner}>
             <Text style={styles.disabledText}>Only admins can send messages</Text>
          </View>
        )}
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
  },

  // --- Header Styles ---
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: 8,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },

  // --- Plan Card Styles (The "Spontaneous Trip" box) ---
  planContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  planCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 16,
  },
  planBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  planBadgeDark: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planBadgeTextDark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planBadgeLight: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planBadgeTextLight: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  planDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  // --- Poll Styles ---
  pollWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  pollVoteCount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  pollOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 30, // Fully rounded
    marginBottom: 8,
  },
  pollOptionDark: {
    backgroundColor: '#333', // Dark selection
  },
  pollOptionLight: {
    backgroundColor: '#E5E7EB', // Light default
  },
  pollOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pollRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voterStack: {
    flexDirection: 'row',
    marginRight: 8,
  },
  voterAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pollPercent: {
    fontSize: 14,
    fontWeight: '700',
  },

  // --- List & Messages ---
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  timeHeaderContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  timeHeaderText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  
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
    borderRadius: 24, // Curvy bubbles
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
  textLeft: { color: '#1F2937' },
  textRight: { color: '#FFF' },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 16,
  },

  // --- Input ---
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    marginRight: 10,
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
    paddingVertical: 4,
    maxHeight: 100,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  disabledBanner: {
    backgroundColor: '#374151',
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  disabledText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  }
});