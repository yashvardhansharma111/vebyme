import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

interface NotificationCardProps {
  post_id: string;
  post: {
    plan_id: string;
    title: string;
    description: string;
    category_main?: string;
    category_sub?: string[];
    location_text?: string;
    add_details?: Array<{ detail_type: string; title?: string; description?: string }>;
    passes?: Array<{ pass_id: string; name: string; price: number; description?: string; capacity?: number }>;
  } | null;
  interactions: Interaction[];
  created_at: string;
  userCache: { [key: string]: { name: string; profile_image: string | null } };
  onPress?: () => void;
  onUserPress?: (userId: string) => void;
}

// Build at most 4 event tags: price, distance, f&b, location (same as BusinessCard). Fallback: category_main + category_sub.
function buildEventTags(post: NotificationCardProps['post']): string[] {
  if (!post) return [];
  const passes = post.passes || [];
  const prices = passes.filter((p: { price: number }) => p.price > 0).map((p: { price: number }) => p.price);
  const firstPrice = prices.length > 0 ? Math.min(...prices) : null;
  const addDetails = post.add_details || [];
  const detailByType = (type: string) => addDetails.find((d: { detail_type: string }) => d.detail_type === type);
  const distanceLabel = detailByType('distance')?.title || detailByType('distance')?.description;
  const fbLabel = detailByType('f&b')?.title || detailByType('f&b')?.description;
  const locationLabel = post.location_text?.trim();
  const tags: string[] = [];
  if (firstPrice != null && firstPrice > 0) tags.push(`₹${firstPrice}`);
  if (distanceLabel) tags.push(distanceLabel);
  if (fbLabel) tags.push(fbLabel);
  if (locationLabel) tags.push(locationLabel);
  if (tags.length > 0) return tags.slice(0, 4);
  const fallback: string[] = [];
  if (post.category_main) fallback.push(post.category_main);
  if (post.category_sub?.length) fallback.push(...post.category_sub);
  return fallback.slice(0, 4);
}

export default function NotificationCard({
  post_id,
  post,
  interactions,
  created_at,
  userCache,
  onPress,
  onUserPress,
}: NotificationCardProps) {
  const router = useRouter();

  const displayInteractions = interactions.filter((i) => i.type !== 'comment');
  
  const uniqueInteractions = displayInteractions.filter((interaction, index, self) =>
    index === self.findIndex((i) => i.source_user_id === interaction.source_user_id)
  );
  
  const avatars = uniqueInteractions
    .slice(0, 3)
    .map((i) => i.user?.profile_image || userCache[i.source_user_id]?.profile_image || null);
  const remainingCount = Math.max(0, uniqueInteractions.length - 3);
  
  const postText = post?.description || post?.title || 'Post interaction';
  const postTitle = post?.title || 'Untitled Plan';
  const interactionCount = displayInteractions.length;
  const eventTags = buildEventTags(post);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to post details or plan page
      router.push({
        pathname: '/plan/[planId]',
        params: { planId: post?.plan_id || post_id },
      } as any);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header with Date */}
      <View style={styles.headerTop}>
        <Text style={styles.date}>{formatDate(created_at)}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{postTitle}</Text>

      {/* Description */}
      <Text style={styles.description}>{postText}</Text>

      {/* Tags - only 4: price, location, f&b, +1 (e.g. distance) */}
      {eventTags.length > 0 && (
        <View style={styles.tagsContainer}>
          {eventTags.map((tag, idx) => (
            <Tag key={idx} label={tag} />
          ))}
        </View>
      )}

      {/* Interactions List - tap name to open profile */}
      <View style={styles.interactionsList}>
        {displayInteractions.slice(0, 3).map((interaction) => {
          const cachedUser = userCache[interaction.source_user_id];
          const user = cachedUser || interaction.user;
          const userName = user?.name || 'Unknown';
          const userAvatar = user?.profile_image || null;
          const handleUserPress = () => {
            if (interaction.source_user_id) {
              if (onUserPress) onUserPress(interaction.source_user_id);
              else router.push({ pathname: '/profile/[userId]', params: { userId: interaction.source_user_id } } as any);
            }
          };
          return (
            <TouchableOpacity
              key={interaction.notification_id}
              style={styles.interactionRow}
              onPress={handleUserPress}
              activeOpacity={0.7}
            >
              <Avatar uri={userAvatar} size={28} />
              <Ionicons
                name={
                  interaction.type === 'reaction' ? 'heart-outline' :
                  interaction.type === 'join' ? 'person-add-outline' :
                  'repeat-outline'
                }
                size={16}
                color="#1C1C1E"
                style={styles.interactionIcon}
              />
              <Text style={styles.interactionText}>
                {userName} {interaction.type === 'reaction' ? 'reacted' :
                           interaction.type === 'join' ? 'joined' : 'reposted'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Create Group Button */}
      <TouchableOpacity
        style={styles.createGroupButton}
        onPress={(e) => {
          e.stopPropagation();
          if (onPress) {
            onPress();
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.createGroupButtonText}>Create group</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  interactionsList: {
    marginBottom: 20,
    marginTop: 4,
  },
  interactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
    gap: 8,
  },
  interactionIcon: {
    marginLeft: 8,
    width: 18,
  },
  interactionText: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
    fontWeight: '500',
  },
  createGroupButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
