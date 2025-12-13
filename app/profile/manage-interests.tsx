import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, fetchCurrentUser } from '@/store/slices/profileSlice';
import { Ionicons } from '@expo/vector-icons';

// Data mapping exactly to the screenshot
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Your Interests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.interestsCloud}>
          {INTERESTS_DATA.map((item) => {
            const isSelected = selectedInterests.includes(item.label);
            return (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.interestTag,
                  isSelected && styles.interestTagSelected,
                ]}
                onPress={() => toggleInterest(item.label)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.interestText,
                    isSelected && styles.interestTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Save Button */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
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
  
  // Interests Cloud Layout
  interestsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // Center the cloud of tags
    gap: 12,
    paddingTop: 10,
  },
  
  // Tag Styles
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // White background for unselected
    borderRadius: 30, // Pill shape
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Subtle shadow for unselected items (to stand out against white bg)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    // Border for better definition
    borderWidth: 1,
    borderColor: '#F2F2F2',
  },
  interestTagSelected: {
    backgroundColor: '#1C1C1E', // Black background for selected
    borderColor: '#1C1C1E',
    transform: [{ scale: 1.02 }], // Slight pop
  },
  
  emoji: {
    fontSize: 18,
    marginRight: 8,
  },
  interestText: {
    fontSize: 14,
    color: '#1C1C1E', // Dark text
    fontWeight: '600',
  },
  interestTextSelected: {
    color: '#FFFFFF', // White text
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#1C1C1E', // Black button
    borderRadius: 30,
    padding: 18,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});