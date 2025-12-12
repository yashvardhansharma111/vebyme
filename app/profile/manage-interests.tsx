import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, fetchCurrentUser } from '@/store/slices/profileSlice';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ALL_INTERESTS = [
  'House Party',
  'Road Trip',
  'Concert',
  'Sports',
  'Breakfast',
  'Brunch',
  'Lunch',
  'Dinner',
  'Coffee',
  'Drinks',
  'Art',
  'Music',
  'Movies',
  'Gaming',
  'Travel',
  'Photography',
  'Reading',
  'Writing',
  'Dancing',
  'Singing',
  'Cooking',
  'Party',
  'Health',
  'Fitness',
  'Fashion',
  'Shopping',
  'Workshops',
  'Networking',
  'Podcasts',
];

export default function ManageInterestsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.interests) {
      setSelectedInterests(currentUser.interests);
    } else if (user?.session_id) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [currentUser, user, dispatch]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    if (!user?.session_id) return;

    setSaving(true);
    try {
      await dispatch(
        updateProfile({
          session_id: user.session_id,
          data: { interests: selectedInterests },
        })
      ).unwrap();
      router.back();
    } catch (error: any) {
      console.error('Error saving interests:', error);
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
        <Text style={styles.headerTitle}>Manage Your Interests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.interestsGrid}>
          {ALL_INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestTag,
                  isSelected && styles.interestTagSelected,
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestText,
                    isSelected && styles.interestTextSelected,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
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
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  interestTag: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  interestTagSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  interestText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  interestTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

