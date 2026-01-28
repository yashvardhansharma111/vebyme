import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

interface SummaryCardProps {
  totalCount: number;
  avatars: (string | null)[];
  onPress: () => void;
  isExpanded: boolean;
}

export default function SummaryCard({
  totalCount,
  avatars,
  onPress,
  isExpanded,
}: SummaryCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Count Badge */}
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>{totalCount}</Text>
      </View>

      {/* Expand/Collapse Icon */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#8E8E93"
        />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>
        {totalCount} {totalCount === 1 ? 'event' : 'events'}
      </Text>

      {/* Stacked Avatars */}
      <View style={styles.avatarsContainer}>
        {avatars.slice(0, 3).map((avatar, idx) => (
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
        {avatars.length > 3 && (
          <View
            style={[
              styles.avatarWrapper,
              styles.avatarOverlay,
              { marginLeft: -12, zIndex: 0 },
            ]}
          >
            <View style={styles.overlayBadge}>
              <Text style={styles.overlayBadgeText}>+{avatars.length - 3}</Text>
            </View>
            <Avatar uri={null} size={32} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 12,
    paddingRight: 40, // Space for expand button
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
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
});
