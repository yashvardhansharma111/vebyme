import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';
import { updateProfile } from '@/store/slices/profileSlice';
import { extractInstagramIdFromUrl } from '@/utils/social';

// Define the structure for our social links
interface SocialPlatform {
  id: string;
  baseUrl: string;
  value: string;
  enabled: boolean;
  iconName: any; 
  isCustomIcon?: boolean; // Flag for X logo
}

const INITIAL_SOCIALS: SocialPlatform[] = [
  { id: 'instagram', baseUrl: 'instagram.com/', value: '', enabled: true, iconName: 'logo-instagram' },
  { id: 'x', baseUrl: 'x.com/', value: '', enabled: true, iconName: '', isCustomIcon: true },
  { id: 'snapchat', baseUrl: 'snapchat.com/', value: '', enabled: true, iconName: 'logo-snapchat' },
];

export default function ManageSocialsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

  const [socials, setSocials] = useState<SocialPlatform[]>(INITIAL_SOCIALS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.session_id) {
      dispatch(fetchCurrentUser(user.session_id));
    } else {
      setLoading(false);
    }
  }, [user?.session_id, dispatch]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const sm = (currentUser as any).social_media || {};
    setSocials([
      { ...INITIAL_SOCIALS[0], value: sm.instagram || '', enabled: !!sm.instagram },
      { ...INITIAL_SOCIALS[1], value: sm.x || sm.twitter || '', enabled: !!(sm.x || sm.twitter) },
      { ...INITIAL_SOCIALS[2], value: sm.snapchat || '', enabled: !!sm.snapchat },
    ]);
    setLoading(false);
  }, [currentUser]);

  const handleTextChange = (id: string, text: string) => {
    setSocials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value: text } : item))
    );
  };

  const toggleSocial = (id: string) => {
    setSocials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleSave = async () => {
    if (!user?.session_id) {
      Alert.alert('Error', 'You must be logged in to save.');
      return;
    }
    setSaving(true);
    try {
      const social_media: { instagram?: string; x?: string; snapchat?: string } = {};
      socials.forEach((s) => {
        const v = s.value?.trim();
        if (s.enabled && v) {
          if (s.id === 'instagram') social_media.instagram = extractInstagramIdFromUrl(v) || v.replace(/^@/, '');
          if (s.id === 'x') social_media.x = v.replace(/^@/, '');
          if (s.id === 'snapchat') social_media.snapchat = v.replace(/^@/, '');
        }
      });
      await dispatch(updateProfile({ session_id: user.session_id, data: { social_media } })).unwrap();
      Alert.alert('Saved', 'Your social links have been updated.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save socials.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1C1C1E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Your Socials</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {socials.map((social) => (
            <View key={social.id} style={styles.socialBlock}>
              
              {/* Input Gray Box */}
              <View style={styles.inputWrapper}>
                <View style={styles.iconContainer}>
                  {social.isCustomIcon ? (
                    // Custom X Logo
                    <Text style={styles.customXIcon}>𝕏</Text>
                  ) : (
                    <Ionicons name={social.iconName} size={24} color="#1C1C1E" />
                  )}
                </View>
                
                <View style={styles.textInputContainer}>
                  <Text style={styles.baseUrlText}>{social.baseUrl}</Text>
                  <TextInput
                    style={styles.input}
                    value={social.value}
                    onChangeText={(text) => handleTextChange(social.id, text)}
                    autoCapitalize="none"
                    placeholder=""
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Toggle Row */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Display it on your profile</Text>
                <Switch
                  value={social.enabled}
                  onValueChange={() => toggleSocial(social.id)}
                  // Dark track color based on the zoomed image
                  trackColor={{ false: '#E5E5EA', true: '#252525' }} 
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E5EA"
                  style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                />
              </View>

            </View>
          ))}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingTop: 60, // Safe area adjustment
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  
  // Social Block
  socialBlock: {
    marginBottom: 8,
  },
  
  // Input Wrapper (The Gray Box)
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3', // Light gray background from screenshot
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customXIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  
  // Text Input Area
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  baseUrlText: {
    fontSize: 16,
    color: '#666666', // Gray text for the base url
    fontWeight: '400',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '400',
    padding: 0,
  },

  // Toggle Row Styles
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24, // Space between blocks
  },
  toggleLabel: {
    fontSize: 14,
    color: '#666666', // Gray text for label
    fontWeight: '400',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40, // Bottom safe area
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#1C1C1E', // Black button
    borderRadius: 30, // Pill shape
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 