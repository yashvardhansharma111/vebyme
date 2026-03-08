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
  FlatList,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export interface FormField {
  field_id: string;
  label: string;
  type:
    | "text"
    | "email"
    | "phone"
    | "number"
    | "select"
    | "textarea"
    | "checkbox"
    | "radio"
    | "date";
  placeholder?: string;
  options?: string[];
  required: boolean;
  order: number;
}

interface Form {
  form_id: string;
  name: string;
  description?: string;
  fields?: FormField[];
}

interface FormEditorProps {
  visible: boolean;
  form: Form | null;
  onSave: (form: Form) => void;
  onCancel: () => void;
  loading?: boolean;
}

type UiFieldType = "short" | "long" | "single" | "multiple";

const UI_FIELD_TYPE_LABEL: Record<UiFieldType, string> = {
  short: "Short Answer",
  long: "Long Answer",
  single: "Single Choice",
  multiple: "Multiple Choice",
};

const uiTypeFromInternal = (type: FormField["type"]): UiFieldType => {
  if (type === "textarea") return "long";
  if (type === "radio") return "single";
  if (type === "checkbox") return "multiple";
  return "short";
};

const internalTypeFromUi = (type: UiFieldType): FormField["type"] => {
  if (type === "long") return "textarea";
  if (type === "single") return "radio";
  if (type === "multiple") return "checkbox";
  return "text";
};

