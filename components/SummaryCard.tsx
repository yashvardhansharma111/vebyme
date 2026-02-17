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
    marginBottom: 24,
    paddingBottom: 8,
  },
  /* Frame1984077337 – card behind, only downside visible */
  backCard: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: -8,
    height: 70,
    backgroundColor: '#EDEDED',
    borderRadius: 20,
    zIndex: 0,
  },  
  /* Frame1984077336 – upper card */
  card: {
    width: '100%',
    paddingHorizontal: 22,
    paddingVertical: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1,
  },  
  frameWrapper: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 6,
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
    marginLeft: -12,
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
    fontSize: 17,
    lineHeight: 24,
    color: '#3B3B3B',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  leavingToOoty: {
    fontWeight: '400',
  },
  vybeme: {
    fontWeight: '700',
  },
});
