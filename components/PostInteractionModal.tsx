import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme';
import { apiService } from '@/services/api';
import { useAppSelector } from '@/store/hooks';

interface PostInteractionModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  onSuccess?: () => void;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😊', '🔥', '🎉', '💯'];

export default function PostInteractionModal({
  visible,
  onClose,
  postId,
  onSuccess,
}: PostInteractionModalProps) {
  const [mode, setMode] = useState<'react' | 'comment'>('react');
  const [comment, setComment] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👍');
  const [loading, setLoading] = useState(false);
  const { user } = useAppSelector((state) => state.auth);

  const handleReact = async () => {
    if (!user?.user_id) {
      Alert.alert('Error', 'Please login to express interest');
      return;
    }

    if (!postId) {
      Alert.alert('Error', 'Post ID is missing');
      console.error('❌ PostInteractionModal: postId is missing', { postId });
      return;
    }

    setLoading(true);
    try {
      // Create join request with reaction (pending status)
      console.log('📤 Sending reaction:', { postId, user_id: user.user_id, emoji: selectedEmoji });
      await apiService.createJoinRequestWithReaction(postId, user.user_id, selectedEmoji);
      Alert.alert('Success', 'Your interest has been sent! The author will review it.');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send interest');
      console.error('❌ Error sending reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async () => {
    if (!user?.user_id) {
      Alert.alert('Error', 'Please login to express interest');
      return;
    }

    if (!postId) {
      Alert.alert('Error', 'Post ID is missing');
      console.error('❌ PostInteractionModal: postId is missing', { postId });
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setLoading(true);
    try {
      // Create join request with comment (pending status)
      console.log('📤 Sending comment:', { postId, user_id: user.user_id, text: comment.trim() });
      await apiService.createJoinRequestWithComment(postId, user.user_id, comment.trim());
      Alert.alert('Success', 'Your interest has been sent! The author will review it.');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send interest');
      console.error('❌ Error sending comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('react');
    setComment('');
    setSelectedEmoji('👍');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Express Interest to Join
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              Choose how you'd like to express interest. The author will review and approve your request.
            </Text>

            {mode === 'react' && (
              <View style={styles.reactContent}>
                <Text style={styles.sectionTitle}>React with Emoji</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiButton,
                        selectedEmoji === emoji && styles.emojiButtonSelected,
                      ]}
                      onPress={() => setSelectedEmoji(emoji)}
                    >
                      <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, loading && styles.buttonDisabled]}
                  onPress={handleReact}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>
                    {loading ? 'Sending...' : 'Send Interest'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => setMode('comment')}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.light.primary} />
                  <Text style={styles.switchModeText}>Or write a comment instead</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'comment' && (
              <View style={styles.commentContent}>
                <Text style={styles.sectionTitle}>Write a Comment</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write your comment to express interest..."
                  placeholderTextColor="#9CA3AF"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    (!comment.trim() || loading) && styles.buttonDisabled,
                  ]}
                  onPress={handleComment}
                  disabled={!comment.trim() || loading}
                >
                  <Text style={styles.actionButtonText}>
                    {loading ? 'Sending...' : 'Send Interest'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => setMode('react')}
                >
                  <Ionicons name="heart-outline" size={20} color={Colors.light.primary} />
                  <Text style={styles.switchModeText}>Or react with emoji instead</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: 40,
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
  },
  content: {
    padding: 24,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  reactContent: {
    width: '100%',
  },
  commentContent: {
    width: '100%',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  emojiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.cardBackground,
  },
  emoji: {
    fontSize: 32,
  },
  commentInput: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.md,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 100,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  switchModeText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});

