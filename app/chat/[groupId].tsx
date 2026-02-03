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
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

const REACTION_EMOJIS = [
  { type: 'laugh', emoji: '😂' },
  { type: 'heart', emoji: '❤️' },
  { type: 'thumbsup', emoji: '👍' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
];

interface Message {
  message_id: string;
  user_id: string;
  type: 'text' | 'image' | 'poll' | 'plan';
  content: any;
  timestamp: Date | string;
  reactions?: Array<{
    reaction_id: string;
    user_id: string;
    emoji_type: string;
  }>;
  user?: {
    user_id: string;
    name: string;
    profile_image: string;
  };
  shared_plan?: {
    plan_id: string;
    title: string;
    description: string;
    media?: any[];
    tags?: string[];
    category_main?: string;
    category_sub?: string[];
    is_business?: boolean;
  };
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH - 32 - 40;

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [sharedPlanImageErrors, setSharedPlanImageErrors] = useState<Set<string>>(new Set());
  const [messageImageErrors, setMessageImageErrors] = useState<Set<string>>(new Set());
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

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0] && user?.user_id && groupId) {
        setSending(true);
        try {
          const asset = result.assets[0];
          const formData = new FormData();
          // @ts-ignore
          formData.append('file', {
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
            name: 'image.jpg',
            type: 'image/jpeg',
          });
          const uploadResponse = await apiService.uploadImage(formData, user.access_token);
          if (uploadResponse.data?.url) {
            await apiService.sendMessage(groupId, user.user_id, 'image', { url: uploadResponse.data.url });
            await loadMessages();
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        } catch (e: any) {
          Alert.alert('Error', 'Failed to send image.');
        } finally {
          setSending(false);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddReaction = async (messageId: string, emojiType: string) => {
    if (!user?.user_id) return;
    setReactionMessageId(null);
    try {
      await apiService.addMessageReaction(messageId, user.user_id, emojiType);
      await loadMessages();
    } catch (e) {
      // ignore
    }
  };

  const handleOpenShareModal = async () => {
    if (!user?.user_id) return;
    setShowShareModal(true);
    setLoadingPlans(true);
    try {
      const response = await apiService.getUserPlans(user.user_id, 50, 0);
      if (response.data) setAvailablePlans(response.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSharePlan = async (plan: any) => {
    if (!groupId || !user?.user_id) return;
    try {
      setSending(true);
      await apiService.sendMessage(groupId, user.user_id, 'plan', {
        plan_id: plan.plan_id || plan.post_id,
        title: plan.title,
        description: plan.description,
        media: plan.media || [],
        tags: plan.category_sub || plan.tags || [],
        is_business: plan.is_business === true,
      });
      setShowShareModal(false);
      await loadMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to share plan.');
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
    const otherUser = groupDetails?.members?.find(m => m.user_id !== user?.user_id);
    const chatImage = otherUser?.profile_image;
    const chatName = otherUser?.name || 'Chat';
    const otherUserId = otherUser?.user_id;

    return (
      <>
        <View style={styles.titleBar}>
          <Text style={styles.titleBarText}>Individual Chat</Text>
        </View>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerPill}
            onPress={() => otherUserId && router.push(`/profile/${otherUserId}` as any)}
            disabled={!otherUserId}
            activeOpacity={0.7}
          >
            <Image source={{ uri: chatImage || 'https://via.placeholder.com/40' }} style={styles.headerAvatar} />
            <Text style={styles.headerName} numberOfLines={1}>{chatName}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerRightIcon} onPress={() => otherUserId && router.push(`/profile/${otherUserId}` as any)}>
            <Image source={{ uri: chatImage || 'https://via.placeholder.com/24' }} style={styles.headerRightAvatar} />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderSharedPlanCard = (plan: Message['shared_plan']) => {
    if (!plan) return null;
    const mediaItem = plan.media?.[0];
    const mediaUri = mediaItem ? (typeof mediaItem === 'string' ? mediaItem : mediaItem?.url) : null;
    const tags = plan.tags || plan.category_sub || (plan.category_main ? [plan.category_main] : []);
    const isBusiness = plan.is_business === true;
    const actionLabel = isBusiness ? 'Register' : 'Join';
    const imageFailed = mediaUri && sharedPlanImageErrors.has(mediaUri);

    return (
      <View style={styles.sharedPlanCard}>
        <Text style={styles.sharedPlanTitle} numberOfLines={1}>{plan.title}</Text>
        <Text style={styles.sharedPlanDescription} numberOfLines={3}>{plan.description}</Text>
        <View style={styles.sharedPlanMiddleRow}>
          <View style={styles.sharedPlanTags}>
            {tags.slice(0, 3).map((tag: string, i: number) => (
              <View key={i} style={styles.sharedPlanTag}>
                <Ionicons name={tag === 'Hitchhiking' ? 'walk' : tag === 'Weekend' ? 'calendar-outline' : 'checkbox'} size={12} color="#555" style={{ marginRight: 4 }} />
                <Text style={styles.sharedPlanTagText} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
          </View>
          {mediaUri && mediaUri.trim() !== '' && !imageFailed && (
            <Image
              source={{ uri: mediaUri }}
              style={styles.sharedPlanImage}
              resizeMode="cover"
              onError={() => setSharedPlanImageErrors((prev) => new Set(prev).add(mediaUri))}
            />
          )}
          {mediaUri && imageFailed && (
            <View style={styles.sharedPlanImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color="#8E8E93" />
            </View>
          )}
        </View>
        <View style={styles.sharedPlanFooter}>
          <TouchableOpacity style={styles.sharedPlanIconBtn}>
            <Ionicons name="repeat-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sharedPlanIconBtn}>
            <Ionicons name="paper-plane-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sharedPlanActionBtn}
            onPress={() => plan.plan_id && router.push(isBusiness ? `/business-plan/${plan.plan_id}` as any : `/plan/${plan.plan_id}` as any)}
          >
            <Text style={styles.sharedPlanActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getEmojiForType = (type: string) => {
    const r = REACTION_EMOJIS.find((e) => e.type === type);
    return r ? r.emoji : '👍';
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.user_id === user?.user_id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTimeHeader = !previousMessage || (new Date(item.timestamp).getTime() - new Date(previousMessage.timestamp).getTime() > 3600000);
    const showReactionPicker = reactionMessageId === item.message_id;

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {showTimeHeader && (
          <View style={styles.timeHeaderContainer}>
            <Text style={styles.timeHeaderText}>{formatTimeHeader(item.timestamp)}</Text>
          </View>
        )}

        <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
          {!isMe && (
            <Image source={{ uri: item.user?.profile_image || 'https://via.placeholder.com/30' }} style={styles.messageAvatar} />
          )}

          <TouchableOpacity
            activeOpacity={1}
            onLongPress={() => setReactionMessageId(item.message_id)}
            delayLongPress={400}
            style={[styles.messageBubbleWrap, isMe && { alignItems: 'flex-end' }, { maxWidth: MAX_BUBBLE_WIDTH }]}
          >
            <View
              style={[
                styles.messageBubble,
                isMe ? styles.bubbleRight : styles.bubbleLeft,
                styles.messageBubbleConstrain,
                { maxWidth: MAX_BUBBLE_WIDTH - 32 },
              ]}
            >
              {item.type === 'text' && (
                <Text
                  style={[styles.messageText, isMe ? styles.textRight : styles.textLeft]}
                  numberOfLines={0}
                >
                  {typeof item.content === 'string' ? item.content : ''}
                </Text>
              )}
              {item.type === 'image' && (() => {
                const imgUri = item.content?.url || item.content;
                const uriStr = typeof imgUri === 'string' ? imgUri : '';
                const imgFailed = uriStr && messageImageErrors.has(uriStr);
                if (!uriStr || uriStr.trim() === '') return null;
                if (imgFailed) {
                  return (
                    <View style={styles.messageImagePlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#8E8E93" />
                      <Text style={styles.messageImagePlaceholderText}>Image</Text>
                    </View>
                  );
                }
                return (
                  <Image
                    source={{ uri: uriStr }}
                    style={styles.messageImage}
                    resizeMode="cover"
                    onError={() => setMessageImageErrors((prev) => new Set(prev).add(uriStr))}
                  />
                );
              })()}
              {item.type === 'plan' && item.shared_plan && renderSharedPlanCard(item.shared_plan)}
            </View>
            {item.reactions && item.reactions.length > 0 && (
              <View style={[styles.reactionsRow, isMe ? styles.reactionsRight : styles.reactionsLeft]}>
                {item.reactions.map((r) => (
                  <Text key={r.reaction_id} style={styles.reactionEmoji}>{getEmojiForType(r.emoji_type)}</Text>
                ))}
              </View>
            )}
            {showReactionPicker && (
              <View style={styles.reactionPicker}>
                {REACTION_EMOJIS.map(({ type, emoji }) => (
                  <TouchableOpacity key={type} onPress={() => handleAddReaction(item.message_id, type)} style={styles.reactionPickerBtn}>
                    <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
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

        {/* Input Area: input, image upload, microphone, send */}
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
            <TouchableOpacity style={styles.iconButton} onPress={handlePickImage} disabled={sending}>
              <Ionicons name="image-outline" size={24} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleOpenShareModal} disabled={sending}>
              <Ionicons name="paper-plane-outline" size={24} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} disabled={sending}>
              <Ionicons name="mic-outline" size={24} color="#555" />
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
      </KeyboardAvoidingView>

      {/* Share Plan Modal */}
      <Modal visible={showShareModal} transparent animationType="slide" onRequestClose={() => setShowShareModal(false)}>
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Share post</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
            {loadingPlans ? (
              <View style={styles.shareModalLoading}>
                <ActivityIndicator size="large" color="#1C1C1E" />
              </View>
            ) : (
              <ScrollView style={styles.shareModalList}>
                {availablePlans.length === 0 ? (
                  <View style={styles.shareModalEmpty}>
                    <Text style={styles.shareModalEmptyText}>No plans to share</Text>
                  </View>
                ) : (
                  availablePlans.map((plan) => {
                    const mediaItem = plan.media?.[0];
                    const mediaUri = mediaItem ? (typeof mediaItem === 'string' ? mediaItem : mediaItem?.url) : null;
                    return (
                      <TouchableOpacity
                        key={plan.plan_id || plan.post_id}
                        style={styles.sharePlanItem}
                        onPress={() => handleSharePlan(plan)}
                        activeOpacity={0.7}
                      >
                        {mediaUri && mediaUri.trim() !== '' && (
                          <Image source={{ uri: mediaUri }} style={styles.sharePlanItemImage} resizeMode="cover" />
                        )}
                        <View style={styles.sharePlanItemInfo}>
                          <Text style={styles.sharePlanItemTitle} numberOfLines={1}>{plan.title}</Text>
                          <Text style={styles.sharePlanItemDesc} numberOfLines={2}>{plan.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  titleBar: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    flex: 1,
    maxWidth: 180,
  },
  headerRightIcon: {
    padding: 4,
    marginLeft: 8,
  },
  headerRightAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },

  listContent: {
    paddingTop: 10,
    backgroundColor: '#F2F2F7',
  },
  messageBubbleWrap: {
    maxWidth: '75%',
    flexDirection: 'column',
    alignItems: 'flex-start',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'flex-start',
    minWidth: 48,
  },
  messageBubbleConstrain: {
    overflow: 'hidden',
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
    width: '100%',
    maxWidth: MAX_BUBBLE_WIDTH - 32,
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  messageImagePlaceholder: {
    width: '100%',
    maxWidth: MAX_BUBBLE_WIDTH - 32,
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageImagePlaceholderText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
  },
  sharedPlanCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: '100%',
  },
  sharedPlanTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  sharedPlanDescription: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 12,
  },
  sharedPlanMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sharedPlanTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 8,
  },
  sharedPlanTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 120,
  },
  sharedPlanTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  sharedPlanImage: {
    width: 80,
    height: 60,
    borderRadius: 12,
    marginLeft: 10,
    backgroundColor: '#E5E5EA',
  },
  sharedPlanImagePlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 12,
    marginLeft: 10,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedPlanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sharedPlanIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedPlanActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedPlanActionText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  reactionsLeft: { alignSelf: 'flex-start' },
  reactionsRight: { alignSelf: 'flex-end' },
  reactionEmoji: { fontSize: 15 },
  reactionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  reactionPickerBtn: { padding: 4 },
  reactionPickerEmoji: { fontSize: 20 },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 12,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  shareModalLoading: { padding: 40, alignItems: 'center' },
  shareModalList: { maxHeight: 400 },
  shareModalEmpty: { padding: 40, alignItems: 'center' },
  shareModalEmptyText: { fontSize: 14, color: '#8E8E93' },
  sharePlanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sharePlanItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
  },
  sharePlanItemInfo: { flex: 1, marginRight: 8 },
  sharePlanItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sharePlanItemDesc: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
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