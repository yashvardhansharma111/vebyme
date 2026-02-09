import { updateProfile } from '@/store/slices/profileSlice';
import { clearNewUserFlag } from '@/store/slices/authSlice';
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

// Data mapping exactly to the screenshot with Emojis
const INTERESTS_DATA = [
  { label: 'Breakfast', emoji: '🥞' },
  { label: 'Brunch', emoji: '🍹' },
  { label: 'Lunch', emoji: '🍔' },
  { label: 'Dinner', emoji: '🍝' },
  { label: 'Coffee', emoji: '☕' },
  { label: 'Picnic', emoji: '🧺' },
  { label: 'Barbecue', emoji: '🍖' },
  { label: 'Movie', emoji: '🍿' },
  { label: 'Art', emoji: '🎨' },
  { label: 'Board Games', emoji: '♟️' },
  { label: 'House Party', emoji: '🏡' },
  { label: 'Bike Ride', emoji: '🚲' },
  { label: 'Road Trip', emoji: '🛣️' },
  { label: 'Karaoke', emoji: '🎤' },
  { label: 'Outdoor', emoji: '🌇' },
  { label: 'Concert', emoji: '🎷' },
  { label: 'Cooking', emoji: '🥣' },
  { label: 'Live Music', emoji: '🎶' },
  { label: 'Party', emoji: '🎉' },
  { label: 'Health', emoji: '💪' },
  { label: 'Themed Party', emoji: '👯' },
  { label: 'Book', emoji: '📔' },
  { label: 'Nature', emoji: '🌅' },
  { label: 'Standup', emoji: '🎙️' },
  { label: 'Sports', emoji: '🏀' },
  { label: 'Workshops', emoji: '🧘' },
  { label: 'Pet Meeting', emoji: '🐕' },
  { label: 'Potluck', emoji: '🍱' },
];

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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Lastly,</Text>
            <Text style={styles.subtitle}>What do you vybe on?</Text>
          </View>

          <View style={styles.interestsGrid}>
            {INTERESTS_DATA.map((item) => {
              const isSelected = selectedInterests.includes(item.label);

              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.interestChip, isSelected && styles.interestChipSelected]}
                  onPress={() => toggleInterest(item.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <Text
                    style={[styles.interestText, isSelected && styles.interestTextSelected]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2', // Light gray background
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
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
    justifyContent: 'center', // Centers the cloud of chips
    gap: 12,
    marginBottom: 20,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25, // Pill shape
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  interestChipSelected: {
    backgroundColor: '#1C1C1E', // Black background when selected
    transform: [{ scale: 1.02 }], // Slight pop effect
  },
  emoji: {
    fontSize: 18,
    marginRight: 8,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  interestTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#F2F2F2',
  },
  button: {
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});