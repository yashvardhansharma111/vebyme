import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

export default function CreatePollScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '']);
  const [creating, setCreating] = useState(false);
  const [canCreatePoll, setCanCreatePoll] = useState<boolean | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !user?.user_id) {
      setCanCreatePoll(false);
      setGroupLoading(false);
      return;
    }
    apiService
      .getGroupDetails(groupId)
      .then((res: any) => {
        const g = res?.data ?? res;
        const isAnnouncement = !!g?.is_announcement_group;
        const isOwner = g?.created_by === user?.user_id;
        setCanCreatePoll(!isAnnouncement || isOwner);
      })
      .catch(() => setCanCreatePoll(false))
      .finally(() => setGroupLoading(false));
  }, [groupId, user?.user_id]);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (canCreatePoll === false) {
      Alert.alert('Not allowed', 'Only the group owner can create polls in this announcement group.');
      return;
    }
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      Alert.alert('Error', 'Please add at least 2 options');
      return;
    }

    if (!groupId || !user?.user_id) {
      Alert.alert('Error', 'Missing group or user information');
      return;
    }

    try {
      setCreating(true);
      await apiService.createPoll(groupId, user.user_id, question.trim(), validOptions);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create poll.');
    } finally {
      setCreating(false);
    }
  };

  if (groupLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      </SafeAreaView>
    );
  }

  if (canCreatePoll === false) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 16, color: '#8E8E93', textAlign: 'center' }}>
            Only the group owner can create polls in this announcement group. You can view and vote on existing polls.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Modal Indicator Bar */}
      <View style={styles.modalIndicatorContainer}>
        <View style={styles.modalIndicator} />
      </View>

      {/* Header (Hidden back button usually for modals, but keeping logical structure) */}
      <View style={styles.header}>
        {/* Placeholder for left side to balance title */}
        <View style={{ width: 24 }} /> 
        {/* Title could be here, but screenshot implies clean look. Leaving empty or adding if needed. */}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Add Media / Question Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Add Media</Text>
            
            <TextInput
              style={styles.questionInput}
              placeholder="Ask Question"
              placeholderTextColor="#9CA3AF"
              value={question}
              onChangeText={setQuestion}
              multiline={false}
              maxLength={150}
            />
          </View>

          {/* Poll Options Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Poll Options</Text>
            
            {options.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor="#9CA3AF"
                  value={option}
                  onChangeText={(value) => handleOptionChange(index, value)}
                  maxLength={60}
                />
                
                {/* Delete Icon (Trash Can) */}
                {options.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveOption(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* + Add Option Button */}
            {options.length < 10 && (
              <TouchableOpacity style={styles.addOptionButton} onPress={handleAddOption}>
                <Ionicons name="add" size={20} color="#333" />
                <Text style={styles.addOptionText}>Add Option</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Create Button Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreatePoll}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Poll</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16, // Pill-ish shape but taller
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24, // Full Pill Shape
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  removeButton: {
    padding: 10,
    marginLeft: 4,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 8,
  },
  addOptionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginLeft: 6,
  },
  footer: {
    padding: 16,
    paddingBottom: 30, // Extra padding for safe area visually
    borderTopWidth: 0,
  },
  createButton: {
    backgroundColor: '#1F2937', // Dark/Black button
    borderRadius: 30, // Pill Shape
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});