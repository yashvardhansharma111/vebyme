import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Avatar from './Avatar';

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
      <Text style={styles.title} numberOfLines={2}>{postTitle}</Text>

      {/* Description – truncate to 3 lines */}
      <Text style={styles.description} numberOfLines={3}>{postText}</Text>

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

      {/* View Ticket Distribution - only button */}
      {post?.plan_id && (
        <TouchableOpacity
          style={styles.viewTicketDistributionButton}
          onPress={(e) => {
            e.stopPropagation();
            if (onPress) onPress();
            else router.push({ pathname: '/business-plan/[planId]', params: { planId: post.plan_id } } as any);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.viewTicketDistributionButtonText}>View Ticket Distribution</Text>
        </TouchableOpacity>
      )}
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
    fontSize: 20,
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
  viewTicketDistributionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  viewTicketDistributionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
