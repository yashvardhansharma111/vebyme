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
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

interface GroupDetails {
  group_id: string;
  group_name: string;
  plan: {
    plan_id: string;
    title: string;
    description?: string;
    media: any[];
    date?: string | null;
    time?: string | null;
    joins_count?: number;
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
  const insets = useSafeAreaInsets();
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
      router.replace('/(tabs)/chat' as any);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to close group');
      console.error('Error closing group:', error);
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
          <Ionicons name="chevron-back" size={24} color="#000" />
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
              style={[styles.headerAvatar, { marginLeft: idx > 0 ? -8 : 0, zIndex: 3 - idx }]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Plan Card: image, title, date|time, attendees pill only */}
        {groupDetails.plan && (
          <View style={styles.planCard}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Active Plan</Text>
            </View>
            <View style={styles.planContent}>
              {groupDetails.plan.media && groupDetails.plan.media.length > 0 && (
                <Image
                  source={{ uri: typeof groupDetails.plan.media[0] === 'string' ? groupDetails.plan.media[0] : groupDetails.plan.media[0].url }}
                  style={styles.planImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.planTitle}>{groupDetails.plan.title}</Text>
              <View style={styles.planMetaRow}>
                {(groupDetails.plan.date || groupDetails.plan.time) && (
                  <Text style={styles.planDateTime}>
                    {groupDetails.plan.date ? new Date(groupDetails.plan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    {groupDetails.plan.date && groupDetails.plan.time ? ' · ' : ''}
                    {groupDetails.plan.time || ''}
                  </Text>
                )}
                {(groupDetails.plan.joins_count ?? groupDetails.members.length) > 0 && (
                  <View style={styles.attendeesPill}>
                    <Text style={styles.attendeesPillText}>
                      {groupDetails.plan.joins_count ?? groupDetails.members.length} attendees
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* All Members - tap avatar/row to open profile */}
        <View style={styles.membersCard}>
          <View style={styles.membersBadge}>
            <Text style={styles.membersBadgeText}>All Members</Text>
          </View>
          <View style={styles.membersList}>
            {groupDetails.members.map((member) => (
              <TouchableOpacity
                key={member.user_id}
                style={styles.memberRow}
                onPress={() => {
                  if (member.user_id !== user?.user_id) {
                    router.push({ pathname: '/profile/[userId]', params: { userId: member.user_id } } as any);
                  }
                }}
                activeOpacity={member.user_id === user?.user_id ? 1 : 0.7}
                disabled={member.user_id === user?.user_id}
              >
                <Image
                  source={{ uri: member.profile_image || 'https://via.placeholder.com/50' }}
                  style={styles.memberAvatar}
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.user_id === user?.user_id ? 'You' : member.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Close Group Button - no reopen; once closed, group is closed permanently */}
      {isCreator && !groupDetails.is_closed && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCloseDialog(true)}
          >
            <Text style={styles.closeButtonText}>Close Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Close Dialog Modal with Blur */}
      <Modal
        visible={showCloseDialog}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCloseDialog(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Close group chat?</Text>
            <Text style={styles.dialogText}>
              This will permanently close the group. New messages will be disabled for everyone.
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogButtonClose}
                onPress={handleCloseGroup}
              >
                <Text style={styles.dialogButtonTextClose}>Close Group</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogButtonCancel}
                onPress={() => setShowCloseDialog(false)}
              >
                <Text style={styles.dialogButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F3F4F6',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
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
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  planCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  planBadge: {
    backgroundColor: '#374151',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  planContent: {
    position: 'relative',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  planDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  planImage: {
    width: '100%',
    height: 150,
    borderRadius: borderRadius.md,
  },
  membersCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 16,
  },
  membersBadge: {
    backgroundColor: '#374151',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  membersBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  membersList: {
    paddingVertical: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  planDateTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  attendeesPill: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  attendeesPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  closeButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
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
  dialogButtonClose: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  dialogButtonCancel: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  dialogButtonTextClose: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  dialogButtonTextCancel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

