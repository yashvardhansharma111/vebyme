import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAppSelector } from '@/store/hooks';
import PostInteractionModal from './PostInteractionModal';
import RepostModal from './RepostModal';
import ShareToChatModal from './ShareToChatModal';
import { apiService } from '@/services/api';
import Avatar from './Avatar';

// Merge tags + category_sub so all selected tags are visible (same as post creation)
function getAllEventTags(event: any): string[] {
  const from = (v: any) => (Array.isArray(v) ? v : v ? [String(v)] : []);
  const seen = new Set<string>();
  [...from(event.tags), ...from(event.category_sub)].forEach((t) => {
    const s = (t || '').trim();
    if (s) seen.add(s);
  });
  return Array.from(seen);
}

// --- The Base Event Card ---
function EventCard({ user, event, onUserPress, onRequireAuth, onJoinPress, onRepostPress, onSharePress, isRepost = false, repostData, originalAuthor, originalPostTitle, originalPostDescription }: any) {
  const allTags = getAllEventTags(event);
  const hasEventImage = event?.image && String(event.image).trim();
  const interactedUsers = event?.interacted_users || [];
  const interactionCount = event?.interaction_count ?? 0;
  const showPill = true;

  return (
    <View style={styles.cardContainer}>
      {/* Card wrapper: pill overlays top-left (slightly outside), 3 avatars + counter top-right */}
      <View style={styles.cardWrapper}>
        {/* User pill: top-left, hovering slightly outside the card */}
        <TouchableOpacity
          style={styles.userPill}
          onPress={() => onUserPress && user.id && onUserPress(user.id)}
          activeOpacity={0.7}
        >
          <Avatar uri={user.avatar} size={36} />
          <View style={styles.userPillText}>
            <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.userTime}>{user.time}</Text>
          </View>
        </TouchableOpacity>
        {showPill && (
          <View style={styles.interactedPillPositioned}>
            <View style={styles.interactedPill}>
              {[0, 1, 2].map((idx) => {
                const u = interactedUsers[idx];
                return (
                  <View key={u?.id ?? idx} style={[styles.interactedAvatarWrap, { marginLeft: idx === 0 ? 0 : -8, zIndex: 3 - idx }]}>
                    <Avatar uri={u?.avatar ?? undefined} size={24} />
                  </View>
                );
              })}
              {interactionCount > 0 && (
                <Text style={styles.interactedPlus}>+{interactionCount}</Text>
              )}
            </View>
          </View>
        )}

        {/* Main White Card */}
        <View style={styles.card}>
          <View style={styles.content}>
          {isRepost ? (
            <>
              {/* Reposter's title and description only (do not fall back to original) */}
              {(event.repost_title && event.repost_title.trim()) ? (
                <Text style={styles.repostTitle} numberOfLines={2}>
                  {event.repost_title}
                </Text>
              ) : null}
              {(event.repost_description && event.repost_description.trim()) ? (
                <Text style={styles.repostDescription} numberOfLines={4}>
                  {event.repost_description}
                </Text>
              ) : null}
              {/* When user reposted without adding title or description, add 2-line space for better UI */}
              {!(event.repost_title && event.repost_title.trim()) && !(event.repost_description && event.repost_description.trim()) && (
                <View style={styles.repostEmptySpacer} />
              )}
              <View style={styles.embeddedCard}>
              {hasEventImage ? (
                <Image source={{ uri: event.image }} style={styles.embeddedCardBg} resizeMode="cover" />
              ) : (
                <View style={[styles.embeddedCardBg, styles.embeddedCardBgPlaceholder]} />
              )}
              <View style={styles.embeddedCardOverlay} />
              <View style={styles.embeddedCardContent}>
                {originalAuthor && (
                  <View style={styles.originalAuthorPill}>
                    <Avatar uri={event.original_author_avatar} size={28} />
                    <Text style={styles.originalAuthorName}>{originalAuthor}</Text>
                  </View>
                )}
                <Text style={styles.embeddedTitle}>{originalPostTitle || event.title}</Text>
                <Text style={styles.embeddedDescription} numberOfLines={3}>{originalPostDescription || event.description}</Text>
                {allTags.length > 0 && (
                  <View style={styles.embeddedTagsRow}>
                    {allTags.slice(0, 3).map((tag: string, index: number) => (
                      <View key={index} style={styles.embeddedTag}>
                        <Ionicons name={tag === 'Hitchhiking' ? 'walk' : 'checkbox'} size={10} color="#FFF" />
                        <Text style={styles.embeddedTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.embeddedFooter}>
                  <TouchableOpacity style={styles.embeddedJoinBtn} onPress={onJoinPress}>
                    <Text style={styles.embeddedJoinText}>Join</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.embeddedShareBtn} onPress={onSharePress}>
                    <Ionicons name="paper-plane-outline" size={20} color="#1C1C1E" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </>
          ) : (
            /* Regular post */
            <>
              <Text style={styles.title}>{event.title}</Text>
              <Text style={styles.description} numberOfLines={3}>{event.description}</Text>
              <View style={styles.middleRow}>
                <View style={styles.tagsContainer}>
                  {allTags.map((tag: string, index: number) => (
                    <View key={index} style={styles.tag}>
                      <Ionicons name={tag === 'Hitchhiking' ? 'walk' : 'checkbox'} size={12} color="#555" style={{ marginRight: 4 }} />
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                {hasEventImage ? (
                  <Image source={{ uri: event.image }} style={styles.eventImage} />
                ) : (
                  <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
                    <Ionicons name="image-outline" size={28} color="#8E8E93" />
                  </View>
                )}
              </View>
            </>
          )}
          </View>

          {!isRepost && !event?.repost_data && (
            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.joinButton} onPress={onJoinPress}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerIconBtn} onPress={onRepostPress}>
                <Ionicons name="repeat-outline" size={22} color="#1C1C1E" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerIconBtn} onPress={onSharePress}>
                <Ionicons name="paper-plane-outline" size={22} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// --- The Swipe Wrapper ---
export default function SwipeableEventCard({ user, event, postId, onUserPress, onRequireAuth, isRepost, originalAuthor, originalPostTitle, originalPostDescription }: any) {
  const { isAuthenticated, user: authUser } = useAppSelector((state) => state.auth);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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
    const isRepostPost = event.is_repost || isRepost || !!event?.repost_data;
    if (isRepostPost) {
      Alert.alert('Info', 'You cannot repost a repost');
      return;
    }

    setShowRepostModal(true);
  };

  const handleShare = () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setShowShareModal(true);
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
          onSharePress={handleShare}
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
        originalPlanId={event?.repost_data?.original_plan_id || event?.repost_data?.plan_id || postId || event?.id || ''}
        originalPostTitle={originalPostTitle || event?.title}
        originalPostDescription={originalPostDescription || event?.description}
        originalAuthorName={originalAuthor}
        onSuccess={() => {
          // Refresh feed or update UI
        }}
      />
      {isAuthenticated && authUser?.user_id && (
        <ShareToChatModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          postId={postId || event?.id}
          postTitle={originalPostTitle || event?.title || 'Untitled Post'}
          postDescription={originalPostDescription || event?.description || ''}
          postMedia={event?.image ? [{ url: event.image, type: 'image' }] : []}
          postTags={event?.tags}
          postCategorySub={event?.tags}
          userId={authUser.user_id}
          onShareSuccess={() => {
            // Optionally refresh feed or show success message
          }}
        />
      )}
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
  cardWrapper: {
    position: 'relative',
    marginBottom: 0,
  },
  userPill: {
    position: 'absolute',
    top: -8,
    left: -6,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 22,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userPillText: {
    marginLeft: 8,
    flex: 1,
    minWidth: 0,
  },
  userName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  userTime: { fontSize: 11, color: '#8E8E93' },
  interactedPillPositioned: {
    position: 'absolute',
    top: -6,
    right: 12,
    zIndex: 10,
  },
  // Card Styles
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    paddingTop: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  interactedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 20,
  },
  interactedAvatarWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  interactedPlus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    marginLeft: 4,
  },
  repostTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  repostDescription: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 14,
  },
  repostEmptySpacer: {
    height: 44,
    width: '100%',
  },
  embeddedCard: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 200,
    position: 'relative',
  },
  embeddedCardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  embeddedCardBgPlaceholder: {
    backgroundColor: '#6B5B8E',
  },
  embeddedCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  embeddedCardContent: {
    padding: 16,
    paddingTop: 12,
    justifyContent: 'flex-end',
    minHeight: 200,
  },
  originalAuthorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  originalAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8,
  },
  embeddedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  embeddedDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 20,
    marginBottom: 10,
  },
  embeddedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  embeddedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  embeddedTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 4,
  },
  embeddedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  embeddedJoinBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  embeddedJoinText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  embeddedShareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  eventImage: { width: 96, height: 96, borderRadius: 12, marginLeft: 12 },
  eventImagePlaceholder: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
    alignSelf: 'stretch',
    width: '100%',
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  footerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});