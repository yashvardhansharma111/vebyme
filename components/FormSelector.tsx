import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "@/services/api";
import FormEditor, { FormField } from "./FormEditor";

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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [editLoading, setEditLoading] = useState(false);

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
      setError(err instanceof Error ? err.message : "Failed to load forms");
      setForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const handleEditForm = (form: Form) => {
    setSelectedForm(form);
    setEditModalVisible(true);
  };

  const handleSaveForm = async (updatedForm: Form) => {
    try {
      setEditLoading(true);
      
      // Convert FormField[] to the format expected by the API
      const fields = updatedForm.fields?.map((field: FormField, index: number) => ({
        field_id: field.field_id,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        options: field.options,
        required: field.required,
        order: index,
      }));

      const response = await apiService.updateForm(updatedForm.form_id, {
        name: updatedForm.name,
        description: updatedForm.description,
        fields: fields,
      });

      if (response.success) {
        Alert.alert("Success", "Form updated successfully!");
        setEditModalVisible(false);
        setSelectedForm(null);
        // Reload forms to show updated data
        await loadForms();
      } else {
        Alert.alert("Error", response.message || "Failed to update form");
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update form");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setSelectedForm(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container} edges={["top"]}>
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
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Loading forms...</Text>
          </View>
        ) : forms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No forms yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first form to get started
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.formsList}>
            {forms.map((form) => (
              <View key={form.form_id} style={styles.formItemContainer}>
                <Pressable
                  onPress={() => onSelect(form.form_id)}
                  style={styles.formItem}
                >
                  <View style={styles.formInfo}>
                    <Text style={styles.formName}>{form.name}</Text>
                    {form.description && (
                      <Text style={styles.formDescription}>
                        {form.description}
                      </Text>
                    )}
                    {form.fields && form.fields.length > 0 && (
                      <View style={styles.formQuestions}>
                        {form.fields
                          .slice(0, 3)
                          .map((field: any, index: number) => (
                            <Text
                              key={index}
                              style={styles.formQuestion}
                              numberOfLines={1}
                            >
                              {index + 1}.{" "}
                              {field.question || field.label || "Question"}
                            </Text>
                          ))}
                        {form.fields.length > 3 && (
                          <Text style={styles.formMoreQuestions}>
                            +{form.fields.length - 3} more questions
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </Pressable>
                <Pressable
                  onPress={() => handleEditForm(form)}
                  style={styles.editButton}
                >
                  <Ionicons name="create" size={20} color="#000000" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
              </View>
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
      </SafeAreaView>
      
      <FormEditor
        visible={editModalVisible}
        form={selectedForm}
        onSave={handleSaveForm}
        onCancel={handleCancelEdit}
        loading={editLoading}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    minHeight: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  headerSpacer: {
    width: 60,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#330000",
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#ccc",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
  },
  formsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  formInfo: {
    flex: 1,
  },
  formName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  formDescription: {
    fontSize: 13,
    color: "#ccc",
    marginTop: 4,
  },
  formQuestions: {
    marginTop: 8,
  },
  formQuestion: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 2,
  },
  formMoreQuestions: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  createButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#fff",
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  formItemContainer: {
    marginBottom: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
    alignSelf: "flex-start",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
});
