import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import CreateGroupModal, { CreateGroupUser } from './CreateGroupModal';

interface Interaction {
  notification_id: string;
  type: 'comment' | 'reaction' | 'join' | 'repost';
  source_user_id: string;
  user?: { user_id: string; name: string; profile_image?: string };
  payload?: any;
  created_at: string;
}

interface NormalUserEventCardProps {
  post_id: string;
  post: {
    plan_id: string;
    title: string;
    description?: string;
    media?: any[];
    category_main?: string;
    category_sub?: string[];
  } | null;
  interactions: Interaction[];
  created_at: string;
  userCache: { [key: string]: { name: string; profile_image: string | null } };
  isExpanded: boolean;
  onExpand: () => void;
  onUserPress: (userId: string) => void;
  formatRelativeTime: (dateStr: string) => string;
  hideCountBadge?: boolean;
  /** Start individual chat with this user (opens chat screen) */
  onStartChat?: (otherUserId: string) => void;
  /** Create group with selected users; called with groupName and selected user ids */
  onCreateGroup?: (params: { groupName: string; memberIds: string[] }) => Promise<void>;
  currentUserId?: string;
}

function getTagIcon(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes('hitchhik') || t.includes('travel') || t.includes('road')) return 'car-outline';
  if (t.includes('weekend') || t.includes('week')) return 'checkmark-circle-outline';
  if (t.includes('evening') || t.includes('night')) return 'cloudy-night-outline';
  if (t.includes('run') || t.includes('sport') || t.includes('fitness')) return 'fitness-outline';
  if (t.includes('music') || t.includes('concert')) return 'musical-notes-outline';
  if (t.includes('coffee') || t.includes('brunch') || t.includes('food')) return 'cafe-outline';
  return 'pricetag-outline';
}

function getActionLabel(type: string): string {
  switch (type) {
    case 'comment': return 'commented';
    case 'reaction': return 'reacted';
    case 'join': return 'joined';
    case 'repost': return 'reposted';
    default: return 'interacted';
  }
}

