import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, fetchCurrentUser } from '@/store/slices/profileSlice';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { apiService } from '@/services/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser, isLoading } = useAppSelector((state) => state.profile);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setBio(currentUser.bio || '');
      setProfileImage(currentUser.profile_image);
    } else if (user?.session_id) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [currentUser, user, dispatch]);

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission needed', 'Camera permission is required');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission needed', 'Photo library permission is required');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);

        try {
          const uploadResponse = await apiService.uploadImage(formData, user?.access_token);
          if (uploadResponse.data?.url) {
            setProfileImage(uploadResponse.data.url);
            Alert.alert('Success', 'Profile photo updated');
          }
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to upload image');
        } finally {
          setUploading(false);
          setShowPhotoModal(false);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setProfileImage(null);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user?.session_id) {
      Alert.alert('Error', 'Session not found');
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateProfile({
          session_id: user.session_id,
          data: {
            name: name.trim(),
            bio: bio.trim(),
            profile_image: profileImage,
          },
        })
      ).unwrap();
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <Image
            source={{ uri: profileImage || 'https://via.placeholder.com/100' }}
            style={styles.profileImage}
          />
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => setShowPhotoModal(true)}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={Colors.light.primary} />
              ) : (
                <Text style={styles.photoButtonText}>Edit Photo</Text>
              )}
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemovePhoto}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Username */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter username"
            placeholderTextColor="#9CA3AF"
            maxLength={30}
          />
          <Text style={styles.charCount}>{name.length}/30</Text>
        </View>

        {/* Bio */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={90}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/90</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Photo Selection Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <IconSymbol name="xmark" size={24} color={Colors.light.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Profile Photo</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => pickImage('camera')}
              >
                <IconSymbol name="camera.fill" size={32} color={Colors.light.primary} />
                <Text style={styles.modalButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => pickImage('gallery')}
              >
                <IconSymbol name="photo.fill" size={32} color={Colors.light.primary} />
                <Text style={styles.modalButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  removeButtonText: {
    color: Colors.light.error,
    fontSize: 14,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.lg,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bioInput: {
    height: 100,
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  modalButton: {
    alignItems: 'center',
    gap: 8,
  },
  modalButtonText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
});

