import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface RepostModalProps {
  visible: boolean;
  onClose: () => void;
  /** Plan id to send to the API (must be the original plan id, not a repost post id) */
  originalPlanId: string;
  postId?: string;
  originalPostTitle?: string;
  originalPostDescription?: string;
  originalAuthorName?: string;
  onSuccess?: () => void;
}

export default function RepostModal({
  visible,
  onClose,
  originalPlanId,
  postId,
  originalPostTitle,
  originalPostDescription,
  originalAuthorName,
  onSuccess,
}: RepostModalProps) {
  const [repostTitle, setRepostTitle] = useState('');
  const [repostDescription, setRepostDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { useAppSelector } = require('@/store/hooks');
  const { apiService } = require('@/services/api');
  const { user } = useAppSelector((state: any) => state.auth);

  const handleClose = () => {
    setRepostTitle('');
    setRepostDescription('');
    onClose();
  };

  const handleRepost = async () => {
    if (!user?.user_id) {
      Alert.alert('Error', 'Please login to repost');
      return;
    }
    const title = repostTitle.trim();
    if (!title) {
      Alert.alert('Required', 'Please add a title for your repost');
      return;
    }

    setLoading(true);
    try {
      await apiService.createRepost(originalPlanId, user.user_id, {
        repost_title: title,
        repost_description: repostDescription.trim() || undefined,
      });
      Alert.alert('Success', 'Post reposted!');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to repost');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Repost</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          {/* Original Post Preview */}
          <View style={styles.originalPostContainer}>
            <View style={styles.originalPostHeader}>
              <Ionicons name="repeat" size={16} color="#8B5CF6" />
              <Text style={styles.originalPostLabel}>
                {originalAuthorName ? `Reposting from ${originalAuthorName}` : 'Original Post'}
              </Text>
            </View>
            <View style={styles.originalPostContent}>
              {originalPostTitle && (
                <Text style={styles.originalPostTitle}>{originalPostTitle}</Text>
              )}
              {originalPostDescription && (
                <Text style={styles.originalPostDescription} numberOfLines={3}>
                  {originalPostDescription}
                </Text>
              )}
            </View>
          </View>

          {/* Repost Title (required) */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g. Spontaneous ooty trip?"
              placeholderTextColor="#999"
              value={repostTitle}
              onChangeText={setRepostTitle}
              maxLength={120}
            />
            <Text style={styles.charCount}>{repostTitle.length}/120</Text>
          </View>

          {/* Repost Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Add a description or your thoughts..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={repostDescription}
              onChangeText={setRepostDescription}
              maxLength={500}
            />
            <Text style={styles.charCount}>{repostDescription.length}/500</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.repostButton, loading && styles.buttonDisabled]}
              onPress={handleRepost}
              disabled={loading}
            >
              <Text style={styles.repostButtonText}>
                {loading ? 'Reposting...' : 'Repost'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  originalPostContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  originalPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  originalPostLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  originalPostContent: {
    paddingLeft: 22,
  },
  originalPostTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  originalPostDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlignVertical: 'top',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  repostButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repostButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

