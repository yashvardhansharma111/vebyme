import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Avatar from './Avatar';

interface BusinessEventCardProps {
  user: {
    id: string;
    name: string;
    avatar: string;
    time: string;
  };
  event: {
    title: string;
    description: string;
    tags: string[];
    image: string;
  };
  attendeesCount?: number;
  onPress?: () => void;
  onRegisterPress?: () => void;
  onUserPress?: (userId: string) => void;
  fullWidth?: boolean; // If true, card takes full width (for vertical lists)
}

export default function BusinessEventCard({
  user,
  event,
  attendeesCount = 0,
  onPress,
  onRegisterPress,
  onUserPress,
  fullWidth = false,
}: BusinessEventCardProps) {
  return (
    <TouchableOpacity 
      style={[styles.cardContainer, fullWidth && styles.cardContainerFullWidth]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Background Media Image */}
      <Image 
        source={{ uri: event.image || 'https://picsum.photos/id/1011/400/500' }} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      />
      
      {/* Gradient Overlay for better text readability */}
      <View style={styles.gradientOverlay} />
      
      {/* User/Host Info (Top Left) */}
      <TouchableOpacity 
        style={styles.userPill}
        onPress={() => onUserPress && user.id && onUserPress(user.id)}
        activeOpacity={0.7}
      >
        <Avatar uri={user.avatar} size={32} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userTime}>{user.time}</Text>
        </View>
      </TouchableOpacity>

      {/* Attendees: only when joiners > 0. 1→1 circle, 2→2 circles, 3→3 circles, 4+→3 circles + overflow count */}
      {attendeesCount > 0 && (
        <View style={styles.attendeesPill}>
          <View style={styles.avatarStack}>
            {Array.from({ length: Math.min(3, attendeesCount) }, (_, i) => (
              <View key={i} style={[styles.stackedAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }]}>
                <Avatar uri={`https://i.pravatar.cc/150?u=${i}`} size={24} />
              </View>
            ))}
          </View>
          {attendeesCount > 3 && <Text style={styles.attendeesText}>+{attendeesCount - 3}</Text>}
        </View>
      )}

      {/* Content Panel (Bottom Overlay) */}
      <View style={styles.contentPanel}>
        <Text style={styles.title}>{event.title}</Text>
        {event.description && (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {event.tags.slice(0, 3).map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={onRegisterPress}
          >
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="repeat-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="paper-plane-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: 320,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 360,
  },
  cardContainerFullWidth: {
    width: '100%',
    marginRight: 0,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  backgroundImage: {
    width: '100%',
    height: 220,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  userPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  userInfo: {
    marginLeft: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  userTime: {
    fontSize: 11,
    color: '#888',
  },
  attendeesPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 12,
  },
  attendeesText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  contentPanel: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 140, // Position over the background image to show more media
    minHeight: 200,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  registerButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
