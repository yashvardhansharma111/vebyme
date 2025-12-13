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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme'; // Assuming these exist based on context
import { apiService } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { BlurView } from 'expo-blur';

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

  const handleClose = () => {
    setMode('react');
    setComment('');
    setSelectedEmoji('👍');
    onClose();
  };

  const handleReact = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      await apiService.createJoinRequestWithReaction(postId, user.user_id, selectedEmoji);
      Alert.alert('Success', 'Interest sent!');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send interest');
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async () => {
    if (!user?.user_id || !comment.trim()) return;
    setLoading(true);
    try {
      await apiService.createJoinRequestWithComment(postId, user.user_id, comment.trim());
      Alert.alert('Success', 'Interest sent!');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send interest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      {/* Blur Background for consistency with other modals */}
      <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Express Interest</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              Let the host know you're interested in joining this plan.
            </Text>

            {/* Toggle Tabs (Visual separation) */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, mode === 'react' && styles.activeTab]} 
                onPress={() => setMode('react')}
              >
                <Text style={[styles.tabText, mode === 'react' && styles.activeTabText]}>Emoji</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, mode === 'comment' && styles.activeTab]} 
                onPress={() => setMode('comment')}
              >
                <Text style={[styles.tabText, mode === 'comment' && styles.activeTabText]}>Message</Text>
              </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={styles.contentArea}>
              {mode === 'react' ? (
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
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a message to the host..."
                  placeholderTextColor="#9CA3AF"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              )}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                (loading || (mode === 'comment' && !comment.trim())) && styles.buttonDisabled
              ]}
              onPress={mode === 'react' ? handleReact : handleComment}
              disabled={loading || (mode === 'comment' && !comment.trim())}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionButtonText}>Send Request</Text>
              )}
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#1C1C1E',
  },

  // Content Area
  contentArea: {
    minHeight: 120, // Keep height consistent to minimize jumping
    justifyContent: 'center',
    marginBottom: 24,
  },

  // Emoji Styles
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  emojiButton: {
    width: '30%', // 3 per row
    aspectRatio: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: '#1C1C1E',
    backgroundColor: '#FFF',
  },
  emojiText: {
    fontSize: 32,
  },

  // Comment Styles
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    height: 120,
  },

  // Action Button
  actionButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 30, // Pill shape
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});