import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

interface NotificationListItemProps {
  interaction: {
    notification_id: string;
    type: 'comment' | 'reaction' | 'join' | 'repost' | 'message';
    source_user_id: string;
    user?: {
      user_id: string;
      name: string;
      profile_image?: string;
    };
    payload?: any;
    created_at: string;
  };
  userCache: { [key: string]: { name: string; profile_image: string | null } };
  onPress?: () => void;
  onUserPress?: (userId: string) => void;
  showDivider?: boolean;
  /** Optional plan/event title to show below the action (e.g. "Sunday Run") */
  planTitle?: string | null;
  /** Optional relative time to show on the right (e.g. "2h", "Yesterday") */
  timeLabel?: string;
}

export default function NotificationListItem({
  interaction,
  userCache,
  onPress,
  onUserPress,
  showDivider = true,
  planTitle,
  timeLabel,
}: NotificationListItemProps) {
  const cachedUser = userCache[interaction.source_user_id];
  const user = cachedUser || interaction.user;
  const userName = user?.name || 'Unknown';
  const userAvatar = (user as any)?.profile_image || null;

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress(interaction.source_user_id);
      return;
    }
    onPress?.();
  };

  const getInteractionText = () => {
    // Check if payload has custom notification text
    if (interaction.payload?.notification_text) {
      return interaction.payload.notification_text;
    }
    
    switch (interaction.type) {
      case 'comment':
        return 'commented';
      case 'reaction':
        return 'reacted';
      case 'join':
        return 'joined';
      case 'repost':
        return 'reposted';
      case 'message':
        return 'sent a message';
      default:
        return 'interacted';
    }
  };

  const getInteractionIcon = () => {
    const text = (interaction.payload?.notification_text || '').toLowerCase();
    if (text.includes('booking')) return 'document-text-outline';
    if (text.includes('shared') || text.includes('invited')) return 'paper-plane-outline';
    switch (interaction.type) {
      case 'comment':
        return 'chatbubble-outline';
      case 'reaction':
        return 'heart-outline';
      case 'join':
        return 'person-add-outline';
      case 'repost':
        return 'repeat-outline';
      case 'message':
        return 'mail-outline';
      default:
        return 'document-text-outline';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onUserPress ? handleUserPress : onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
          <Avatar uri={userAvatar} size={44} />
        </TouchableOpacity>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.text} numberOfLines={2}>
            <Text style={styles.userName} onPress={handleUserPress}>
              {userName}
            </Text>
            {' '}
            <Text style={styles.actionText}>{getInteractionText()}</Text>
            {planTitle ? ` on ${planTitle}` : ''}
          </Text>
        </View>

        {/* Right: Time or icon */}
        {timeLabel !== undefined && timeLabel !== '' ? (
          <Text style={styles.timeRight}>{timeLabel}</Text>
        ) : getInteractionIcon() ? (
          <Ionicons
            name={getInteractionIcon() as any}
            size={20}
            color="#8E8E93"
            style={styles.icon}
          />
        ) : null}
      </View>

      {/* Bottom: Divider */}
      {showDivider && <View style={styles.divider} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  text: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22,
  },
  userName: {
    fontWeight: '600',
  },
  actionText: {
    fontWeight: '400',
    color: '#8E8E93',
  },
  timeRight: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
  },
  icon: {
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 20,
    marginRight: 20,
  },
});
