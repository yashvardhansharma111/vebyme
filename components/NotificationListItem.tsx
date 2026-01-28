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
  showDivider?: boolean;
}

export default function NotificationListItem({
  interaction,
  userCache,
  onPress,
  showDivider = true,
}: NotificationListItemProps) {
  const cachedUser = userCache[interaction.source_user_id];
  const user = cachedUser || interaction.user;
  const userName = user?.name || 'Unknown';
  const userAvatar = user?.profile_image || null;

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
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        {/* Left: Avatar */}
        <Avatar uri={userAvatar} size={44} />

        {/* Center: Text */}
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            <Text style={styles.userName}>{userName}</Text>
            {' '}
            <Text style={styles.actionText}>{getInteractionText()}</Text>
          </Text>
        </View>

        {/* Right: Icon */}
        {getInteractionIcon() && (
          <Ionicons
            name={getInteractionIcon() as any}
            size={18}
            color="#8E8E93"
            style={styles.icon}
          />
        )}
      </View>

      {/* Bottom: Divider */}
      {showDivider && <View style={styles.divider} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  text: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  userName: {
    fontWeight: '600',
  },
  actionText: {
    fontWeight: '400',
    color: '#8E8E93',
  },
  icon: {
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginLeft: 76, // Avatar width (44) + marginLeft (12) + some padding
    marginRight: 20,
  },
});
