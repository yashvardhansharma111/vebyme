import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/services/api';

interface Form {
  form_id: string;
  name: string;
  description?: string;
  fields?: any[];
  created_at?: string;
}

interface FormSelectorProps {
  visible: boolean;
  userId: string;
  onSelect: (formId: string) => void;
  onCreateNew: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function FormSelector({
  visible,
  userId,
  onSelect,
  onCreateNew,
  onCancel,
  loading = false,
}: FormSelectorProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadForms();
    }
  }, [visible]);

  const loadForms = async () => {
    try {
      setLoadingForms(true);
      setError(null);
      const response = await apiService.getUserForms(userId);
      if (response.success && response.data?.forms) {
        setForms(response.data.forms);
      } else {
        setForms([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
      setForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Select or Create Form</Text>
          <View style={styles.headerSpacer} />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loadingForms ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading forms...</Text>
          </View>
        ) : forms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No forms yet</Text>
            <Text style={styles.emptySubtitle}>Create your first form to get started</Text>
          </View>
        ) : (
          <ScrollView style={styles.formsList}>
            {forms.map((form) => (
              <Pressable
                key={form.form_id}
                onPress={() => onSelect(form.form_id)}
                style={styles.formItem}
              >
                <View style={styles.formInfo}>
                  <Text style={styles.formName}>{form.name}</Text>
                  {form.description && (
                    <Text style={styles.formDescription}>{form.description}</Text>
                  )}
                  <Text style={styles.formFieldCount}>
                    {form.fields?.length || 0} field{(form.fields?.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable
            onPress={onCreateNew}
            disabled={loading}
            style={[styles.createButton, loading && styles.disabledButton]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create New Form</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
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
    color: '#007AFF',
    fontWeight: '500',
  },
  headerSpacer: {
    width: 60,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  formsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formInfo: {
    flex: 1,
  },
  formName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  formDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  formFieldCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  createButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
