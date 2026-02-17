import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

const GENERAL_NOTIFICATION_TYPES = [
  'post_live', 'event_ended', 'event_ended_registered', 'event_ended_attended',
  'free_event_cancelled', 'paid_event_cancelled',
  'registration_successful', 'plan_shared_chat',
] as const;

function getCTALabel(ctaType: string): string {
  switch (ctaType) {
    case 'go_to_event': return 'Go to Event';
    case 'go_to_analytics': return 'Go to Analytics';
    case 'go_to_ticket': return 'Go to Ticket';
    case 'go_to_chat': return 'Go to Chat';
    case 'go_to_plan': return 'Go to Plan';
    default: return 'View';
  }
}

interface NotificationListItemProps {
  interaction: {
    notification_id: string;
    type: string;
    source_user_id: string;
    source_plan_id?: string | null;
    user?: {
      user_id: string;
      name: string;
      profile_image?: string;
    };
    payload?: {
      notification_text?: string;
      cta_type?: string;
      plan_id?: string;
      group_id?: string;
      ticket_id?: string;
      [key: string]: any;
    };
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
  const userName = user?.name || '';
  const userAvatar = (user as any)?.profile_image ?? null;
  const isGeneralType = GENERAL_NOTIFICATION_TYPES.includes(interaction.type as any);
  const hasCTA = isGeneralType && !!interaction.payload?.cta_type;
  const isSystem = interaction.source_user_id === 'system';

  const handleUserPress = () => {
    if (onUserPress && !isSystem) {
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
    if (text.includes('live')) return 'radio-outline';
    if (text.includes('ended')) return 'checkmark-done-outline';
    if (text.includes('cancelled')) return 'close-circle-outline';
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

  const displayText = getInteractionText();
  const showUserName = !isSystem && userName && !isGeneralType;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={hasCTA ? onPress : (onUserPress ? handleUserPress : onPress)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <TouchableOpacity onPress={!isSystem ? handleUserPress : undefined} activeOpacity={0.7} disabled={isSystem}>
          <Avatar uri={userAvatar} size={44} />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.text} numberOfLines={2}>
            {showUserName && (
              <>
                <Text style={styles.userName} onPress={handleUserPress}>
                  {userName}
                </Text>
                {' '}
              </>
            )}
            <Text style={showUserName ? styles.actionText : styles.textPlain}>{displayText}</Text>
            {planTitle && !isGeneralType ? ` on ${planTitle}` : ''}
          </Text>
        </View>

        {hasCTA ? (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={(e) => {
              e?.stopPropagation?.();
              onPress?.();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>{getCTALabel(interaction.payload!.cta_type!)}</Text>
          </TouchableOpacity>
        ) : timeLabel !== undefined && timeLabel !== '' ? (
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
  textPlain: {
    fontWeight: '400',
  },
  ctaButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    marginLeft: 8,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
