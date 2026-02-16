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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

interface RepostModalProps {
  visible: boolean;
  onClose: () => void;
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
  const insets = useSafeAreaInsets();
  const [repostTitle, setRepostTitle] = useState('');
  const [repostDescription, setRepostDescription] = useState('');
  const [loading, setLoading] = useState(false);
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
    const planIdToUse = (originalPlanId || postId || '').trim();
    if (!planIdToUse) {
      Alert.alert('Error', 'Could not determine the plan to repost. Please try again.');
      return;
    }
    setLoading(true);
    try {
      await apiService.createRepost(planIdToUse, user.user_id, {
        repost_title: repostTitle.trim() || undefined,
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
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
          {/* Header - matches app pages */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Repost</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Original post preview */}
            <View style={styles.originalBlock}>
              <View style={styles.originalHeader}>
                <Ionicons name="repeat" size={18} color="#1C1C1E" />
                <Text style={styles.originalLabel}>
                  {originalAuthorName ? `From ${originalAuthorName}` : 'Original post'}
                </Text>
              </View>
              {(originalPostTitle || originalPostDescription) ? (
                <View style={styles.originalBody}>
                  {originalPostTitle ? (
                    <Text style={styles.originalTitle} numberOfLines={2}>{originalPostTitle}</Text>
                  ) : null}
                  {originalPostDescription ? (
                    <Text style={styles.originalDescription} numberOfLines={3}>
                      {originalPostDescription}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.originalPlaceholder}>No title or description</Text>
              )}
            </View>

            {/* Your title (optional) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Your title (optional)</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="e.g. Spontaneous ooty trip?"
                placeholderTextColor="#9CA3AF"
                value={repostTitle}
                onChangeText={setRepostTitle}
                maxLength={120}
              />
              <Text style={styles.charCount}>{repostTitle.length}/120</Text>
            </View>

            {/* Your description (optional) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Your thoughts (optional)</Text>
              <TextInput
                style={styles.descInput}
                placeholder="Add a description or your thoughts..."
                placeholderTextColor="#9CA3AF"
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
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.repostButton, loading && styles.buttonDisabled]}
                onPress={handleRepost}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.repostText}>Repost</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#F2F2F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#F2F2F2',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  originalBlock: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  originalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  originalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  originalBody: {
    paddingLeft: 26,
  },
  originalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  originalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  originalPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingLeft: 26,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  descInput: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  repostButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repostText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
