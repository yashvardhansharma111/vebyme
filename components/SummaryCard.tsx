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

const AVATAR_SIZE = 40;

export default function SummaryCard({
  totalCount,
  avatars,
  eventDescription,
  onPress,
}: SummaryCardProps) {
  const displayAvatars = [...avatars]
    .filter((a) => a != null && a !== '')
    .slice(0, 3);
  const showCount = totalCount > 1 ? `+${totalCount}` : `${totalCount}`;
  const descriptionText = eventDescription?.trim().replace(/\s*vybeme!?\s*$/i, '').trim() || '';

  return (
    <View style={styles.outerWrapper}>
      {/* Behind card (Frame1984077337) – only bottom visible */}
      <View style={styles.backCard} />
      {/* Front card (Frame1984077336) – real data */}
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.frameWrapper}>
          <View style={styles.frameContainer}>
            <View style={styles.ellipseParent}>
              {displayAvatars.slice(0, 3).map((avatar, idx) => (
                <View
                  key={idx}
                  style={[styles.frameChildWrap, idx > 0 && styles.frameItemLayout]}
                >
                  <Avatar uri={avatar} size={AVATAR_SIZE} />
                </View>
              ))}
              <View style={[styles.placeholderTextWrapper, styles.frameItemLayout]}>
                <Text style={styles.placeholderText}>{showCount}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.leavingToOotyWrapper}>
          <Text style={styles.leavingToOotyContainer}>
            <Text style={styles.leavingToOoty}>{descriptionText}{descriptionText ? ' ' : ''}</Text>
            <Text style={styles.vybeme}>vybeme! </Text>
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'relative',
    marginBottom: 20,
    paddingBottom: 14,
  },
  /* Frame1984077337 – card behind, only downside visible */
  backCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -14,
    width: '100%',
    height: 86,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 225 },
    shadowOpacity: 0,
    shadowRadius: 63,
    elevation: 63,
    backgroundColor: '#E8E8ED',
    borderRadius: 16,
    zIndex: 0,
  },
  /* Frame1984077336 – upper card */
  card: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 57,
    position: 'relative',
    zIndex: 1,
  },
  frameWrapper: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  frameContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 72 },
    shadowOpacity: 0.02,
    shadowRadius: 64,
    elevation: 64,
    borderRadius: 100,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  ellipseParent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameChildWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  frameItemLayout: {
    marginLeft: -16,
    width: 40,
    height: 40,
  },
  placeholderTextWrapper: {
    borderRadius: 20,
    backgroundColor: '#252525',
    borderStyle: 'solid',
    borderColor: '#fff',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    letterSpacing: -1.3,
    lineHeight: 19,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  leavingToOotyWrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  leavingToOotyContainer: {
    letterSpacing: -0.3,
    lineHeight: 22,
    color: '#3b3c3d',
    textAlign: 'left',
    fontSize: 16,
    alignSelf: 'stretch',
  },
  leavingToOoty: {
    fontWeight: '400',
  },
  vybeme: {
    fontWeight: '700',
  },
});
