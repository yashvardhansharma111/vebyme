import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Avatar from './Avatar';

const EMOJI_OPTIONS = ['😅', '😂', '❤️', '👍', '🎁', '😊', '🔥', '🎉'];

const TAG_ICONS: { [key: string]: string } = {
  Weekend: 'calendar',
  Evening: 'sunny',
  Hitchhiking: 'person',
  Today: 'today',
  Tomorrow: 'calendar-outline',
};

export interface JoinModalPlan {
  plan_id: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type?: string }>;
  add_details?: Array<{ detail_type: string; title?: string }>;
  category_sub?: string[];
  temporal_tags?: string[];
}

export interface JoinModalAuthor {
  name: string;
  avatar?: string | null;
  time?: string;
}

interface JoinModalProps {
  visible: boolean;
  onClose: () => void;
  planId: string;
  plan: JoinModalPlan;
  author: JoinModalAuthor;
  onSuccess: (messageOrEmoji: string, type?: 'emoji' | 'message') => void | Promise<void>;
  /** If true, uses event registration (registerForEvent); one action per user is enforced by backend */
  isEvent?: boolean;
}

function getPlanDisplayTags(plan: JoinModalPlan): string[] {
  const tags: string[] = [];
  (plan.add_details || []).forEach((d) => {
    if (d.title && typeof d.title === 'string') tags.push(d.title.trim());
  });
  if (plan.temporal_tags?.length) tags.push(...plan.temporal_tags);
  if (plan.category_sub?.length) tags.push(...plan.category_sub);
  return [...new Set(tags)].slice(0, 5);
}

export default function JoinModal({
  visible,
  onClose,
  planId,
  plan,
  author,
  onSuccess,
}: JoinModalProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionSent, setActionSent] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const tags = getPlanDisplayTags(plan);

  useEffect(() => {
    const show = Platform.OS === 'ios' 
      ? Keyboard.addListener('keyboardWillShow', (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        }) 
      : Keyboard.addListener('keyboardDidShow', (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        });
    
    const hide = Platform.OS === 'ios' 
      ? Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0)) 
      : Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleClose = () => {
    if (loading) return;
    setMessage('');
    setActionSent(false);
    onClose();
  };

  const submitAction = async (payload: string, type: 'emoji' | 'message') => {
    if (actionSent || loading || !payload.trim()) return;
    setLoading(true);
    setActionSent(true);
    try {
      await onSuccess(payload.trim(), type);
      handleClose();
    } catch (_) {
      setActionSent(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiPress = (emoji: string) => {
    submitAction(emoji, 'emoji');
  };

  const handleSendMessage = () => {
    const text = message.trim();
    if (!text || actionSent || loading) return;
    submitAction(text, 'message');
  };

  const timeLabel = author.time || '';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        {/* Background Blur/Color */}
        <View style={StyleSheet.absoluteFill}>
          {Platform.OS === 'android' ? (
            <View style={styles.androidBg} />
          ) : (
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          )}
        </View>

        {/* Main KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Container with fixed spacing from top */}
          <View style={styles.mainContainer}>
            {/* Card Section - Fixed at top */}
            <View style={styles.cardSection}>
              {/* Post card: user pill on top border, content (description 4 lines), space for tags, reaction pill on bottom border */}
              <View style={styles.postCardWrapper} collapsable={false}>
                {/* User pill – on top border of post */}
                <View style={styles.authorPillOnBorder}>
                  <Avatar uri={author.avatar ?? undefined} size={36} />
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName} numberOfLines={1}>
                      {author.name}
                    </Text>
                    {timeLabel ? (
                      <Text style={styles.authorTime} numberOfLines={1}>
                        {timeLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.postCard}>
                  <Text style={styles.postTitle}>{plan.title || 'Untitled Plan'}</Text>
                  <Text
                    style={styles.postDescription}
                    numberOfLines={4}
                    ellipsizeMode="tail"
                  >
                    {plan.description || 'No description'}
                  </Text>
                  {tags.length > 0 && (
                    <View style={styles.tagsRowWithSpace}>
                      {tags.map((tag) => (
                        <View key={tag} style={styles.tagPill}>
                          <Ionicons
                            name={(TAG_ICONS[tag] || 'ellipse') as any}
                            size={12}
                            color="#3C3C43"
                          />
                          <Text style={styles.tagText} numberOfLines={1}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Reaction pill – on bottom border of post (same pill style as user pill) */}
                <View style={styles.reactionPillOnBorder}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.reactionPillContent}
                  >
                    {EMOJI_OPTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.emojiButton}
                        onPress={() => handleEmojiPress(emoji)}
                        disabled={loading || actionSent}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Input Section - Pushes up with keyboard */}
            <View style={[styles.inputSection, { paddingBottom: keyboardHeight + 16 }]}>
              <View style={styles.inputRow} collapsable={false}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Send a message"
                  placeholderTextColor="#8E8E93"
                  value={message}
                  onChangeText={setMessage}
                  editable={!actionSent && !loading}
                  multiline={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  autoFocus={true}
                  textAlignVertical="center"
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!message.trim() || loading || actionSent) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={!message.trim() || loading || actionSent}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="arrow-forward" size={22} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  mainContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: 150,
  },
  cardSection: {
    flexShrink: 0,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputSection: {
    flexShrink: 0,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  androidBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F3F3',
  },
  postCardWrapper: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 52,
    position: 'relative',
    flexShrink: 0,
  },
  authorPillOnBorder: {
    position: 'absolute',
    top: -20,
    left: 18,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  postCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    paddingTop: 28,
    paddingBottom: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'visible',
  },
  authorInfo: {
    maxWidth: 160,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  authorTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagsRowWithSpace: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#3C3C43',
    fontWeight: '500',
    maxWidth: 90,
  },
  reactionPillOnBorder: {
    position: 'absolute',
    bottom: -22,
    left: 18,
    right: 18,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F3F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  reactionPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
    width: '100%',
    maxWidth: 360,
    minHeight: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#1C1C1E',
    maxHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});