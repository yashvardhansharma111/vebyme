import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef } from 'react';
import { Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAppSelector } from '@/store/hooks';
import JoinModal, { type JoinModalPlan, type JoinModalAuthor } from './JoinModal';
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
function EventCard({ user, event, onUserPress, onRequireAuth, onJoinPress, onSharePress, onImagePress, onInteractedPillPress, isRepost = false, repostData, originalAuthor, originalPostTitle, originalPostDescription, joinDisabled = false, hideFooterActions = false, hideTags = false }: any) {
  const allTags = hideTags ? [] : getAllEventTags(event);
  const hasEventImage = event?.image && String(event.image).trim();
  const interactedUsers = event?.interacted_users || [];
  const interactionCount = event?.interaction_count ?? 0;
  const showPill = true;
  const hasInteractions = interactionCount > 0 || interactedUsers.length > 0;

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
            <TouchableOpacity
              style={styles.interactedPill}
              onPress={hasInteractions ? onInteractedPillPress : undefined}
              activeOpacity={hasInteractions ? 0.7 : 1}
              disabled={!hasInteractions}
            >
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
            </TouchableOpacity>
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
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onImagePress}>
                  <Image source={{ uri: event.image }} style={styles.embeddedCardBg} resizeMode="cover" />
                </TouchableOpacity>
              ) : (
                <View style={[styles.embeddedCardBg, styles.embeddedCardBgPlaceholder]} />
              )}
              <View style={styles.embeddedCardOverlay} pointerEvents="none" />
              <View style={styles.embeddedCardContent}>
                {originalAuthor && (
                  <View style={styles.originalAuthorPill}>
                    <Avatar uri={event.original_author_avatar} size={28} />
                    <Text style={styles.originalAuthorName}>{originalAuthor}</Text>
                  </View>
                )}
                <Text style={styles.embeddedTitle}>{originalPostTitle || event.title}</Text>
                <Text style={styles.embeddedDescription} numberOfLines={4}>{originalPostDescription || event.description}</Text>
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
                  <TouchableOpacity style={[styles.embeddedJoinBtn, joinDisabled && styles.joinButtonDisabled]} onPress={joinDisabled ? undefined : onJoinPress} disabled={joinDisabled}>
                    <Text style={[styles.embeddedJoinText, joinDisabled && styles.joinButtonTextDisabled]}>Join</Text>
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
              <Text style={styles.description} numberOfLines={4}>{event.description}</Text>
              <View style={styles.middleRow}>
                {!hideTags && (
                <View style={styles.tagsContainer}>
                  {allTags.map((tag: string, index: number) => (
                    <View key={index} style={styles.tag}>
                      <Ionicons name={tag === 'Hitchhiking' ? 'walk' : 'checkbox'} size={12} color="#555" style={{ marginRight: 4 }} />
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                )}
                {hasEventImage ? (
                  <TouchableOpacity onPress={onImagePress} activeOpacity={0.95}>
                    <Image source={{ uri: event.image }} style={styles.eventImage} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
                    <Ionicons name="image-outline" size={28} color="#8E8E93" />
                  </View>
                )}
              </View>
            </>
          )}
          </View>

          {!hideFooterActions && !isRepost && !event?.repost_data && (
            <View style={styles.footerRow}>
              <TouchableOpacity style={[styles.joinButton, joinDisabled && styles.joinButtonDisabled]} onPress={joinDisabled ? undefined : onJoinPress} disabled={joinDisabled}>
                <Text style={[styles.joinButtonText, joinDisabled && styles.joinButtonTextDisabled]}>Join</Text>
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

export { EventCard };

// --- The Swipe Wrapper ---
export default function SwipeableEventCard({ user, event, postId, onUserPress, onRequireAuth, isRepost, originalAuthor, originalPostTitle, originalPostDescription }: any) {
  const { isAuthenticated, user: authUser } = useAppSelector((state) => state.auth);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showJoinedListModal, setShowJoinedListModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasEventImage = event?.image && String(event.image).trim();
  const swipeableRef = useRef<Swipeable>(null);
  const isOwnPost = !!(authUser?.user_id && (String(user?.id) === String(authUser.user_id) || String(user?.user_id) === String(authUser.user_id) || String(event?.user_id) === String(authUser.user_id)));
  
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
          onInteractedPillPress={() => setShowJoinedListModal(true)}
          onJoinPress={() => {
            if (isOwnPost) {
              Alert.alert('Not allowed', "You can't join or react to your own post.");
              return;
            }
            if (isAuthenticated) {
              setShowJoinModal(true);
            } else {
              onRequireAuth?.();
            }
          }}
          joinDisabled={isOwnPost}
          onSharePress={handleShare}
          isRepost={isRepost}
          repostData={event.repost_data}
          originalAuthor={event.original_author_name}
          originalPostTitle={event.original_post_title}
          originalPostDescription={event.original_post_description}
          onImagePress={hasEventImage ? () => setShowImageGallery(true) : undefined}
        />
      </Swipeable>
      {showJoinModal && (postId || event?.id) && (
        <JoinModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          planId={postId || event?.id}
          plan={{
            plan_id: postId || event?.id,
            title: originalPostTitle || event?.title || 'Untitled',
            description: originalPostDescription || event?.description || '',
            category_sub: event?.tags || [],
          } as JoinModalPlan}
          author={{
            name: user?.name || 'Host',
            avatar: user?.avatar ?? null,
            time: user?.time,
          } as JoinModalAuthor}
          onSuccess={async (payload, type) => {
            if (!authUser?.user_id) return;
            const id = postId || event?.id;
            try {
              if (type === 'emoji') {
                await apiService.createJoinRequestWithReaction(id, authUser.user_id, payload);
              } else {
                await apiService.createJoinRequestWithComment(id, authUser.user_id, payload);
              }
              setShowJoinModal(false);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to send');
              throw err;
            }
          }}
        />
      )}
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
      {/* Who joined modal – show list of interacted/registered users */}
      <Modal
        visible={showJoinedListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinedListModal(false)}
      >
        <TouchableOpacity
          style={styles.joinedListOverlay}
          activeOpacity={1}
          onPress={() => setShowJoinedListModal(false)}
        >
          <View style={styles.joinedListSheet} pointerEvents="box-none">
            <View style={styles.joinedListHandle} />
            <Text style={styles.joinedListTitle}>Who joined</Text>
            <ScrollView style={styles.joinedListScroll} contentContainerStyle={styles.joinedListContent}>
              {(event?.interacted_users || []).map((u: any) => (
                <TouchableOpacity
                  key={u?.id}
                  style={styles.joinedListRow}
                  onPress={() => {
                    setShowJoinedListModal(false);
                    onUserPress?.(u?.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Avatar uri={u?.avatar ?? undefined} size={44} />
                  <Text style={styles.joinedListName}>{u?.name ?? 'User'}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                </TouchableOpacity>
              ))}
              {(event?.interaction_count ?? 0) > (event?.interacted_users?.length ?? 0) && (
                <Text style={styles.joinedListMore}>
                  +{(event?.interaction_count ?? 0) - (event?.interacted_users?.length ?? 0)} more
                </Text>
              )}
              {(!event?.interacted_users?.length && (event?.interaction_count ?? 0) === 0) && (
                <Text style={styles.joinedListEmpty}>No one has joined yet.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.joinedListCloseBtn} onPress={() => setShowJoinedListModal(false)}>
              <Text style={styles.joinedListCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Full-screen image gallery (same UX as business-plan [planId]) */}
      <Modal
        visible={showImageGallery}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowImageGallery(false)}
      >
        <SafeAreaView style={styles.galleryOverlay} edges={['top', 'bottom']}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowImageGallery(false)} />
          <View style={[styles.galleryContentWrap, { margin: 20 }]} pointerEvents="box-none">
            {hasEventImage && event?.image && (
              <TouchableOpacity style={styles.galleryCenterWrap} activeOpacity={1} onPress={() => {}}>
                <Image source={{ uri: event.image }} style={styles.galleryImageCentered} resizeMode="contain" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.galleryCloseButton}
              onPress={() => setShowImageGallery(false)}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={36} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 25,
  },
  cardContainer: {
    paddingHorizontal: -2,
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
    top: -20,
    left: 4,
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
    height: 44,
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    borderRadius: 22,
    minWidth: 100,
    justifyContent: 'center',
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
    height: 44,
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  joinButtonDisabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.9,
  },
  joinButtonTextDisabled: {
    color: '#8E8E93',
  },
  footerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinedListOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  joinedListSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  joinedListHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  joinedListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  joinedListScroll: {
    maxHeight: 320,
  },
  joinedListContent: {
    paddingBottom: 16,
  },
  joinedListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  joinedListName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  joinedListMore: {
    fontSize: 14,
    color: '#8E8E93',
    paddingVertical: 12,
  },
  joinedListEmpty: {
    fontSize: 14,
    color: '#8E8E93',
    paddingVertical: 24,
    textAlign: 'center',
  },
  joinedListCloseBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#E5E5EA',
    borderRadius: 14,
    alignItems: 'center',
  },
  joinedListCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  galleryOverlay: {
    flex: 1,
    backgroundColor: '#2C2C2E',
  },
  galleryContentWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  galleryCenterWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImageCentered: {
    width: Dimensions.get('window').width - 48,
    height: '100%',
    maxHeight: Dimensions.get('window').height - 120,
    borderRadius: 12,
  },
  galleryCloseButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryScroll: { flex: 1 },
  galleryScrollContent: {},
  gallerySlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    minHeight: 300,
    borderRadius: 12,
  },
});