export default function FormEditor({
  visible,
  form,
  onSave,
  onCancel,
  loading = false,
}: FormEditorProps) {
  const [formName, setFormName] = useState(form?.name || "");
  const [formDescription, setFormDescription] = useState(form?.description || "");
  const [fields, setFields] = useState<FormField[]>(form?.fields || []);
  
  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}_${Math.random()}`,
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
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const addOption = (fieldIndex: number) => {
    const newFields = [...fields];
    const opts = newFields[fieldIndex].options || [];
    newFields[fieldIndex].options = [...opts, ""];
    setFields(newFields);
  };

  const updateOption = (
    fieldIndex: number,
    optionIndex: number,
    value: string,
  ) => {
    const newFields = [...fields];
    const opts = newFields[fieldIndex].options || [];
    // if user pasted comma separated values, split into multiple options
    if (value.includes(",")) {
      const parts = value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      // replace current index with first part, insert remaining after
      opts[optionIndex] = parts[0];
      const rest = parts.slice(1);
      if (rest.length > 0) {
        opts.splice(optionIndex + 1, 0, ...rest);
      }
    } else {
      opts[optionIndex] = value;
    }
    newFields[fieldIndex].options = opts;
    setFields(newFields);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...fields];
    const opts = newFields[fieldIndex].options || [];
    opts.splice(optionIndex, 1);
    newFields[fieldIndex].options = opts;
    setFields(newFields);
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [
      newFields[index],
      newFields[index - 1],
    ];
    setFields(newFields);
  };

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [
      newFields[index + 1],
      newFields[index],
    ];
    setFields(newFields);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      Alert.alert("Required", "Please enter a form name");
      return;
    }
    if (fields.length === 0) {
      Alert.alert("Required", "Please add at least one field");
      return;
    }
    
    const updatedForm: Form = {
      form_id: form?.form_id || "",
      name: formName.trim(),
      description: formDescription.trim(),
      fields: fields,
    };
    
    onSave(updatedForm);
  };

  React.useEffect(() => {
    if (visible && form) {
      setFormName(form.name);
      setFormDescription(form.description || "");
      setFields(form.fields || []);
    }
  }, [visible, form]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {/* Form Details Section */}
            <View style={styles.formDetailsCard}>
              <Text style={styles.sectionTitle}>Form Details</Text>
              
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Form Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Customer Feedback Form"
                  value={formName}
                  onChangeText={setFormName}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g., Collect feedback from customers about our service"
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Fields Section */}
            <Text style={styles.sectionTitle}>Form Fields</Text>
            
            {fields.map((field, index) => (
              <View key={field.field_id} style={styles.fieldCard}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldIndex}>{index + 1}</Text>
                  <View style={styles.fieldHeaderActions}>
                    <Pressable
                      onPress={() => moveFieldUp(index)}
                      disabled={index === 0}
                      style={[
                        styles.iconButton,
                        index === 0 && styles.disabledButton,
                      ]}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={20}
                        color={index === 0 ? "#ccc" : "#000000"}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => moveFieldDown(index)}
                      disabled={index === fields.length - 1}
                      style={[
                        styles.iconButton,
                        index === fields.length - 1 && styles.disabledButton,
                      ]}
                    >
                      <Ionicons
                        name="arrow-down"
                        size={20}
                        color={index === fields.length - 1 ? "#ccc" : "#000000"}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteField(index)}
                      style={styles.iconButton}
                    >
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

  <View style={styles.pickerContainer}>
    <Picker
      selectedValue={uiTypeFromInternal(field.type)}
      onValueChange={(value: UiFieldType) => {
        const internal = internalTypeFromUi(value);

        updateField(index, {
          type: internal,
          options:
            internal === "radio" || internal === "checkbox"
              ? field.options?.length
                ? field.options
                : [""]
              : [],
        });
      }}
      mode="dropdown"
    >
      <Picker.Item label="Short Answer" value="short" />
      <Picker.Item label="Long Answer" value="long" />
      <Picker.Item label="Single Choice" value="single" />
      <Picker.Item label="Multiple Choice" value="multiple" />
    </Picker>
  </View>
</View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Placeholder (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Enter your full name"
                    value={field.placeholder || ""}
                    onChangeText={(text) =>
                      updateField(index, { placeholder: text })
                    }
                    placeholderTextColor="#999"
                  />
                </View>

                {(field.type === "checkbox" || field.type === "radio") && (
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
                          style={styles.optionRemove}
                        >
                          <Ionicons name="trash" size={20} color="#FF3B30" />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      onPress={() => addOption(index)}
                      style={styles.addOptionButton}
                    >
                      <Ionicons name="add-circle" size={20} color="#000000" />
                      <Text style={styles.addOptionText}>Add Option</Text>
                    </Pressable>
                    <Text style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                      You can also paste comma-separated values; commas will be
                      preserved.
                    </Text>
                  </View>
                )}

                <View style={styles.requiredContainer}>
                  <Text style={styles.label}>Required</Text>
                  <Switch
                    value={field.required}
                    onValueChange={(value) =>
                      updateField(index, { required: value })
                    }
                    trackColor={{ false: "#ddd", true: "#81C784" }}
                    thumbColor={"#fff"}
                  />
                </View>
              </View>
            ))}

            <Pressable onPress={addField} style={styles.addFieldButton}>
              <Ionicons name="add-circle" size={24} color="#000000" />
              <Text style={styles.addFieldButtonText}>Add Field</Text>
            </Pressable>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footerButtonContainer}>
            <Pressable
              onPress={onCancel}
              style={[styles.footerButton, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={loading}
              style={[
                styles.footerButton,
                styles.saveButtonContainer,
                loading && styles.disabledButton,
              ]}
            >
              <Text style={[styles.saveButtonText]}>
                {loading ? "Saving..." : "Save Changes"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Field Type Modal */}
      {/* <Modal
        visible={showFieldTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFieldTypeModal(false)}
      >
        <View style={styles.fieldTypeOverlay}>
          <TouchableOpacity 
            style={styles.fieldTypeBackdrop}
            activeOpacity={1}
            onPress={() => setShowFieldTypeModal(false)}
          />
          <View style={styles.fieldTypeContainer}>
            <View style={styles.fieldTypeHeader}>
              <TouchableOpacity
                onPress={() => setShowFieldTypeModal(false)}
                style={styles.fieldTypeCancelButton}
              >
                <Text style={styles.fieldTypeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.fieldTypeTitle}>Select Field Type</Text>
              <View style={styles.fieldTypeSpacer} />
            </View>
            
            <ScrollView style={styles.fieldTypeList}>
              {(Object.keys(UI_FIELD_TYPE_LABEL) as UiFieldType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.fieldTypeOption}
                  onPress={() => selectFieldType(type)}
                >
                  <Text style={styles.fieldTypeOptionText}>
                    {UI_FIELD_TYPE_LABEL[type]}
                  </Text>
                  {selectedFieldIndex !== null && 
                   uiTypeFromInternal(fields[selectedFieldIndex].type) === type && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal> */}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  formDetailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
  },
  footerButtonContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButtonContainer: {
    backgroundColor: "#000000",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  fieldCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fieldIndex: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  fieldHeaderActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  requiredContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addFieldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#000000",
    borderRadius: 8,
    borderStyle: "dashed",
    marginBottom: 16,
    gap: 8,
  },
  addFieldButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  optionRemove: {
    marginLeft: 8,
    padding: 4,
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addOptionText: {
    marginLeft: 4,
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
  },
  // Field type selector styles
  fieldTypeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
  },
  fieldTypeSelectorText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  // Field type modal styles
  fieldTypeOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  fieldTypeBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fieldTypeContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 320,
    maxHeight: 300,
    overflow: "hidden",
  },
  fieldTypeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  fieldTypeCancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  fieldTypeCancelText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  fieldTypeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  fieldTypeSpacer: {
    width: 60,
  },
  fieldTypeList: {
    flex: 1,
  },
  fieldTypeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  fieldTypeOptionText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "400",
  },
});