export default function NormalUserEventCard({
  post_id,
  post,
  interactions,
  created_at,
  userCache,
  isExpanded,
  onExpand,
  onUserPress,
  formatRelativeTime,
  hideCountBadge = false,
  onStartChat,
  onCreateGroup,
  currentUserId,
}: NormalUserEventCardProps) {
  const router = useRouter();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);

  const planId = post?.plan_id || post_id;
  const title = post?.title || 'Event';
  const description = post?.description || '';
  const mediaFirst = post?.media?.[0];
  const imageUrl = typeof mediaFirst === 'string' ? mediaFirst : mediaFirst?.url;
  const categoryMain = post?.category_main;
  const categorySub = post?.category_sub ?? [];
  const tags = [...(categoryMain ? [categoryMain] : []), ...categorySub].slice(0, 3);

  const uniqueByUser = interactions.filter(
    (interaction, index, self) =>
      index === self.findIndex((i) => i.source_user_id === interaction.source_user_id)
  );
  const avatars = uniqueByUser
    .slice(0, 3)
    .map((i) => i.user?.profile_image || userCache[i.source_user_id]?.profile_image || null);
  const count = interactions.length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    return `${d}/${m}/${y}`;
  };

  const createGroupUsers: CreateGroupUser[] = useMemo(() => {
    const seen = new Set<string>();
    return interactions
      .filter((i) => i.source_user_id && i.source_user_id !== currentUserId && !seen.has(i.source_user_id))
      .map((i) => {
        seen.add(i.source_user_id);
        const u = userCache[i.source_user_id] || i.user;
        return {
          user_id: i.source_user_id,
          name: u?.name || 'Unknown',
          profile_image: (u as any)?.profile_image ?? null,
        };
      });
  }, [interactions, userCache, currentUserId]);

  const handleRowPress = (interaction: Interaction) => {
    if (interaction.type === 'comment') {
      setExpandedCommentId((prev) =>
        prev === interaction.notification_id ? null : interaction.notification_id
      );
    } else if (planId) {
      router.push({ pathname: '/business-plan/[planId]', params: { planId } } as any);
    }
  };

  const getCommentText = (interaction: Interaction) =>
    interaction.payload?.comment_text ??
    interaction.payload?.content ??
    interaction.payload?.text ??
    'No comment text';

  const handleCreateGroupSubmit = async (groupName: string, memberIds: string[]) => {
    if (!onCreateGroup) return;
    await onCreateGroup({ groupName, memberIds });
  };

  const handlePress = () => {
    onExpand();
  };

  return (
    <View style={styles.outer}>
      <TouchableOpacity
        style={[styles.card, isExpanded && styles.cardExpanded]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* 2nd state: Unread notification counter in upper left */}
        {!isExpanded && !hideCountBadge && count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{count > 99 ? '99+' : String(count)}</Text>
          </View>
        )}

        {!isExpanded ? (
          <>
            {/* Title, then description below; DPs on right */}
            <View style={styles.contentRow}>
              <View style={styles.textBlock}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {description || ' '}
                </Text>
              </View>
              <View style={styles.avatarsRow}>
                {avatars.map((uri, idx) => (
                  <View key={idx} style={[styles.avatarWrap, idx > 0 && { marginLeft: -10 }]}>
                    <Avatar uri={uri} size={36} />
                  </View>
                ))}
                {uniqueByUser.length > 3 && (
                  <View style={[styles.avatarWrap, { marginLeft: -10 }]}>
                    <View style={styles.moreAvatar}>
                      <Text style={styles.moreAvatarText}>+{uniqueByUser.length - 3}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            {/* Tags with icons at bottom */}
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagPill}>
                    <Ionicons name={getTagIcon(tag) as any} size={14} color="#1C1C1E" style={styles.tagIcon} />
                    <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Third state: Title (left) + Date (right) */}
            <View style={styles.titleDateRow}>
              <Text style={styles.expandedTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.expandedDate}>{formatDateShort(created_at)}</Text>
            </View>
            {/* Description */}
            <Text style={styles.expandedDescription}>
              {description?.trim().replace(/\s*vybeme!?\s*$/i, '').trim() || ''}
              {description ? ' ' : ''}
              <Text style={styles.vybemeBold}>vybeme!</Text>
            </Text>
            {/* Tags with icons */}
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagPill}>
                    <Ionicons name={getTagIcon(tag) as any} size={14} color="#1C1C1E" style={styles.tagIcon} />
                    <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* User engagement list: DP + name + action, chat icon on right; comment expands inline */}
            <View style={styles.engagementsSection}>
              {interactions.map((interaction, index) => {
                const u = userCache[interaction.source_user_id] || interaction.user;
                const userName = u?.name || 'Unknown';
                const userAvatar = (u as any)?.profile_image ?? null;
                const actionLabel = getActionLabel(interaction.type);
                const isCommentExpanded =
                  interaction.type === 'comment' &&
                  expandedCommentId === interaction.notification_id;
                return (
                  <View
                    key={interaction.notification_id}
                    style={index < interactions.length - 1 ? styles.engagementRowBorder : undefined}
                  >
                    <TouchableOpacity
                      style={styles.engagementRow}
                      onPress={() => handleRowPress(interaction)}
                      activeOpacity={0.7}
                    >
                      <Avatar uri={userAvatar} size={40} />
                      <View style={styles.engagementText}>
                        <Text style={styles.engagementName} numberOfLines={1}>{userName}</Text>
                        <Text style={styles.engagementAction}>{actionLabel}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.chatIconBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (onStartChat) onStartChat(interaction.source_user_id);
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Ionicons name="chatbubble-outline" size={22} color="#1C1C1E" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {isCommentExpanded && (
                      <View style={styles.commentExpanded}>
                        <Text style={styles.commentExpandedText}>{getCommentText(interaction)}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            {/* Create group button */}
            {onCreateGroup && createGroupUsers.length > 0 && (
              <TouchableOpacity
                style={styles.createGroupButton}
                onPress={() => setShowCreateGroupModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.createGroupButtonText}>Create group</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>

      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        users={createGroupUsers}
        defaultGroupName={`${title} Group`}
        onCreateGroup={handleCreateGroupSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 12,
    overflow: 'visible',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardExpanded: {
    paddingBottom: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 10,
  },
  unreadBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 18,
  },
  moreAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E8ED',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  tagIcon: {
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1C1C1E',
    maxWidth: 100,
  },
  titleDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  expandedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 12,
  },
  expandedDate: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  expandedDescription: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 12,
  },
  vybemeBold: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  engagementsSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  engagementRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  commentExpanded: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 52,
    backgroundColor: '#F8F8FA',
    borderLeftWidth: 3,
    borderLeftColor: '#E5E5EA',
  },
  commentExpandedText: {
    fontSize: 14,
    color: '#3b3c3d',
    lineHeight: 20,
  },
  engagementText: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  engagementName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  engagementAction: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  chatIconBtn: {
    padding: 8,
  },
  createGroupButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
