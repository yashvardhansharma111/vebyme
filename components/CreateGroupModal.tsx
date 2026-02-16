import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

export interface CreateGroupUser {
  user_id: string;
  name: string;
  profile_image: string | null;
}

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  users: CreateGroupUser[];
  defaultGroupName: string;
  onCreateGroup: (groupName: string, selectedUserIds: string[]) => Promise<void>;
}

export default function CreateGroupModal({
  visible,
  onClose,
  users,
  defaultGroupName,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState(defaultGroupName);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(users.map((u) => u.user_id)));
  const [loading, setLoading] = useState(false);

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.user_id)));
    }
  };

  const handleCreate = async () => {
    const name = groupName.trim() || defaultGroupName;
    const ids = Array.from(selectedIds);
    if (ids.length < 2) return;
    setLoading(true);
    try {
      await onCreateGroup(name, ids);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.content} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <View style={styles.groupNameRow}>
              <View style={styles.bicycleIcon}>
                <Ionicons name="bicycle-outline" size={22} color="#1C1C1E" />
              </View>
              <TextInput
                style={styles.groupNameInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name"
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>

          <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
            {users.map((u) => {
              const isSelected = selectedIds.has(u.user_id);
              return (
                <TouchableOpacity
                  key={u.user_id}
                  style={styles.userRow}
                  onPress={() => toggleUser(u.user_id)}
                  activeOpacity={0.7}
                >
                  <Avatar uri={u.profile_image} size={40} />
                  <Text style={styles.userName}>{u.name}</Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAll} activeOpacity={0.7}>
              <Text style={styles.selectAllText}>Select All</Text>
              <View style={[styles.checkbox, selectedIds.size === users.length && styles.checkboxSelected]}>
                {selectedIds.size === users.length && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          </ScrollView>

          {selectedIds.size > 0 && selectedIds.size < 2 && (
            <Text style={styles.minMembersHint}>Select at least 2 people to create a group</Text>
          )}
          <TouchableOpacity
            style={[styles.createButton, (loading || selectedIds.size < 2) && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading || selectedIds.size < 2}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create group</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  headerRow: {
    marginBottom: 16,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bicycleIcon: {
    marginRight: 10,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    padding: 0,
  },
  userList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  userName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 14,
  },
  selectAllText: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '600',
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  minMembersHint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
