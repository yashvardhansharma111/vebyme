import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import Avatar from '@/components/Avatar';
import SharedPlanCard from '@/components/SharedPlanCard';

// --- Interfaces ---
interface Message {
  message_id: string;
  user_id: string;
  type: 'text' | 'image' | 'poll' | 'plan';
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
      voters?: Array<{
        user_id: string;
        profile_image?: string;
      }>;
    }>;
    user_vote?: string; // option_id that current user voted for
  };
  shared_plan?: {
    plan_id: string;
    title: string;
    description: string;
    media: any[];
    tags?: string[];
    category_main?: string;
    category_sub?: string[];
    is_business?: boolean;
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
  is_announcement_group?: boolean;
  created_by?: string;
  drive_link?: string | null;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

type DisplayItem = Message | (Message & { merged?: boolean; mergedUrls?: string[] });

function mergeConsecutiveImageMessages(msgs: Message[]): DisplayItem[] {
  const out: DisplayItem[] = [];
  const getUrls = (m: Message): string[] => {
    const c = m.content;
    if (typeof c === 'string' && c.trim()) return [c];
    if (c?.url && String(c.url).trim()) return [c.url];
    if (Array.isArray(c?.urls)) return (c.urls as string[]).filter((u: string) => u?.trim());
    return [];
  };
  let i = 0;
  while (i < msgs.length) {
    const msg = msgs[i];
    if (msg.type !== 'image') {
      out.push(msg);
      i++;
      continue;
    }
    const urls = [...getUrls(msg)];
    let j = i + 1;
    while (j < msgs.length && msgs[j].type === 'image' && msgs[j].user_id === msg.user_id) {
      urls.push(...getUrls(msgs[j]));
      j++;
    }
    if (j === i + 1) {
      out.push(msg);
    } else {
      out.push({
        ...msg,
        content: { urls },
        merged: true,
        mergedUrls: urls,
      });
    }
    i = j;
  }
  return out;
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [driveLink, setDriveLink] = useState<string>('');
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveDraft, setDriveDraft] = useState('');

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [groupId]);

  const openDriveLink = async () => {
    const url = (driveLink || '').trim();
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open link');
    }
  };

  const saveDriveLink = async () => {
    if (!groupId || !user?.user_id) return;
    const url = driveDraft.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      Alert.alert('Invalid link', 'Please enter a valid URL starting with http:// or https://');
      return;
    }
    try {
      await apiService.setGroupDriveLink(groupId, user.user_id, url || null);
      setDriveLink(url);
      setShowDriveModal(false);
    } catch {
      Alert.alert('Error', 'Failed to save link');
    }
  };

  const loadGroupDetails = async () => {
    if (!groupId) return;
    try {
      const response = await apiService.getGroupDetails(groupId);
      if (response.data) {
        setGroupDetails(response.data);
        setDriveLink((response.data.drive_link || '').trim());
      }
    } catch (error: any) {
      console.error('Error loading group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!groupId) return;
    try {
      const response = await apiService.getMessages(groupId);
      if (response.data) {
        const list = Array.isArray(response.data) ? response.data : [];
        setMessages(list.map((m: any) => {
          const content = m.content;
          const isPlanContent = typeof content === 'object' && content && (content.title != null || content.plan_id != null);
          if (m.type === 'plan' && !m.shared_plan && content) {
            return { ...m, shared_plan: typeof content === 'object' ? content : null };
          }
          if ((m.type === 'image' || m.type === 'text') && isPlanContent) {
            return { ...m, type: 'plan', shared_plan: content };
          }
          return m;
        }));
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
      setTypingLabel(null);
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      const msg = error?.message || error?.data?.message || 'Failed to send message.';
      Alert.alert('Error', msg.includes('not a member') ? 'You need to join this plan to send messages here.' : msg);
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

  const getUserVote = (poll: Message['poll']) => {
    if (!poll || !user?.user_id) return null;
    return poll.user_vote || null;
  };

  const handlePickImage = async () => {
    Alert.alert('Coming soon', 'Image upload will be implemented in future.');
    return;
  };

  const handleCreatePoll = () => {
    if (groupDetails?.is_closed) {
      Alert.alert('Chat Disabled', 'Messaging has been disabled by admin');
      return;
    }
    if (groupDetails?.is_announcement_group && groupDetails?.created_by !== user?.user_id) {
      Alert.alert('Announcement Group', 'Only the group owner can create polls here.');
      return;
    }
    router.push({
      pathname: '/chat/poll/create',
      params: { groupId: groupId || '' },
    } as any);
  };

  const handleOpenShareModal = async () => {
    if (groupDetails?.is_closed) {
      Alert.alert('Chat Disabled', 'Messaging has been disabled by admin');
      return;
    }
    if (!user?.user_id) return;
    
    setShowShareModal(true);
    setLoadingPlans(true);
    try {
      const response = await apiService.getUserPlans(user.user_id, 50, 0);
      if (response.data) {
        setAvailablePlans(response.data);
      }
    } catch (error: any) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    setTypingLabel('Typing...');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTypingLabel(null), 2000);
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
        tags: plan.tags || plan.category_sub || [],
        category_sub: plan.category_sub || plan.tags || [],
        category_main: plan.category_main,
        is_business: plan.is_business === true,
      });
      setShowShareModal(false);
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
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
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    }).toLowerCase();

    if (isToday) return `Today, ${timeStr}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  // --- Render Functions ---

  const renderHeader = () => {
    const isCreator = !!(groupDetails?.created_by && groupDetails.created_by === user?.user_id);
    const hasLink = !!driveLink.trim();
    return (
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => router.push(`/chat/group/details/${groupId}` as any)}
          activeOpacity={0.8}
        >
          {(() => {
            const eventMedia = groupDetails?.plan?.media?.[0];
            const eventImageUrl = eventMedia ? (typeof eventMedia === 'string' ? eventMedia : eventMedia?.url) : null;
            const members = groupDetails?.members ?? [];
            const displayCount = 3;
            const showStack = !eventImageUrl || (eventImageUrl && eventImageUrl.trim() === '');
            if (showStack && members.length > 0) {
              const toShow = members.slice(0, displayCount);
              const extra = members.length > displayCount ? members.length - displayCount : 0;
              return (
                <View style={styles.headerMemberStack}>
                  {toShow.map((m, idx) => (
                    <View
                      key={m.user_id}
                      style={[
                        styles.headerMemberAvatarWrap,
                        { marginLeft: idx === 0 ? 0 : -10, zIndex: displayCount - idx },
                      ]}
                    >
                      <Avatar uri={m.profile_image || null} size={36} />
                    </View>
                  ))}
                  {extra > 0 && (
                    <View style={[styles.headerMemberMoreWrap, { marginLeft: -10, zIndex: 0 }]}>
                      <Text style={styles.headerMemberMoreText}>+{extra}</Text>
                    </View>
                  )}
                </View>
              );
            }
            return (
              <View style={styles.headerAvatarWrap}>
                {eventImageUrl && eventImageUrl.trim() !== '' ? (
                  <Image source={{ uri: eventImageUrl }} style={styles.headerGroupImage} resizeMode="cover" />
                ) : (
                  <Avatar uri={null} size={40} />
                )}
              </View>
            );
          })()}
          <Text style={styles.headerName} numberOfLines={1}>
            {groupDetails?.group_name || 'Group'}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => {
              if (isCreator) {
                setDriveDraft(driveLink);
                setShowDriveModal(true);
              } else if (hasLink) {
                openDriveLink();
              }
            }}
            style={[styles.headerIconBtn, !isCreator && !hasLink && styles.headerIconBtnDisabled]}
            disabled={!isCreator && !hasLink}
          >
            <Ionicons name={isCreator ? 'link-outline' : 'link'} size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/chat/group/details/${groupId}` as any)} style={styles.headerRightBtn}>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
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
    const userVote = getUserVote(message.poll);

    return (
      <View style={styles.pollWrapper}>
        <Text style={styles.pollQuestion}>{message.poll.question}</Text>
        <Text style={styles.pollVoteCount}>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</Text>
        
        {message.poll.options.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
          const isSelected = userVote === option.option_id;
          const hasVotes = option.vote_count > 0;

          return (
            <TouchableOpacity
              key={option.option_id}
              style={[styles.pollOptionButton, isSelected ? styles.pollOptionSelected : styles.pollOptionUnselected]}
              onPress={() => handleVotePoll(message.poll!.poll_id, option.option_id)}
              activeOpacity={0.7}
            >
              <View style={styles.pollOptionContent}>
                <Text style={[styles.pollOptionText, isSelected ? styles.pollOptionTextSelected : styles.pollOptionTextUnselected]}>
                  {option.option_text}
                </Text>
                <View style={styles.pollOptionRight}>
                  {hasVotes && (
                    <View style={styles.voterAvatarStack}>
                      {option.voters?.slice(0, 3).map((voter, idx) => (
                        <View
                          key={voter.user_id}
                          style={[styles.voterAvatarContainer, { marginLeft: idx > 0 ? -6 : 0, zIndex: 3 - idx }]}
                        >
                          <Avatar uri={voter.profile_image || null} size={18} />
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={[styles.pollPercent, isSelected ? styles.pollPercentSelected : styles.pollPercentUnselected]}>
                    {percentage}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const displayMessages = useMemo(() => mergeConsecutiveImageMessages(messages), [messages]);

  const renderMessage = ({ item, index }: { item: DisplayItem; index: number }) => {
    const isMe = item.user_id === user?.user_id;
    const previousMessage = index > 0 ? displayMessages[index - 1] : null;
    const showTimeHeader = !previousMessage || 
      (new Date(item.timestamp).getTime() - new Date(previousMessage.timestamp).getTime() > 3600000);
    const showAvatar = !isMe && (!previousMessage || previousMessage.user_id !== item.user_id);
    const showName = !isMe && showAvatar;

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
              <View style={styles.leftAvatarCol}>
                {showAvatar ? (
                  <Avatar uri={item.user?.profile_image || null} size={34} />
                ) : (
                  <View style={{ width: 34, height: 34 }} />
                )}
              </View>
            )}
            
            {item.type === 'plan' && item.shared_plan ? (
            <View style={styles.planCardWrap}>
              <SharedPlanCard
                plan={{
                  plan_id: item.shared_plan.plan_id,
                  title: item.shared_plan.title,
                  description: item.shared_plan.description,
                  media: item.shared_plan.media,
                  tags: item.shared_plan.tags,
                  category_main: item.shared_plan.category_main,
                  category_sub: item.shared_plan.category_sub,
                  is_business: item.shared_plan.is_business,
                }}
                onJoinPress={() =>
                  item.shared_plan?.plan_id &&
                  router.push(
                    (item.shared_plan.is_business
                      ? `/business-plan/${item.shared_plan.plan_id}`
                      : `/plan/${item.shared_plan.plan_id}`) as any
                  )
                }
                  senderName={isMe ? 'You' : item.user?.name}
                  senderTime={formatTimeHeader(item.timestamp)}
                  senderAvatar={isMe ? undefined : item.user?.profile_image}
                  pillPosition="left"
                  compact
                />
            </View>
          ) : item.type === 'image' ? (
            <View style={styles.imageMessageWrap}>
              {(() => {
                const urls: string[] = [];
                if (typeof item.content === 'string' && item.content.trim() !== '') urls.push(item.content);
                else if (item.content?.url && String(item.content.url).trim() !== '') urls.push(item.content.url);
                else if (Array.isArray(item.content?.urls)) urls.push(...item.content.urls.filter((u: string) => u?.trim()));
                if (urls.length === 0) return null;
                if (urls.length === 1) {
                  return (
                    <Image source={{ uri: urls[0] }} style={styles.messageImage} resizeMode="contain" />
                  );
                }
                return (
                  <View style={styles.multiImageCard}>
                    {urls.slice(0, 4).map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={[
                          styles.messageImageStacked,
                          { top: i * 14, left: i * 16, zIndex: urls.length - i, transform: [{ rotate: `${(i - 1) * 4}deg` }] },
                        ]}
                        resizeMode="contain"
                      />
                    ))}
                  </View>
                );
              })()}
            </View>
          ) : (
            <View style={{ maxWidth: '78%' }}>
              {showName && <Text style={styles.senderName}>{item.user?.name || 'User'}</Text>}
              <View style={[styles.messageBubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                {item.type === 'text' && (
                  <Text style={[styles.messageText, isMe ? styles.textRight : styles.textLeft]}>
                    {item.content}
                  </Text>
                )}
              </View>
            </View>
          )}
            {(item.reactions && item.reactions.length > 0) && (
              <View style={[styles.reactionsRow, isMe ? styles.reactionsRowRight : styles.reactionsRowLeft]}>
                {item.reactions.map((r) => (
                  <Text key={r.reaction_id} style={styles.reactionEmoji}>
                    {r.emoji_type === 'laugh' ? '😂' : r.emoji_type === 'wink' ? '😉' : r.emoji_type === 'heart' ? '❤️' : '👍'}
                  </Text>
                ))}
              </View>
            )}
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
          data={displayMessages}
          renderItem={renderMessage}
          ListHeaderComponent={renderPlanCard}
          keyExtractor={(item) => ('merged' in item && item.merged ? item.message_id + '_merged' : item.message_id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Typing indicator */}
        {typingLabel && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>{typingLabel}</Text>
          </View>
        )}

        {/* Input Area: for announcement groups only owner can send; others see read-only banner */}
        {(() => {
          const isAnnouncementReadOnly = !!(groupDetails?.is_announcement_group && groupDetails?.created_by !== user?.user_id);
          const canSend = !groupDetails?.is_closed && !isAnnouncementReadOnly;
          if (!canSend) {
            return (
              <View style={styles.disabledBanner}>
                <Text style={styles.disabledText}>
                  {groupDetails?.is_closed ? 'Only admins can send messages' : 'Only the group owner can send messages and create polls'}
                </Text>
              </View>
            );
          }
          return (
            <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <View style={styles.inputPill}>
                <TextInput
                  style={styles.input}
                  placeholder="Send a message"
                  placeholderTextColor="#999"
                  value={inputText}
                  onChangeText={handleTyping}
                  multiline={false}
                />
                <TouchableOpacity style={styles.iconButton} onPress={handlePickImage} disabled={sending}>
                  <Ionicons name="image-outline" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
              >
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          );
        })()}
      </KeyboardAvoidingView>

      {/* Share Plan Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Share Plan</Text>
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
                    <Text style={styles.shareModalEmptyText}>No plans available to share</Text>
                  </View>
                ) : (
                  availablePlans.map((plan) => {
                    const mediaItem = plan.media?.[0];
                    const mediaUri = mediaItem 
                      ? (typeof mediaItem === 'string' ? mediaItem : mediaItem?.url || null)
                      : null;
                    return (
                      <TouchableOpacity
                        key={plan.plan_id || plan.post_id}
                        style={styles.sharePlanItem}
                        onPress={() => handleSharePlan(plan)}
                        activeOpacity={0.7}
                      >
                        {mediaUri && mediaUri.trim() !== '' && (
                          <Image
                            source={{ uri: mediaUri }}
                            style={styles.sharePlanImage}
                            resizeMode="cover"
                          />
                        )}
                      <View style={styles.sharePlanInfo}>
                        <Text style={styles.sharePlanTitle} numberOfLines={1}>
                          {plan.title}
                        </Text>
                        <Text style={styles.sharePlanDescription} numberOfLines={2}>
                          {plan.description}
                        </Text>
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

      <Modal
        visible={showDriveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDriveModal(false)}
      >
        <View style={styles.driveModalOverlay}>
          <View style={styles.driveModalCard}>
            <Text style={styles.driveModalTitle}>Google Drive link</Text>
            <TextInput
              style={styles.driveModalInput}
              placeholder="https://drive.google.com/..."
              placeholderTextColor="#9CA3AF"
              value={driveDraft}
              onChangeText={setDriveDraft}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.driveModalActions}>
              <TouchableOpacity style={styles.driveModalCancel} onPress={() => setShowDriveModal(false)}>
                <Text style={styles.driveModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.driveModalSave} onPress={saveDriveLink}>
                <Text style={styles.driveModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // --- Header Styles (back | stacked avatars | group name) ---
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
    marginRight: 10,
  },
  headerGroupImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerMemberStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  headerMemberAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  headerMemberMoreWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E5EA',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMemberMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A3A3C',
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  headerRightBtn: {
    padding: 4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  headerIconBtnDisabled: {
    opacity: 0.35,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  pollVoteCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
    fontWeight: '500',
  },
  pollOptionButton: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pollOptionSelected: {
    backgroundColor: '#2D2D2D',
  },
  pollOptionUnselected: {
    backgroundColor: '#E5E7EB',
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pollOptionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  pollOptionTextSelected: {
    color: '#FFFFFF',
  },
  pollOptionTextUnselected: {
    color: '#1C1C1E',
  },
  pollOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voterAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voterAvatarContainer: {
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pollPercent: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 35,
    textAlign: 'right',
  },
  pollPercentSelected: {
    color: '#FFFFFF',
  },
  pollPercentUnselected: {
    color: '#1C1C1E',
  },

  // --- List & Messages ---
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  leftAvatarCol: {
    width: 42,
    alignItems: 'flex-start',
    paddingTop: 4,
    marginRight: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    marginLeft: 2,
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
  planCardWrap: {
    maxWidth: 280,
    backgroundColor: 'transparent',
    overflow: 'visible',
    marginTop: 14,
    marginBottom: 20,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleLeft: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 18,
  },
  bubbleRight: {
    backgroundColor: '#2D2D2D',
    borderTopRightRadius: 18,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textLeft: { color: '#1F2937' },
  textRight: { color: '#FFF' },
  imageMessageWrap: {
    overflow: 'hidden',
    marginBottom: 2,
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
  },
  multiImageCard: {
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.65,
    position: 'relative',
  },
  messageImageStacked: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.55,
    borderRadius: 20,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  reactionsRowLeft: { alignSelf: 'flex-start' },
  reactionsRowRight: { alignSelf: 'flex-end' },
  reactionEmoji: {
    fontSize: 16,
  },
  typingBar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  typingText: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  driveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  driveModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
  },
  driveModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  driveModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  driveModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  driveModalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  driveModalCancelText: {
    color: '#111827',
    fontWeight: '700',
  },
  driveModalSave: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  driveModalSaveText: {
    color: '#FFF',
    fontWeight: '800',
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
  },
  
  // --- Shared Plan Styles ---
  sharedPlanCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  sharedPlanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sharedPlanDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 8,
  },
  sharedPlanImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 4,
  },
  
  // --- Share Modal Styles ---
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  shareModalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  shareModalList: {
    maxHeight: 500,
  },
  shareModalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  shareModalEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sharePlanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sharePlanImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
  },
  sharePlanInfo: {
    flex: 1,
    marginRight: 12,
  },
  sharePlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sharePlanDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
});