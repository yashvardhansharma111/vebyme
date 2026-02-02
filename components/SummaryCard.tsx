import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Avatar from './Avatar';

interface SummaryCardProps {
  totalCount: number;
  avatars: (string | null)[];
  /** Event description shown in state one; "vybeme!" is shown on the next line */
  eventDescription: string;
  onPress: () => void;
}

export default function SummaryCard({
  totalCount,
  avatars,
  eventDescription,
  onPress,
}: SummaryCardProps) {
  // DPs first: non-null avatars first, up to 3
  const displayAvatars = [...avatars]
    .filter((a) => a != null && a !== '')
    .slice(0, 3);
  const showCount = totalCount > 1 ? `+${totalCount}` : `${totalCount}`;

  return (
    <View style={styles.outerWrapper}>
      {/* Back card (stacked effect) */}
      <View style={styles.backCard} />
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Upper left: stacked DPs first, then +N badge on rightmost */}
        <View style={styles.topRow}>
          <View style={styles.avatarsRow}>
            {displayAvatars.slice(0, 3).map((avatar, idx) => (
              <View
                key={idx}
                style={[
                  styles.avatarWrapper,
                  { zIndex: 3 - idx },
                  idx > 0 && { marginLeft: -12 },
                ]}
              >
                <Avatar uri={avatar} size={32} />
              </View>
            ))}
            {displayAvatars.length === 0 && (
              <View style={[styles.avatarWrapper, { marginLeft: 0 }]}>
                <Avatar uri={null} size={32} />
              </View>
            )}
            <View style={styles.badgeOnEdge}>
              <Text style={styles.badgeText}>{showCount}</Text>
            </View>
          </View>
        </View>

        {/* Description then "vybeme!" on next line (no title in first state) */}
        <Text style={styles.description} numberOfLines={4}>
          {eventDescription?.trim().replace(/\s*vybeme!?\s*$/i, '').trim() || ''}
        </Text>
        <Text style={styles.vybemeLine}>vybeme!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  backCard: {
    position: 'absolute',
    left: 8,
    top: 22,
    right: 8,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
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
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeOnEdge: {
    marginLeft: -4,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    marginBottom: 4,
  },
  vybemeLine: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
