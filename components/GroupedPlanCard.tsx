import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Avatar from './Avatar';
import Tag from './Tag';
import { apiService } from '@/services/api';

interface Interaction {
  notification_id: string;
  type: 'comment' | 'reaction' | 'join' | 'repost';
  source_user_id: string;
  user?: {
    user_id: string;
    name: string;
    profile_image?: string;
  };
  created_at: string;
}

interface GroupedPlanCardProps {
  post_id: string;
  post: {
    plan_id: string;
    title: string;
    description: string;
    category_main?: string;
    category_sub?: string[];
  } | null;
  interactions: Interaction[];
  created_at: string;
  userCache: { [key: string]: { name: string; profile_image: string | null } };
  onExpand?: () => void;
  onCreateGroup?: () => void;
  onAddToCommunity?: (guests: Array<{ user_id: string; name: string; profile_image: string | null }>) => void;
  isExpanded?: boolean;
  index?: number;
  showInteractions?: boolean;
}

export default function GroupedPlanCard({
  post_id,
  post,
  interactions,
  created_at,
  userCache,
  onExpand,
  onCreateGroup,
  onAddToCommunity,
  isExpanded = false,
  index = 0,
  showInteractions = false,
}: GroupedPlanCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(isExpanded);
  const [guests, setGuests] = useState<Array<{ user_id: string; name: string; profile_image: string | null }>>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [showAddToCommunityModal, setShowAddToCommunityModal] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());

  const planId = post?.plan_id;

  // Fetch guest list (all registered users) when card is expanded and we have a plan_id
  useEffect(() => {
    if (!(expanded && showInteractions && planId)) {
      setGuests([]);
      return;
    }
    let cancelled = false;
    setLoadingGuests(true);
    apiService
      .getGuestList(planId)
      .then((res: any) => {
        const data = res?.data ?? res;
        const list = data?.guests;
        if (!cancelled && Array.isArray(list)) setGuests(list);
      })
      .catch(() => {
        if (!cancelled) setGuests([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingGuests(false);
      });
    return () => { cancelled = true; };
  }, [expanded, showInteractions, planId]);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Sync with prop changes and animate
  useEffect(() => {
    if (isExpanded !== expanded) {
      LayoutAnimation.configureNext({
        duration: 300,
        create: { type: 'easeInEaseOut', property: 'opacity' },
        update: { type: 'easeInEaseOut' },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
      });
      setExpanded(isExpanded);
    }
  }, [isExpanded, expanded]);

  const uniqueInteractions = interactions.filter((interaction, idx, self) =>
    idx === self.findIndex((i) => i.source_user_id === interaction.source_user_id)
  );

  // Get unique user avatars for stacked display (up to 3)
  const avatarUsers = uniqueInteractions.slice(0, 3);
  const avatars = avatarUsers.map((i) => 
    i.user?.profile_image || userCache[i.source_user_id]?.profile_image || null
  );
  const remainingCount = Math.max(0, uniqueInteractions.length - 3);

  const postText = post?.description || post?.title || 'Post interaction';
  const postTitle = post?.title || 'Untitled Plan';
  const interactionCount = interactions.length;

  // Truncate description for collapsed view
  const shortDescription = postText.length > 100 
    ? postText.substring(0, 100) + '...' 
    : postText;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const handleToggleExpand = () => {
    // Always use the onExpand callback to let parent control the state
    if (onExpand) {
      onExpand();
    } else {
      // Fallback if no callback provided
      const newExpanded = !expanded;
      setExpanded(newExpanded);
    }
  };

  const handleAddToCommunityPress = (e: any) => {
    e?.stopPropagation?.();
    if (onAddToCommunity) {
      setSelectedGuestIds(new Set(guests.map((g) => g.user_id)));
      setShowAddToCommunityModal(true);
    } else if (onCreateGroup) {
      onCreateGroup();
    }
  };

  const toggleGuestSelection = (user_id: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(user_id)) next.delete(user_id);
      else next.add(user_id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (guests.length === 0) return;
    const allSelected = selectedGuestIds.size === guests.length;
    setSelectedGuestIds(allSelected ? new Set() : new Set(guests.map((g) => g.user_id)));
  };

  const handleAddToAnnouncementGroup = () => {
    const selected = guests.filter((g) => selectedGuestIds.has(g.user_id));
    if (selected.length > 0 && onAddToCommunity) {
      onAddToCommunity(selected);
    }
    setShowAddToCommunityModal(false);
  };

  const handleViewTicketDistribution = (e: any) => {
    e?.stopPropagation?.();
    if (planId) {
      router.push({ pathname: '/analytics/event/[planId]', params: { planId } } as any);
    }
  };

  // Stacking offset effect
  const cardOffset = index * 4;

  return (
    <View style={[styles.cardContainer, { marginLeft: cardOffset, marginRight: -cardOffset }]}>
      <TouchableOpacity
        style={[styles.card, expanded && styles.cardExpanded]}
        onPress={handleToggleExpand}
        activeOpacity={0.9}
      >
        {/* Numeric Badge - on edge of card, slightly overlapping */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{interactionCount}</Text>
        </View>

        {/* Plan Title + Date row (Level 3: date on right); extra right padding when avatars shown (Level 2) */}
        <View style={[styles.titleRow, !showInteractions && styles.titleRowWithAvatars]}>
          <Text style={styles.title} numberOfLines={1}>
            {postTitle}
          </Text>
          {expanded && showInteractions && (
            <Text style={styles.dateInline}>{formatDate(created_at)}</Text>
          )}
        </View>

        {/* Description - Show in Level 2 (collapsed) and Level 3 (expanded) */}
        <Text style={styles.description} numberOfLines={expanded && showInteractions ? undefined : 2}>
          {postText}
        </Text>

        {/* Stacked Avatars - Level 2 only (top-right); do NOT show in Level 3 */}
        {!showInteractions && (
          <View style={styles.avatarsContainerTopRight}>
            {avatars.map((avatar, idx) => (
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
            {remainingCount > 0 && (
              <View
                style={[
                  styles.avatarWrapper,
                  styles.avatarOverlay,
                  { marginLeft: -12, zIndex: 0 },
                ]}
              >
                <View style={styles.overlayBadge}>
                  <Text style={styles.overlayBadgeText}>+{remainingCount}</Text>
                </View>
                <Avatar uri={null} size={32} />
              </View>
            )}
          </View>
        )}

        {/* Tags - Show in Level 2 (collapsed) and Level 3 (expanded) */}
        {(post?.category_main || post?.category_sub?.length) && (
          <View style={styles.tagsContainer}>
            {post?.category_main && (
              <Tag label={post.category_main} />
            )}
            {post?.category_sub?.slice(0, 2).map((tag, idx) => (
              <Tag key={idx} label={tag} />
            ))}
          </View>
        )}

        {/* View Ticket Distribution + Registered section (when expanded and we have a plan) */}
        {expanded && showInteractions && planId && (
          <>
            <TouchableOpacity
              style={styles.viewTicketDistributionButton}
              onPress={handleViewTicketDistribution}
              activeOpacity={0.8}
            >
              <Text style={styles.viewTicketDistributionButtonText}>View Ticket Distribution</Text>
            </TouchableOpacity>

            <View style={styles.registeredSection}>
              <Text style={styles.registeredSectionTitle}>Registered</Text>
              {loadingGuests ? (
                <View style={styles.guestsLoading}>
                  <ActivityIndicator size="small" color="#8E8E93" />
                </View>
              ) : guests.length === 0 ? (
                <Text style={styles.registeredEmpty}>No registrations yet</Text>
              ) : (
                guests.map((guest) => (
                  <View key={guest.user_id} style={styles.registeredRow}>
                    <Avatar uri={guest.profile_image} size={36} />
                    <Text style={styles.registeredText}>
                      <Text style={styles.registeredName}>{guest.name}</Text>
                      <Text style={styles.registeredAction}> registered</Text>
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* Add to Community Button (only when expanded in Level 3) */}
        {expanded && showInteractions && (
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={handleAddToCommunityPress}
            activeOpacity={0.8}
          >
            <Text style={styles.createGroupButtonText}>Add to Community</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Add to Community Modal: show guest list, confirm adds them to announcement group */}
      <Modal
        visible={showAddToCommunityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddToCommunityModal(false)}
      >
        <TouchableOpacity
          style={styles.addToCommunityOverlay}
          activeOpacity={1}
          onPress={() => setShowAddToCommunityModal(false)}
        >
          <TouchableOpacity style={styles.addToCommunityModal} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.addToCommunityModalHeader}>
              <Text style={styles.addToCommunityModalTitle}>Add to Community</Text>
              <TouchableOpacity onPress={() => setShowAddToCommunityModal(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.addToCommunityGuestList} showsVerticalScrollIndicator={false}>
              {guests.length === 0 ? (
                <Text style={styles.registeredEmpty}>No registered users to add</Text>
              ) : (
                <>
                  {guests.map((guest) => {
                    const isSelected = selectedGuestIds.has(guest.user_id);
                    return (
                      <TouchableOpacity
                        key={guest.user_id}
                        style={styles.addToCommunityGuestRow}
                        onPress={() => toggleGuestSelection(guest.user_id)}
                        activeOpacity={0.7}
                      >
                        <Avatar uri={guest.profile_image} size={44} />
                        <Text style={styles.addToCommunityGuestName} numberOfLines={1}>
                          {guest.name}
                        </Text>
                        <View style={[styles.addToCommunityCheckbox, isSelected && styles.addToCommunityCheckboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.addToCommunitySelectAllRow}
                    onPress={toggleSelectAll}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addToCommunitySelectAllText}>Select All</Text>
                    <View
                      style={[
                        styles.addToCommunityCheckbox,
                        guests.length > 0 && selectedGuestIds.size === guests.length && styles.addToCommunityCheckboxSelected,
                      ]}
                    >
                      {guests.length > 0 && selectedGuestIds.size === guests.length && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.addToCommunityConfirmBtn, selectedGuestIds.size === 0 && styles.addToCommunityConfirmBtnDisabled]}
              onPress={handleAddToAnnouncementGroup}
              disabled={selectedGuestIds.size === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.addToCommunityConfirmBtnText}>Add to Announcement Group</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
    marginTop: 8,
    overflow: 'visible',
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
    marginBottom: 12,
  },
  cardExpanded: {
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  badgeContainer: {
    position: 'absolute',
    left: -6,
    top: -6,
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
    paddingRight: 16,
    gap: 8,
  },
  titleRowWithAvatars: {
    paddingRight: 100, // Space for stacked avatars (3×32 - overlap)
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  dateInline: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
  },
  description: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    marginBottom: 12,
  },
  avatarsContainerTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  viewTicketDistributionButton: {
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  viewTicketDistributionButtonText: {
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: '600',
  },
  registeredSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  registeredSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
  },
  guestsLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  registeredEmpty: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  registeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  registeredText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 12,
  },
  registeredName: {
    fontWeight: '600',
  },
  registeredAction: {
    fontWeight: '400',
    color: '#8E8E93',
  },
  createGroupButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  addToCommunityOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  addToCommunityModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  addToCommunityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addToCommunityModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  addToCommunityModalSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
  },
  addToCommunityGuestList: {
    maxHeight: 240,
    marginBottom: 16,
  },
  addToCommunityGuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  addToCommunityGuestName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  addToCommunityCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCommunityCheckboxSelected: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  addToCommunitySelectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 14,
    paddingRight: 4,
    marginTop: 4,
  },
  addToCommunitySelectAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 10,
  },
  addToCommunityConfirmBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  addToCommunityConfirmBtnDisabled: {
    opacity: 0.5,
  },
  addToCommunityConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
