import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

export default function CreatePollScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [creating, setCreating] = useState(false);

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
      Alert.alert('Poll Created! 📊', 'Your poll has been posted to the group chat.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create poll. Please try again.');
      console.error('Error creating poll:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Poll</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Add Media</Text>
          <View style={styles.divider} />
        </View>

        {/* Question Input */}
        <View style={styles.section}>
          <TextInput
            style={styles.questionInput}
            placeholder="Ask Question"
            placeholderTextColor="#9CA3AF"
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={200}
          />
        </View>

        {/* Poll Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Poll Options</Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={styles.optionInput}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor="#9CA3AF"
                value={option}
                onChangeText={(value) => handleOptionChange(index, value)}
                maxLength={100}
              />
              {options.length > 2 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveOption(index)}
                >
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {options.length < 10 && (
            <TouchableOpacity style={styles.addOptionButton} onPress={handleAddOption}>
              <Ionicons name="add" size={20} color={Colors.light.primary} />
              <Text style={styles.addOptionText}>Add Option</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
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
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
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
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  questionInput: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.md,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 15,
    color: Colors.light.text,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addOptionText: {
    fontSize: 15,
    color: Colors.light.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  createButton: {
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

