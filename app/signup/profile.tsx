import { apiService } from '@/services/api';
import { updateProfile } from '@/store/slices/profileSlice';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function SignupProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  
  // Modal State
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showAgeRangePicker, setShowAgeRangePicker] = useState(false);

  const genders = ['Male', 'Female', 'Other'];
  const ageRanges = ['18–22', '23–27', '28–35', '36+'];

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Upload image
        try {
          const formData = new FormData();
          // @ts-ignore
          formData.append('file', {
            uri: asset.uri,
            name: 'profile.jpg',
            type: 'image/jpeg',
          });

          const uploadResponse = await apiService.uploadImage(formData, user?.access_token);
          if (uploadResponse.data?.url) {
            setProfileImage(uploadResponse.data.url);
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'Failed to upload image');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter your name');
      return;
    }
    if (!gender) {
      Alert.alert('Validation', 'Please select your gender');
      return;
    }
    if (!bio.trim()) {
      Alert.alert('Validation', 'Please add a short bio');
      return;
    }
    if (!acceptedGuidelines) {
      Alert.alert('Validation', 'Please accept the Terms & Community Guidelines to continue');
      return;
    }

    if (!user?.session_id) {
      Alert.alert('Error', 'Session not found');
      return;
    }

    setIsSubmitting(true);

    try {
      const profileData: any = {
        name: name.trim(),
        bio: bio.trim(),
        gender: gender.toLowerCase(),
        age_range: ageRange || undefined,
        accept_eula: true,
        eula_version: 'v1',
      };

      if (profileImage) {
        profileData.profile_image = profileImage;
      }

      await dispatch(
        updateProfile({
          session_id: user.session_id,
          data: profileData,
        })
      ).unwrap();

      router.push('/signup/interests');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
       <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.contentContainer}>
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Finally!</Text>
                <Text style={styles.subtitle}>Let's hear about you</Text>
            </View>

            {/* Profile Image */}
            <View style={styles.imageWrapper}>
                <TouchableOpacity onPress={handleImagePicker} style={styles.imageContainer}>
                {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="person" size={60} color="#FFF" />
                    </View>
                )}
                <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={16} color="#000" />
                </View>
                </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.form}>
                
                {/* Name */}
                <View style={styles.inputGroup}>
                    <TextInput
                        style={styles.input}
                        placeholder="Your Name"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />
                </View>

                {/* Age range */}
                <View style={styles.inputGroup}>
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowAgeRangePicker(true)}
                    >
                        <Text style={[styles.inputText, !ageRange && styles.placeholderText]}>
                            {ageRange || 'Age range (optional)'}
                        </Text>
                        <Ionicons name="chevron-down" size={22} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Gender */}
                <View style={styles.inputGroup}>
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowGenderPicker(!showGenderPicker)}
                    >
                        <Text style={[styles.inputText, !gender && styles.placeholderText]}>
                            {gender || "Gender"}
                        </Text>
                        <Ionicons name="chevron-down" size={22} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Bio */}
                <View style={styles.inputGroup}>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Anything you want to put on status"
                        placeholderTextColor="#9CA3AF"
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {/* Terms / Community guidelines acceptance */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAcceptedGuidelines((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, acceptedGuidelines && styles.checkboxChecked]}>
                    {acceptedGuidelines ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
                  </View>
                  <Text style={styles.checkboxText}>
                    I agree to the Terms & Community Guidelines
                  </Text>
                </TouchableOpacity>
                <Text style={styles.checkboxHelperText}>
                  Required to keep vybeme safe.
                </Text>

            </View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.footer}>
             <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.buttonText}>One more step</Text>
                )}
            </TouchableOpacity>
          </View>

        </View>

        {/* --- MODALS --- */}

        {/* Age range picker */}
        <Modal visible={showAgeRangePicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAgeRangePicker(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select age range</Text>
              {ageRanges.map((r, index) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.modalOption, index === ageRanges.length - 1 && styles.modalOptionLast]}
                  onPress={() => {
                    setAgeRange(r);
                    setShowAgeRangePicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, ageRange === r && styles.selectedText]}>{r}</Text>
                  {ageRange === r && <Ionicons name="checkmark" size={20} color="#1C1C1E" />}
                </TouchableOpacity>
              ))}
              <View style={styles.hairlineDivider} />
              <TouchableOpacity
                style={[styles.modalOption, styles.modalOptionLast]}
                onPress={() => {
                  setAgeRange('');
                  setShowAgeRangePicker(false);
                }}
              >
                <Text style={styles.modalOptionText}>Skip</Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Used to recommend age-relevant plans.
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Gender Selection Modal */}
        <Modal visible={showGenderPicker} transparent animationType="fade">
             <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setShowGenderPicker(false)}
             >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Gender</Text>
                    {genders.map((g, index) => (
                        <TouchableOpacity 
                            key={g} 
                            style={[styles.modalOption, index === genders.length - 1 && styles.modalOptionLast]}
                            onPress={() => {
                                setGender(g);
                                setShowGenderPicker(false);
                            }}
                        >
                            <Text style={[styles.modalOptionText, gender === g && styles.selectedText]}>{g}</Text>
                            {gender === g && <Ionicons name="checkmark" size={20} color="#1C1C1E" />}
                        </TouchableOpacity>
                    ))}
                </View>
             </TouchableOpacity>
        </Modal>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Image
  imageWrapper: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#9CA3AF', // Gray placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Form
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 0,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 16,
    color: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputText: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
    padding: 0, // Removes default Android padding
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  textArea: {
    minHeight: 120,
    alignItems: 'flex-start',
    paddingTop: 18,
  },
  // Footer
  footer: {
    padding: 24,
    paddingBottom: 10,
  },
  button: {
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    padding: 20,
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOptionLast: {
    borderBottomWidth: 0,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedText: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginTop: 8,
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  checkboxRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  checkboxHelperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
});