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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function SignupProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string>('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const genders = ['male', 'female', 'other'];

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
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
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

    if (!user?.session_id) {
      Alert.alert('Error', 'Session not found');
      return;
    }

    setIsSubmitting(true);

    try {
      const profileData: any = {
        name: name.trim(),
        bio: bio.trim(),
      };

      if (gender) {
        profileData.gender = gender;
      }

      if (profileImage) {
        profileData.profile_image = profileImage;
      }

      await dispatch(
        updateProfile({
          session_id: user.session_id,
          data: profileData,
        })
      ).unwrap();

      // Navigate to interests screen
      router.push('/signup/interests');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Finally!</Text>
            <Text style={styles.subtitle}>Let's hear about you</Text>
          </View>

          <View style={styles.form}>
            {/* Profile Image */}
            <View style={styles.imageContainer}>
              <TouchableOpacity onPress={handleImagePicker} style={styles.imageButton}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="person" size={40} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={20} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity style={styles.input}>
                <TextInput
                  style={styles.inputText}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9CA3AF"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Gender */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowGenderPicker(!showGenderPicker)}
              >
                <Text style={[styles.inputText, !gender && { color: '#9CA3AF' }]}>
                  {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Select gender'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showGenderPicker && (
                <View style={styles.pickerContainer}>
                  {genders.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pickerOption, gender === g && styles.pickerOptionSelected]}
                      onPress={() => {
                        setGender(g);
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          gender === g && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Bio/Status */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Anything you want to put on status</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#9CA3AF"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Done, let's Vibe!</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imageButton: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  textArea: {
    minHeight: 100,
    alignItems: 'flex-start',
  },
  pickerContainer: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  pickerOptionSelected: {
    backgroundColor: '#F2F2F7',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
    color: '#1C1C1E',
  },
  button: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

