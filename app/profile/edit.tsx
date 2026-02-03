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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, fetchCurrentUser } from '@/store/slices/profileSlice';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
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
    // Close modal first
    setShowPhotoModal(false);
    
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
          allowsEditing: false,
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
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];
        
        try {
          // Get file URI
          const fileUri = asset.uri;
          
          // Get file name and type - ensure proper MIME type for JPG and PNG
          let fileName = asset.fileName || asset.uri.split('/').pop() || `profile_${Date.now()}.jpg`;
          let fileType = asset.type || 'image/jpeg';
          
          // Determine MIME type from file extension if not provided or if type is invalid (e.g., just "image")
          // Check if fileType is a valid MIME type (contains a slash) or if it's missing
          if ((!fileType || !fileType.includes('/')) && fileName) {
            const ext = fileName.toLowerCase().split('.').pop();
            if (ext === 'png') {
              fileType = 'image/png';
            } else if (ext === 'jpg' || ext === 'jpeg') {
              fileType = 'image/jpeg';
            } else if (ext === 'gif') {
              fileType = 'image/gif';
            } else if (ext === 'webp') {
              fileType = 'image/webp';
            } else {
              // Default to jpeg if extension is unknown
              fileType = 'image/jpeg';
            }
          }
          
          // Create FormData for upload
          const formData = new FormData();
          
          // Handle web platform differently - need to convert URI to File/Blob
          if (Platform.OS === 'web') {
            // For web, fetch the image as a blob and create a File
            const response = await fetch(fileUri);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: fileType });
            formData.append('file', file);
          } else {
            // For native platforms (iOS/Android), use React Native FormData format
            // @ts-ignore - React Native FormData format
            formData.append('file', {
              uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
              name: fileName,
              type: fileType,
            } as any);
          }
          
          console.log('📤 FormData prepared:', {
            uri: fileUri,
            fileName: fileName,
            fileType: fileType,
            assetSize: asset.fileSize,
            platform: Platform.OS
          });

          // Use uploadProfileImage endpoint (expects 'file' field, returns single object)
          const uploadResponse = await apiService.uploadProfileImage(formData, user?.access_token);
          if (uploadResponse.data?.url) {
            setProfileImage(uploadResponse.data.url);
            Alert.alert('Success', 'Profile photo updated');
          } else {
            Alert.alert('Error', 'Failed to get image URL from response');
          }
        } catch (error: any) {
          console.error('❌ Upload error:', error);
          console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
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
      {/* Header: back + Edit Profile (top left) */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentInner}>
        {/* Centered: avatar + inputs */}
        <View style={styles.centerBlock}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={64} color="#9CA3AF" />
              )}
            </View>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setShowPhotoModal(true)}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#1C1C1E" />
              ) : (
                <Ionicons name="camera" size={22} color="#1C1C1E" />
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor="#9CA3AF"
            maxLength={30}
          />

          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Status"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            maxLength={90}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
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
      </View>

      {/* Profile Photo Modal - bottom sheet with Camera & Gallery pills */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoModal(false)}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.modalContentInner}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPhotoModal(false)} style={styles.modalClose}>
                  <Ionicons name="close" size={24} color="#1C1C1E" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Profile Photo</Text>
              </View>
              <View style={styles.modalPills}>
                <TouchableOpacity
                  style={[styles.modalPill, styles.modalPillFirst]}
                  onPress={() => pickImage('camera')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={22} color="#1C1C1E" style={styles.modalPillIcon} />
                  <Text style={styles.modalPillText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPill}
                  onPress={() => pickImage('gallery')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images-outline" size={22} color="#1C1C1E" style={styles.modalPillIcon} />
                  <Text style={styles.modalPillText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F2F2F2',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentInner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  centerBlock: {
    width: '100%',
    alignItems: 'center',
  },
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    fontSize: 17,
    color: '#1C1C1E',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    alignSelf: 'stretch',
    width: '100%',
    minWidth: 0,
    minHeight: 52,
  },
  bioInput: {
    minHeight: 120,
    paddingTop: 18,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#F2F2F2',
  },
  saveButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    justifyContent: 'flex-end',
  },
  modalContentInner: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  modalClose: {
    padding: 4,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  modalPills: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  modalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
  },
  modalPillFirst: {
    marginBottom: 12,
  },
  modalPillIcon: {
    marginRight: 12,
  },
  modalPillText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
});