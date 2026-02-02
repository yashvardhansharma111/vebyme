import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Avatar from './Avatar';
import Tag from './Tag';

interface Interaction {
  notification_id: string;
  type: 'comment' | 'reaction' | 'join' | 'repost';
  source_user_id: string;
  user?: {
    user_id: string;
    name: string;
    profile_image?: string;
  };
  created_at: string;
}

interface GroupedPlanCardProps {
  post_id: string;
  post: {
    plan_id: string;
    title: string;
    description: string;
    category_main?: string;
    category_sub?: string[];
  } | null;
  interactions: Interaction[];
  created_at: string;
  userCache: { [key: string]: { name: string; profile_image: string | null } };
  onExpand?: () => void;
  onCreateGroup?: () => void;
  isExpanded?: boolean;
  index?: number; // For stacking offset effect
  showInteractions?: boolean; // Only show interactions in Level 3
}

export default function GroupedPlanCard({
  post_id,
  post,
  interactions,
  created_at,
  userCache,
  onExpand,
  onCreateGroup,
  isExpanded = false,
  index = 0,
  showInteractions = false,
}: GroupedPlanCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(isExpanded);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Sync with prop changes and animate
  useEffect(() => {
    if (isExpanded !== expanded) {
      LayoutAnimation.configureNext({
        duration: 300,
        create: { type: 'easeInEaseOut', property: 'opacity' },
        update: { type: 'easeInEaseOut' },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
      });
      setExpanded(isExpanded);
    }
  }, [isExpanded, expanded]);

  const uniqueInteractions = interactions.filter((interaction, idx, self) =>
    idx === self.findIndex((i) => i.source_user_id === interaction.source_user_id)
  );

  // Get unique user avatars for stacked display (up to 3)
  const avatarUsers = uniqueInteractions.slice(0, 3);
  const avatars = avatarUsers.map((i) => 
    i.user?.profile_image || userCache[i.source_user_id]?.profile_image || null
  );
  const remainingCount = Math.max(0, uniqueInteractions.length - 3);

  const postText = post?.description || post?.title || 'Post interaction';
  const postTitle = post?.title || 'Untitled Plan';
  const interactionCount = interactions.length;

  // Truncate description for collapsed view
  const shortDescription = postText.length > 100 
    ? postText.substring(0, 100) + '...' 
    : postText;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const handleToggleExpand = () => {
    // Always use the onExpand callback to let parent control the state
    if (onExpand) {
      onExpand();
    } else {
      // Fallback if no callback provided
      const newExpanded = !expanded;
      setExpanded(newExpanded);
    }
  };

  const handleCreateGroup = (e: any) => {
    e.stopPropagation();
    if (onCreateGroup) {
      onCreateGroup();
    }
  };

  const getInteractionText = (type: string) => {
    switch (type) {
      case 'comment':
        return 'commented';
      case 'reaction':
        return 'reacted';
      case 'join':
        return 'joined';
      case 'repost':
        return 'reposted';
      default:
        return 'interacted';
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return 'chatbubble-outline';
      case 'reaction':
        return 'heart-outline';
      case 'join':
        return 'person-add-outline';
      case 'repost':
        return 'repeat-outline';
      default:
        return null;
    }
  };

  // Stacking offset effect
  const cardOffset = index * 4;

  return (
    <View style={[styles.cardContainer, { marginLeft: cardOffset, marginRight: -cardOffset }]}>
      <TouchableOpacity
        style={[styles.card, expanded && styles.cardExpanded]}
        onPress={handleToggleExpand}
        activeOpacity={0.9}
      >
        {/* Numeric Badge */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{interactionCount}</Text>
        </View>

        {/* Expand/Collapse Icon */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={handleToggleExpand}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#8E8E93"
          />
        </TouchableOpacity>

        {/* Plan Title + Date row (Level 3: date on right); extra right padding when avatars shown (Level 2) */}
        <View style={[styles.titleRow, !showInteractions && styles.titleRowWithAvatars]}>
          <Text style={styles.title} numberOfLines={1}>
            {postTitle}
          </Text>
          {expanded && showInteractions && (
            <Text style={styles.dateInline}>{formatDate(created_at)}</Text>
          )}
        </View>

        {/* Description - Show in Level 2 (collapsed) and Level 3 (expanded) */}
        <Text style={styles.description} numberOfLines={expanded && showInteractions ? undefined : 2}>
          {postText}
        </Text>

        {/* Stacked Avatars - Level 2 only (top-right); do NOT show in Level 3 */}
        {!showInteractions && (
          <View style={styles.avatarsContainerTopRight}>
            {avatars.map((avatar, idx) => (
              <View
                key={idx}
                style={[
                  styles.avatarWrapper,
                  { zIndex: avatars.length - idx },
                  idx > 0 && { marginLeft: -12 },
                ]}
              >
                <Avatar uri={avatar} size={32} />
              </View>
            ))}
            {remainingCount > 0 && (
              <View
                style={[
                  styles.avatarWrapper,
                  styles.avatarOverlay,
                  { marginLeft: -12, zIndex: 0 },
                ]}
              >
                <View style={styles.overlayBadge}>
                  <Text style={styles.overlayBadgeText}>+{remainingCount}</Text>
                </View>
                <Avatar uri={null} size={32} />
              </View>
            )}
          </View>
        )}

        {/* Tags - Show in Level 2 (collapsed) and Level 3 (expanded) */}
        {(post?.category_main || post?.category_sub?.length) && (
          <View style={styles.tagsContainer}>
            {post?.category_main && (
              <Tag label={post.category_main} />
            )}
            {post?.category_sub?.slice(0, 2).map((tag, idx) => (
              <Tag key={idx} label={tag} />
            ))}
          </View>
        )}

        {/* Expanded Content: Individual Interactions (Level 3 only) */}
        {expanded && showInteractions && (
          <View style={styles.expandedContent}>
            {[...interactions]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((interaction) => {
              const cachedUser = userCache[interaction.source_user_id];
              const user = cachedUser || interaction.user;
              const userName = user?.name || 'Unknown';
              const userAvatar = user?.profile_image || null;
              const iconName = getInteractionIcon(interaction.type);
              
              return (
                <View key={interaction.notification_id} style={styles.interactionRow}>
                  <Avatar uri={userAvatar} size={36} />
                  <View style={styles.interactionContent}>
                    <Text style={styles.interactionText}>
                      <Text style={styles.interactionUserName}>{userName}</Text>
                      {' '}
                      <Text style={styles.interactionAction}>
                        {getInteractionText(interaction.type)}
                      </Text>
                    </Text>
                  </View>
                  {iconName && (
                    <Ionicons
                      name={iconName as any}
                      size={18}
                      color="#8E8E93"
                      style={styles.interactionIcon}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Create Group Button (only when expanded in Level 3) */}
        {expanded && showInteractions && (
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={handleCreateGroup}
            activeOpacity={0.8}
          >
            <Text style={styles.createGroupButtonText}>Create group</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    marginBottom: 12,
  },
  cardExpanded: {
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  badgeContainer: {
    position: 'absolute',
    left: 16,
    top: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expandButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
    paddingRight: 40, // Space for expand button
    gap: 8,
  },
  titleRowWithAvatars: {
    paddingRight: 116, // Space for stacked avatars (3×32 - overlap) + expand button
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  dateInline: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
  },
  description: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    marginBottom: 12,
  },
  avatarsContainerTopRight: {
    position: 'absolute',
    top: 16,
    right: 44, // Left of expand chevron
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  avatarWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarOverlay: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBadge: {
    position: 'absolute',
    zIndex: 1,
  },
  overlayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  expandedContent: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  interactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  interactionContent: {
    flex: 1,
    marginLeft: 12,
  },
  interactionText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  interactionUserName: {
    fontWeight: '600',
  },
  interactionAction: {
    fontWeight: '400',
    color: '#8E8E93',
  },
  interactionIcon: {
    marginLeft: 8,
  },
  createGroupButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
