import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export interface FormField {
  field_id: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox";
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

export default function FormBuilder({
  visible,
  onSave,
  onCancel,
  initialFields = [],
  loading = false,
}: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);

  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}`,
      label: `Field ${fields.length + 1}`,
      type: "text",
      placeholder: "",
      options: [],
      required: false,
      order: fields.length,
    };

    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const addOption = (fieldIndex: number) => {
    const updated = [...fields];
    const opts = updated[fieldIndex].options || [];
    updated[fieldIndex].options = [...opts, ""];
    setFields(updated);
  };

  const updateOption = (
    fieldIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const updated = [...fields];
    const opts = updated[fieldIndex].options || [];

    opts[optionIndex] = value;

    updated[fieldIndex].options = opts;
    setFields(updated);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...fields];
    const opts = updated[fieldIndex].options || [];
    opts.splice(optionIndex, 1);
    updated[fieldIndex].options = opts;
    setFields(updated);
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (fields.length === 0) {
      Alert.alert("Required", "Please add at least one field");
      return;
    }

    onSave(fields);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView style={styles.content}>
            {fields.map((field, index) => (
              <View key={field.field_id} style={styles.fieldCard}>
                {/* Header */}
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldIndex}>{index + 1}</Text>

                  <Pressable onPress={() => deleteField(index)}>
                    <Ionicons name="trash" size={20} color="#FF3B30" />
                  </Pressable>
                </View>

                {/* Label */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Field Label *</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Full Name"
                    value={field.label}
                    onChangeText={(text) =>
                      updateField(index, { label: text })
                    }
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Field Type Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Field Type *</Text>

                  <Pressable
                    style={styles.fieldTypeRow}
                    onPress={() => setActiveFieldIndex(index)}
                  >
                    <Text style={styles.fieldTypeText}>
                      {field.type === "text"
                        ? "Short Answer"
                        : field.type === "textarea"
                        ? "Long Answer"
                        : field.type === "radio"
                        ? "Single Choice"
                        : "Multiple Choice"}
                    </Text>

                    <Ionicons name="chevron-down" size={18} color="#666" />
                  </Pressable>
                </View>

                {/* Placeholder */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Placeholder</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Optional"
                    value={field.placeholder || ""}
                    onChangeText={(text) =>
                      updateField(index, { placeholder: text })
                    }
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Options */}
                {(field.type === "radio" || field.type === "checkbox") && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Options</Text>

                    {(field.options || []).map((opt, optionIndex) => (
                      <View key={optionIndex} style={styles.optionRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder={`Option ${optionIndex + 1}`}
                          value={opt}
                          onChangeText={(text) =>
                            updateOption(index, optionIndex, text)
                          }
                          placeholderTextColor="#999"
                        />

                        <Pressable
                          onPress={() => removeOption(index, optionIndex)}
                        >
                          <Ionicons
                            name="trash"
                            size={20}
                            color="#FF3B30"
                          />
                        </Pressable>
                      </View>
                    ))}

                    <Pressable
                      style={styles.addOptionButton}
                      onPress={() => addOption(index)}
                    >
                      <Ionicons name="add-circle" size={20} />
                      <Text style={styles.addOptionText}>Add Option</Text>
                    </Pressable>
                  </View>
                )}

                {/* Required */}
                <View style={styles.requiredContainer}>
                  <Text style={styles.label}>Required</Text>

                  <Switch
                    value={field.required}
                    onValueChange={(value) =>
                      updateField(index, { required: value })
                    }
                  />
                </View>
              </View>
            ))}

            {/* Add Field */}
            <Pressable style={styles.addFieldButton} onPress={addField}>
              <Ionicons name="add-circle" size={22} />
              <Text style={styles.addFieldText}>Add Field</Text>
            </Pressable>
          </ScrollView>

          {/* Hidden Picker Modal */}
          <Modal visible={activeFieldIndex !== null} transparent animationType="slide">
            <Pressable
              style={styles.pickerOverlay}
              onPress={() => setActiveFieldIndex(null)}
            />

            <View style={styles.pickerModal}>
              <Picker
                selectedValue={
                  activeFieldIndex !== null
                    ? fields[activeFieldIndex].type
                    : "text"
                }
                itemStyle={{ color: "#000000" }}   // ← critical fix
                onValueChange={(value) => {
                  if (activeFieldIndex !== null) {
                    updateField(activeFieldIndex, {
                      type: value,
                      options:
                        value === "radio" || value === "checkbox"
                          ? [""]
                          : [],
                    });
                  }
                }}
              >
                <Picker.Item label="Short Answer" value="text" color="#000000" />
                <Picker.Item label="Long Answer" value="textarea" color="#000000" />
                <Picker.Item label="Single Choice" value="radio" color="#000000" />
                <Picker.Item label="Multiple Choice" value="checkbox" color="#000000" />
              </Picker>

              <Pressable
                style={styles.doneButton}
                onPress={() => setActiveFieldIndex(null)}
              >
                <Text style={{ fontWeight: "600" }}>Done</Text>
              </Pressable>
            </View>
          </Modal>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text>Cancel</Text>
            </Pressable>

            <Pressable
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={{ color: "#fff" }}>Save</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  content: { padding: 16 },

  fieldCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    marginTop: 30,
    borderWidth: 1,
    borderColor: "#eee",
  },

  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  fieldIndex: {
    fontSize: 18,
    fontWeight: "600",
  },

  fieldGroup: { marginBottom: 14 },

  label: {
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },

  fieldTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
  },

  fieldTypeText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },

  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  pickerModal: {
    backgroundColor: "#fff",
    paddingBottom: 30,
  },

  doneButton: {
    alignItems: "center",
    paddingVertical: 12,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },

  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  addOptionText: {
    marginLeft: 6,
    fontWeight: "600",
  },

  requiredContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  addFieldButton: {
    marginTop: 35,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#000",
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  addFieldText: {
    fontWeight: "600",
  },

  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },

  cancelButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 8,
  },

  saveButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 8,
  },
});