import { updateProfile } from '@/store/slices/profileSlice';
import { clearNewUserFlag } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const ALL_INTERESTS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Coffee',
  'Music',
  'Movies',
  'Art',
  'Board Games',
  'House Party',
  'Road Trip',
  'Concert',
  'Cooking',
  'Live Music',
  'Party',
  'Health',
  'HumanityParty',
  'Nature',
  'Standup',
  'Sports',
  'Workshops',
  'PreMeeting',
  'Podcasts',
];

const INTEREST_ICONS: { [key: string]: string } = {
  Breakfast: 'croissant',
  Lunch: 'restaurant',
  Dinner: 'restaurant',
  Coffee: 'cafe',
  Music: 'musical-notes',
  Movies: 'film',
  Art: 'color-palette',
  'Board Games': 'dice',
  'House Party': 'home',
  'Road Trip': 'car',
  Concert: 'mic',
  Cooking: 'restaurant',
  'Live Music': 'guitar',
  Party: 'balloon',
  Health: 'heart',
  HumanityParty: 'people',
  Nature: 'leaf',
  Standup: 'mic',
  Sports: 'basketball',
  Workshops: 'construct',
  PreMeeting: 'handshake',
  Podcasts: 'radio',
};

export default function SignupInterestsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) {
      Alert.alert('Validation', 'Please select at least one interest');
      return;
    }

    if (!user?.session_id) {
      Alert.alert('Error', 'Session not found');
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        updateProfile({
          session_id: user.session_id,
          data: { interests: selectedInterests },
        })
      ).unwrap();

      // Mark user as no longer new
      dispatch(clearNewUserFlag());

      // Navigate to homepage
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error saving interests:', error);
      Alert.alert('Error', error.message || 'Failed to save interests');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Lastly,</Text>
          <Text style={styles.subtitle}>What do you vibe to?</Text>
        </View>

        <View style={styles.interestsGrid}>
          {ALL_INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            const iconName = INTEREST_ICONS[interest] || 'ellipse';

            return (
              <TouchableOpacity
                key={interest}
                style={[styles.interestChip, isSelected && styles.interestChipSelected]}
                onPress={() => toggleInterest(interest)}
              >
                <Ionicons
                  name={iconName as any}
                  size={20}
                  color={isSelected ? '#FFF' : '#666'}
                  style={styles.interestIcon}
                />
                <Text
                  style={[styles.interestText, isSelected && styles.interestTextSelected]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Let's Go</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
    justifyContent: 'space-between',
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minWidth: '30%',
    maxWidth: '48%',
  },
  interestChipSelected: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  interestIcon: {
    marginRight: 8,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  interestTextSelected: {
    color: '#FFF',
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

