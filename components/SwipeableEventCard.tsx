import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAppSelector } from '@/store/hooks';
import PostInteractionModal from './PostInteractionModal';
import RepostModal from './RepostModal';
import { apiService } from '@/services/api';
import Avatar from './Avatar';

// --- The Base Event Card ---
function EventCard({ user, event, onUserPress, onRequireAuth, onJoinPress, onRepostPress, isRepost = false, repostData, originalAuthor, originalPostTitle, originalPostDescription }: any) {
  return (
    <View style={styles.cardContainer}>
      {/* Main White Card */}
      <View style={styles.card}>
        <View style={styles.content}>
          {/* Repost Badge - Always visible for reposts */}
          {isRepost && (
            <View style={styles.repostBadge}>
              <Ionicons name="repeat" size={16} color="#8B5CF6" />
              <Text style={styles.repostBadgeText}>Repost</Text>
            </View>
          )}
          
          {/* User's Added Content/Thoughts - Prominently displayed */}
          {isRepost && repostData?.added_content && (
            <View style={styles.repostThoughtsContainer}>
              <Text style={styles.repostThoughtsLabel}>Your thoughts:</Text>
              <Text style={styles.repostThoughts}>{repostData.added_content}</Text>
            </View>
          )}
          
          {/* Original Post Info for Reposts */}
          {isRepost && originalAuthor && (
            <View style={styles.originalPostInfo}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.originalPostLabel}>
                Original by {originalAuthor}
              </Text>
            </View>
          )}
          
          <Text style={styles.title}>{isRepost ? (originalPostTitle || event.title) : event.title}</Text>
          <Text style={styles.description} numberOfLines={3}>{isRepost ? (originalPostDescription || event.description) : event.description}</Text>

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
          {!isRepost && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onRepostPress}
            >
              <Ionicons name="repeat-outline" size={20} color="#000" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => onRequireAuth?.()}
          >
            <Ionicons name="navigate-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={onJoinPress}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating User Pill */}
      <TouchableOpacity 
        style={styles.userPill}
        onPress={() => onUserPress && user.id && onUserPress(user.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Avatar uri={user.avatar} size={32} />
        </View>
        <View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userTime}>{user.time}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// --- The Swipe Wrapper ---
export default function SwipeableEventCard({ user, event, postId, onUserPress, onRequireAuth, isRepost, originalAuthor, originalPostTitle, originalPostDescription }: any) {
  const { isAuthenticated, user: authUser } = useAppSelector((state) => state.auth);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);
  
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

  const handleSwipeableWillOpen = (direction: 'left' | 'right') => {
    // Check auth before allowing left swipe (save action)
    if (direction === 'left' && !isAuthenticated && onRequireAuth) {
      onRequireAuth();
      return false; // Prevent swipe
    }
    return true;
  };

  const handleSwipeableOpen = (direction: 'left' | 'right') => {
    // When left swipe is fully opened, save the post
    if (direction === 'left' && isAuthenticated && authUser?.user_id) {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !authUser?.user_id || !authUser?.access_token) {
      onRequireAuth?.();
      return;
    }

    if (!postId && !event?.id) {
      Alert.alert('Error', 'Post ID not found');
      return;
    }

    setSaving(true);
    try {
      await apiService.savePost(authUser.access_token, authUser.user_id, postId || event.id);
      // Close the swipeable after saving
      swipeableRef.current?.close();
      Alert.alert('Success', 'Post saved!');
    } catch (error: any) {
      if (error.message?.includes('already saved')) {
        Alert.alert('Info', 'Post is already saved');
        swipeableRef.current?.close();
      } else {
        Alert.alert('Error', error.message || 'Failed to save post');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRepost = () => {
    if (!isAuthenticated || !authUser?.user_id) {
      onRequireAuth?.();
      return;
    }

    // Check if this is already a repost (cannot repost a repost)
    const isRepostPost = event.is_repost || isRepost;
    if (isRepostPost) {
      Alert.alert('Info', 'You cannot repost a repost');
      return;
    }

    setShowRepostModal(true);
  };

  return (
    <>
      <Swipeable 
        ref={swipeableRef}
        renderLeftActions={renderLeftActions} 
        containerStyle={styles.swipeContainer}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        onSwipeableOpen={handleSwipeableOpen}
      >
        <EventCard 
          user={user} 
          event={event} 
          onUserPress={onUserPress} 
          onRequireAuth={onRequireAuth}
          onJoinPress={() => {
            if (isAuthenticated) {
              setShowInteractionModal(true);
            } else {
              onRequireAuth?.();
            }
          }}
          onRepostPress={handleRepost}
          isRepost={isRepost}
          repostData={event.repost_data}
          originalAuthor={event.original_author_name}
          originalPostTitle={event.original_post_title}
          originalPostDescription={event.original_post_description}
        />
      </Swipeable>
      <PostInteractionModal
        visible={showInteractionModal}
        onClose={() => setShowInteractionModal(false)}
        postId={postId || event?.id}
        onSuccess={() => {
          // Refresh feed or update UI
        }}
      />
      <RepostModal
        visible={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        postId={postId || event?.id}
        originalPostTitle={originalPostTitle || event?.title}
        originalPostDescription={originalPostDescription || event?.description}
        originalAuthorName={originalAuthor}
        onSuccess={() => {
          // Refresh feed or update UI
        }}
      />
    </>
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
  avatarContainer: { marginRight: 8 },
  userName: { fontSize: 14, fontWeight: '700', color: '#000' },
  userTime: { fontSize: 11, color: '#888' },
  content: { marginBottom: 16 },
  // Repost Styles
  repostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  repostBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  repostThoughtsContainer: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  repostThoughtsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  repostThoughts: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  originalPostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  originalPostLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
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