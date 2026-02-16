import React, { useState, useRef } from 'react';
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
  onSuccess: (messageOrEmoji: string) => void | Promise<void>;
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
  const inputRef = useRef<TextInput>(null);
  const tags = getPlanDisplayTags(plan);

  const handleClose = () => {
    if (loading) return;
    setMessage('');
    setActionSent(false);
    onClose();
  };

  const submitAction = async (payload: string) => {
    if (actionSent || loading || !payload.trim()) return;
    setLoading(true);
    setActionSent(true);
    try {
      await onSuccess(payload.trim());
      handleClose();
    } catch (_) {
      setActionSent(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiPress = (emoji: string) => {
    submitAction(emoji);
  };

  const handleSendMessage = () => {
    const text = message.trim();
    if (!text || actionSent || loading) return;
    submitAction(text);
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
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Pressable style={styles.centered} onPress={(e) => e.stopPropagation()}>
            {/* Focused post card + emoji row as one card (emoji at bottom border of post) */}
            <View style={styles.postCard}>
              {/* Author pill */}
              <View style={styles.authorPill}>
                <Avatar uri={author.avatar ?? undefined} size={36} />
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName} numberOfLines={1}>{author.name}</Text>
                  {timeLabel ? <Text style={styles.authorTime} numberOfLines={1}>{timeLabel}</Text> : null}
                </View>
              </View>
              <Text style={styles.postTitle}>{plan.title || 'Untitled Plan'}</Text>
              <Text style={styles.postDescription}>{plan.description || 'No description'}</Text>
              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Ionicons name={(TAG_ICONS[tag] || 'ellipse') as any} size={12} color="#3C3C43" />
                      <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Emoji row – at bottom border of post, inside same card */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow}
                style={styles.emojiRowWrap}
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

            {/* Message input + send */}
            <View style={styles.inputRow}>
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
              />
              <TouchableOpacity
                style={[styles.sendButton, (!message.trim() || loading || actionSent) && styles.sendButtonDisabled]}
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
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 24,
    alignItems: 'stretch',
  },
  postCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  authorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F3F3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    marginBottom: 12,
    gap: 8,
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
  emojiRowWrap: {
    marginTop: 4,
  },
  emojiRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 16,
    gap: 10,
  },
  input: {
    flex: 1,
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
