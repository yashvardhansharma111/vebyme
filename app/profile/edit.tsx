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
import * as ImagePicker from 'expo-image-picker';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, fetchCurrentUser } from '@/store/slices/profileSlice';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Photo Section - Card Style */}
        <View style={styles.photoCard}>
          <Image
            source={{ uri: profileImage || 'https://via.placeholder.com/100' }}
            style={styles.profileImage}
          />
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={styles.editPhotoButton}
              onPress={() => setShowPhotoModal(true)}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#1C1C1E" />
              ) : (
                <Text style={styles.editPhotoText}>Edit Photo</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={handleRemovePhoto}
            >
              <Text style={styles.removePhotoText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input Fields Section - Card Style */}
        <View style={styles.formCard}>
          {/* Username Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.charCount}>{name.length}/30</Text>
            </View>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter username"
              placeholderTextColor="#9CA3AF"
              maxLength={30}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Bio Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Text style={styles.label}>Bio</Text>
              <Text style={styles.charCount}>{bio.length}/90</Text>
            </View>
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
          </View>
        </View>

      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
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
              <Text style={styles.modalTitle}>Select Photo Source</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => pickImage('camera')}
              >
                <IconSymbol name="camera.fill" size={32} color="#1C1C1E" />
                <Text style={styles.modalButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => pickImage('gallery')}
              >
                <IconSymbol name="photo.fill" size={32} color="#1C1C1E" />
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Photo Section Styles
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12, // Reduced padding to fit buttons better
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F2',
  },
  profileImage: {
    width: 70, // Slightly reduced from 80
    height: 70,
    borderRadius: 35,
    marginRight: 12, // Reduced margin
    backgroundColor: '#F2F2F2',
  },
  photoButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 8, // Reduced gap
  },
  editPhotoButton: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    paddingVertical: 10, // Adjusted padding
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPhotoText: {
    fontSize: 13, // Slightly smaller text if needed
    fontWeight: '600',
    color: '#1C1C1E',
  },
  removePhotoButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Form Section Styles
  formCard: {
    backgroundColor: '#F5F5F5', // Darker gray for better visibility against white
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600', // Made bold
    color: '#555555', // Darker gray label
  },
  charCount: {
    fontSize: 12,
    color: '#888',
  },
  input: {
    fontSize: 16,
    color: '#000000', // Solid black text
    paddingVertical: 8,
    fontWeight: '600', // Semi-bold text
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0', // Darker divider
    marginVertical: 16,
  },

  // Footer Styles
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontWeight: '700',
    color: '#1C1C1E',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
  },
  modalButton: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  modalButtonText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
  },
});