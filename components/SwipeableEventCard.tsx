import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

// --- The Base Event Card ---
function EventCard({ user, event }: any) {
  return (
    <View style={styles.cardContainer}>
      {/* Main White Card */}
      <View style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description} numberOfLines={3}>{event.description}</Text>

          <View style={styles.middleRow}>
            <View style={styles.tagsContainer}>
              {event.tags.map((tag: string, index: number) => (
                <View key={index} style={styles.tag}>
                   <Ionicons name={tag === 'Hitchhiking' ? 'walk' : 'checkbox'} size={12} color="#555" style={{marginRight: 4}}/>
                   <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Image source={{ uri: event.image }} style={styles.eventImage} />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="refresh" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="navigate-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating User Pill */}
      <View style={styles.userPill}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userTime}>{user.time}</Text>
        </View>
      </View>
    </View>
  );
}

// --- The Swipe Wrapper ---
export default function SwipeableEventCard({ user, event }: any) {
  // Logic: Reveal the Left Action (Save icon) when swiping
  const renderLeftActions = (progress: any, dragX: any) => {
    const trans = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [-20, 0], // Parallax effect
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.leftActionContainer}>
        <Animated.View style={[styles.saveActionBtn, { transform: [{ translateX: trans }] }]}>
          <Ionicons name="bookmark" size={24} color="#1C1C1E" />
          <Text style={styles.saveActionText}>Save</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable renderLeftActions={renderLeftActions} containerStyle={styles.swipeContainer}>
      <EventCard user={user} event={event} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 25,
  },
  cardContainer: {
    paddingHorizontal: 16,
    paddingTop: 20, 
  },
  // Save Button Styles
  leftActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    paddingLeft: 16,
    paddingTop: 20, // Match card top padding
  },
  saveActionBtn: {
    backgroundColor: '#FFF',
    width: 70,
    height: 70,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  saveActionText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  // Card Styles
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    paddingTop: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  userPill: {
    position: 'absolute',
    top: 5,
    left: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    zIndex: 10,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  userName: { fontSize: 14, fontWeight: '700', color: '#000' },
  userTime: { fontSize: 11, color: '#888' },
  content: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
  description: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 16 },
  middleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tagsContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#333' },
  eventImage: { width: 80, height: 60, borderRadius: 12, marginLeft: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  joinButton: { flex: 1, height: 44, backgroundColor: '#1C1C1E', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  joinButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});