import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

interface GroupDetails {
  group_id: string;
  group_name: string;
  plan: {
    plan_id: string;
    title: string;
    description: string;
    media: any[];
  } | null;
  members: Array<{
    user_id: string;
    name: string;
    profile_image: string;
  }>;
  is_closed: boolean;
  created_by: string;
}

export default function GroupDetailsScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
    }
  }, [groupId]);

  const loadGroupDetails = async () => {
    if (!groupId) return;
    
    try {
      const response = await apiService.getGroupDetails(groupId);
      if (response.data) {
        setGroupDetails(response.data);
      }
    } catch (error: any) {
      console.error('Error loading group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseGroup = async () => {
    if (!groupId || !user?.user_id) return;

    try {
      await apiService.closeGroup(groupId, user.user_id);
      setShowCloseDialog(false);
      await loadGroupDetails();
      Alert.alert('Success', 'Group chat has been closed');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to close group');
      console.error('Error closing group:', error);
    }
  };

  const handleReopenGroup = async () => {
    if (!groupId || !user?.user_id) return;

    try {
      await apiService.reopenGroup(groupId, user.user_id);
      await loadGroupDetails();
      Alert.alert('Success', 'Group chat has been reopened');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to reopen group');
      console.error('Error reopening group:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!groupDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCreator = groupDetails.created_by === user?.user_id;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupDetails.group_name}
          </Text>
          <Text style={styles.headerSubtitle}>{groupDetails.members.length} members</Text>
        </View>
        <View style={styles.headerAvatars}>
          {groupDetails.members.slice(0, 3).map((member, idx) => (
            <Image
              key={member.user_id}
              source={{ uri: member.profile_image || 'https://via.placeholder.com/30' }}
              style={[styles.headerAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Plan Card */}
        {groupDetails.plan && (
          <View style={styles.planCard}>
            <Text style={styles.planCardLabel}>Active Plan</Text>
            <View style={styles.planContent}>
              <Text style={styles.planTitle}>{groupDetails.plan.title}</Text>
              <Text style={styles.planDescription} numberOfLines={3}>
                {groupDetails.plan.description}
              </Text>
              {groupDetails.plan.media && groupDetails.plan.media.length > 0 && (
                <Image
                  source={{ uri: groupDetails.plan.media[0].url }}
                  style={styles.planImage}
                  resizeMode="cover"
                />
              )}
            </View>
          </View>
        )}

        {/* All Members */}
        <View style={styles.membersCard}>
          <Text style={styles.membersTitle}>All Members</Text>
          <View style={styles.membersGrid}>
            {groupDetails.members.map((member) => (
              <View key={member.user_id} style={styles.memberItem}>
                <Image
                  source={{ uri: member.profile_image || 'https://via.placeholder.com/50' }}
                  style={styles.memberAvatar}
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.user_id === user?.user_id ? 'You' : member.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Close Group Button */}
      {isCreator && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (groupDetails.is_closed) {
                handleReopenGroup();
              } else {
                setShowCloseDialog(true);
              }
            }}
          >
            <Text style={styles.closeButtonText}>
              {groupDetails.is_closed ? 'Reopen Group' : 'Close Group'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Close Dialog */}
      {showCloseDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Close group chat?</Text>
            <Text style={styles.dialogText}>
              New messages will be disabled for everyone. Existing messages stay visible. You can
              re-open the chat anytime in Settings.
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonClose]}
                onPress={handleCloseGroup}
              >
                <Text style={styles.dialogButtonTextClose}>Close Group</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowCloseDialog(false)}
              >
                <Text style={styles.dialogButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerAvatars: {
    flexDirection: 'row',
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  planCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 16,
  },
  planCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  planContent: {
    position: 'relative',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  planImage: {
    width: '100%',
    height: 150,
    borderRadius: borderRadius.md,
  },
  membersCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  memberItem: {
    width: '30%',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 12,
    color: Colors.light.text,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  closeButton: {
    backgroundColor: Colors.light.error,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: borderRadius.lg,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  dialogText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    padding: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dialogButtonClose: {
    backgroundColor: Colors.light.error,
  },
  dialogButtonCancel: {
    backgroundColor: '#2C2C2E',
  },
  dialogButtonTextClose: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dialogButtonTextCancel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

