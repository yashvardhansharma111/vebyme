import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FormField {
  field_id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date';
  placeholder?: string;
  options?: string[];
  required: boolean;
  order: number;
}

interface FormBuilderProps {
  visible: boolean;
  onSave: (fields: FormField[]) => void;
  onCancel: () => void;
  initialFields?: FormField[];
  loading?: boolean;
}

const FIELD_TYPES: FormField['type'][] = [
  'text',
  'email',
  'phone',
  'number',
  'select',
  'textarea',
  'checkbox',
  'radio',
  'date',
];

export default function FormBuilder({
  visible,
  onSave,
  onCancel,
  initialFields = [],
  loading = false,
}: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(
    initialFields.length > 0 ? initialFields : []
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}_${Math.random()}`,
      label: `Field ${fields.length + 1}`,
      type: 'text',
      placeholder: '',
      options: [],
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    setFields(newFields);
  };

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    setFields(newFields);
  };

  const handleSave = () => {
    if (fields.length === 0) {
      Alert.alert('Required', 'Please add at least one field');
      return;
    }
    onSave(fields);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Form Builder</Text>
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={[styles.headerButton, loading && styles.disabledButton]}
          >
            <Text style={[styles.headerButtonText, styles.saveButton]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {fields.map((field, index) => (
            <View key={field.field_id} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldIndex}>{index + 1}</Text>
                <View style={styles.fieldHeaderActions}>
                  <Pressable
                    onPress={() => moveFieldUp(index)}
                    disabled={index === 0}
                    style={[styles.iconButton, index === 0 && styles.disabledButton]}
                  >
                    <Ionicons name="arrow-up" size={20} color={index === 0 ? '#ccc' : '#007AFF'} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveFieldDown(index)}
                    disabled={index === fields.length - 1}
                    style={[styles.iconButton, index === fields.length - 1 && styles.disabledButton]}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={20}
                      color={index === fields.length - 1 ? '#ccc' : '#007AFF'}
                    />
                  </Pressable>
                  <Pressable onPress={() => deleteField(index)} style={styles.iconButton}>
                    <Ionicons name="trash" size={20} color="#FF3B30" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Field Label *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Full Name"
                  value={field.label}
                  onChangeText={(text) => updateField(index, { label: text })}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Field Type *</Text>
                <View style={styles.typePickerContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.typePicker}
                  >
                    {FIELD_TYPES.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => updateField(index, { type, options: [] })}
                        style={[
                          styles.typeOption,
                          field.type === type && styles.typeOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeOptionText,
                            field.type === type && styles.typeOptionTextSelected,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Placeholder (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Enter your full name"
                  value={field.placeholder || ''}
                  onChangeText={(text) => updateField(index, { placeholder: text })}
                  placeholderTextColor="#999"
                />
              </View>

              {['select', 'radio', 'checkbox'].includes(field.type) && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Options (comma-separated)</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 80 }]}
                    placeholder="Option 1, Option 2, Option 3"
                    multiline
                    value={field.options?.join(', ') || ''}
                    onChangeText={(text) => {
                      const opts = text.split(',').map((o) => o.trim()).filter(Boolean);
                      updateField(index, { options: opts });
                    }}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              <View style={styles.requiredContainer}>
                <Text style={styles.label}>Required</Text>
                <Switch
                  value={field.required}
                  onValueChange={(value) => updateField(index, { required: value })}
                  trackColor={{ false: '#ddd', true: '#81C784' }}
                  thumbColor={'#fff'}
                />
              </View>
            </View>
          ))}

          <Pressable onPress={addField} style={styles.addFieldButton}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.addFieldButtonText}>Add Field</Text>
          </Pressable>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fieldCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldIndex: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  fieldHeaderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#f9f9f9',
  },
  typePickerContainer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  typePicker: {
    flexGrow: 0,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#f9f9f9',
  },
  typeOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  requiredContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
  },
  addFieldButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
