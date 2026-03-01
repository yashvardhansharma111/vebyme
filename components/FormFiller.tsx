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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface FormField {
  field_id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date';
  placeholder?: string;
  options?: string[];
  required: boolean;
  order: number;
}

interface FormFillerProps {
  fields: FormField[];
  visible: boolean;
  onSubmit: (responses: Record<string, any>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function FormFiller({
  fields,
  visible,
  onSubmit,
  onCancel,
  loading = false,
}: FormFillerProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    for (const field of fields) {
      if (field.required && !responses[field.field_id]) {
        Alert.alert('Required Field', `${field.label} is required`);
        return;
      }
    }

    onSubmit(responses);
  };

  const renderField = (field: FormField, index: number) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <View key={field.field_id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={{ color: 'red' }}>*</Text>}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              value={responses[field.field_id] || ''}
              onChangeText={(text) => handleFieldChange(field.field_id, text)}
              keyboardType={
                field.type === 'number'
                  ? 'numeric'
                  : field.type === 'phone'
                  ? 'phone-pad'
                  : field.type === 'email'
                  ? 'email-address'
                  : 'default'
              }
            />
          </View>
        );

      case 'textarea':
        return (
          <View key={field.field_id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={{ color: 'red' }}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 100 }]}
              placeholder={field.placeholder}
              value={responses[field.field_id] || ''}
              onChangeText={(text) => handleFieldChange(field.field_id, text)}
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 'select':
        return (
          <View key={field.field_id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={{ color: 'red' }}>*</Text>}
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={responses[field.field_id] || ''}
                onValueChange={(value) => handleFieldChange(field.field_id, value)}
              >
                <Picker.Item label="Select an option" value="" />
                {field.options?.map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))}
              </Picker>
            </View>
          </View>
        );

      case 'radio':
        return (
          <View key={field.field_id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={{ color: 'red' }}>*</Text>}
            </Text>
            {field.options?.map((opt) => (
              <Pressable
                key={opt}
                style={styles.radioContainer}
                onPress={() => handleFieldChange(field.field_id, opt)}
              >
                <View
                  style={[
                    styles.radio,
                    responses[field.field_id] === opt && styles.radioSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        );

      case 'checkbox':
        return (
          <View key={field.field_id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={{ color: 'red' }}>*</Text>}
            </Text>
            {field.options?.map((opt) => (
              <Pressable
                key={opt}
                style={styles.checkboxContainer}
                onPress={() => {
                  const current = responses[field.field_id] || [];
                  if (current.includes(opt)) {
                    handleFieldChange(
                      field.field_id,
                      current.filter((i: string) => i !== opt)
                    );
                  } else {
                    handleFieldChange(field.field_id, [...current, opt]);
                  }
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    (responses[field.field_id] || []).includes(opt) &&
                      styles.checkboxSelected,
                  ]}
                >
                  {(responses[field.field_id] || []).includes(opt) && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        );

      case 'date':
        return (
          <View key={field.field_id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={{ color: 'red' }}>*</Text>}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={responses[field.field_id] || ''}
              onChangeText={(text) => handleFieldChange(field.field_id, text)}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Registration Form</Text>
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {/* Form Fields */}
        <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
          {fields.map((field, index) => renderField(field, index))}
        </ScrollView>

        {/* Actions */}
        <View style={styles.footer}>
          <Pressable
            onPress={onCancel}
            disabled={loading}
            style={[styles.button, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.button, styles.submitButton]}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 24,
    color: '#FFF',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 10,
  },
  radioSelected: {
    borderColor: '#1C1C1E',
    backgroundColor: '#1C1C1E',
  },
  radioLabel: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#1C1C1E',
    backgroundColor: '#1C1C1E',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 2,
    borderColor: '#1C1C1E',
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  submitButton: {
    backgroundColor: '#1C1C1E',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
