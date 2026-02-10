import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import { Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Share } from 'react-native';

const CARD_FIXED_HEIGHT = 400;
const CARD_IMAGE_PERCENT = 0.7;
const CARD_WHITE_PERCENT = 0.3;
const FLOATING_BUTTON_SIZE = 48;
const TEXT_INSET = 7;
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAppSelector } from '@/store/hooks';
import { apiService, getWebBaseUrl } from '@/services/api';
import Avatar from './Avatar';
import GuestListModal from './GuestListModal';
import RepostModal from './RepostModal';

interface BusinessCardProps {
  plan: {
    plan_id: string;
    title: string;
    description: string;
    media?: Array<{ url: string; type: string }>;
    location_text?: string;
    date?: string | Date;
    time?: string;
    category_main?: string;
    category_sub?: string[];
    add_details?: Array<{ detail_type: string; title?: string; description?: string }>;
    passes?: Array<{
      pass_id: string;
      name: string;
      price: number;
      description?: string;
      capacity?: number;
    }>;
    user?: {
      user_id: string;
      name: string;
      profile_image?: string;
    };
    joins_count?: number;
  };
  user?: {
    id: string;
    name: string;
    avatar: string;
    time: string;
  };
  attendeesCount?: number;
  /** Up to 3 attendee avatars (e.g. from guest list or feed interacted_users) */
  interactedUsers?: Array<{ id: string; avatar?: string | null }>;
  isSwipeable?: boolean;
  hideActions?: boolean;
  containerStyle?: any;
  onPress?: () => void;
  onRegisterPress?: () => void;
  onRequireAuth?: () => void;
  onGuestListPress?: () => void;
  onSharePress?: () => void;
  /** Show a small arrow on the right; when tapped, calls onArrowPress (e.g. open business posts list) */
  showArrowButton?: boolean;
  onArrowPress?: () => void;
  /** When true, hide Register button (e.g. business user viewing their own event) */
  hideRegisterButton?: boolean;
  /** When true, pills stick above the card (same hack as event card) for list layouts */
  pillsAboveCard?: boolean;
}

// Base Business Card – "Happening near me": image behind, white content panel overlay on bottom, user pill on top-left border
function BusinessCardBase({
  plan,
  user,
  attendeesCount = 0,
  interactedUsers = [],
  containerStyle,
  onPress,
  onRegisterPress,
  onRequireAuth,
  onRepostPress,
  onSharePress,
  onGuestListPress,
  hideActions = false,
  showArrowButton,
  onArrowPress,
  hideRegisterButton = false,
  pillsAboveCard = false,
}: Omit<BusinessCardProps, 'isSwipeable'> & { onRepostPress?: () => void; onSharePress?: () => void; onGuestListPress?: () => void; interactedUsers?: Array<{ id: string; avatar?: string | null }>; hideActions?: boolean; hideRegisterButton?: boolean; pillsAboveCard?: boolean }) {
  const router = useRouter();
  const mainImage = plan.media && plan.media.length > 0 ? plan.media[0].url : undefined;
  const organizerName = user?.name || plan.user?.name || 'Organizer';
  const organizerAvatar = user?.avatar || plan.user?.profile_image;
  const organizerUserId = plan.user?.user_id;
  const timeText = user?.time || (plan.date ? new Date(plan.date).toLocaleDateString() : '');
  const passes = plan.passes || [];
  const prices = passes.filter((p) => p.price > 0).map((p) => p.price);
  const firstTicketPrice = prices.length > 0 ? Math.min(...prices) : null;
  const addDetails = plan.add_details || [];
  const detailByType = (type: string) => addDetails.find((d) => d.detail_type === type);
  const distanceLabel = detailByType('distance')?.title || detailByType('distance')?.description;
  const fbLabel = detailByType('f&b')?.title || detailByType('f&b')?.description;
  const locationLabel = plan.location_text?.trim();
  // Only these 4 tags: price, distance, F&B, location – nothing else
  const cardTags: { type: 'price' | 'distance' | 'fb' | 'location'; label: string }[] = [];
  if (firstTicketPrice != null && firstTicketPrice > 0) cardTags.push({ type: 'price', label: `₹${firstTicketPrice}` });
  if (distanceLabel) cardTags.push({ type: 'distance', label: distanceLabel });
  if (fbLabel) cardTags.push({ type: 'fb', label: fbLabel });
  if (locationLabel) cardTags.push({ type: 'location', label: locationLabel });
  const tagsToShow = cardTags.slice(0, 4);
  const displayUsers = interactedUsers?.slice(0, 3) || [];

  const handleShare = async () => {
    if (onSharePress) {
      onSharePress();
      return;
    }
    try {
      if (!plan.plan_id) {
        Alert.alert('Error', 'Plan ID not found');
        return;
      }
      const planUrl = `${getWebBaseUrl()}/go/post/${plan.plan_id}`;
      const shareMessage = `Check out this event: ${plan.title}\n\n${planUrl}`;
      await Share.share({ message: shareMessage, url: planUrl, title: plan.title });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share plan');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.cardWrapper, containerStyle]}
      onPress={onPress}
      activeOpacity={0.98}
    >
      {/* 1. Image top 70% – when pillsAboveCard, marginTop leaves room for pills above */}
      <View style={[styles.cardInner, pillsAboveCard && styles.cardInnerWithPillsAbove]}>
        <View style={styles.imageSection}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.imageNatural} resizeMode="cover" />
          ) : (
            <View style={[styles.imageNatural, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={48} color="#8E8E93" />
            </View>
          )}
        </View>
        {/* 2. White bottom 30% */}
        <View style={styles.whiteSection} />

        {/* 3. Text section – stuck to bottom, 2px from bottom/left/right */}
        <View style={styles.textBottom} pointerEvents="box-none">
          <View style={styles.textBottomInner}>
            <Text style={styles.title}>{plan.title}</Text>
            <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
              {plan.description}
            </Text>
            {tagsToShow.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScrollContent}
                style={styles.tagsScroll}
                nestedScrollEnabled
              >
                {tagsToShow.map((item, index) => (
                  <View key={`${item.type}-${index}`} style={styles.tag}>
                    {item.type === 'price' ? (
                      <Ionicons name="checkmark-circle" size={12} color="#3C3C43" style={styles.tagIcon} />
                    ) : (
                      <Ionicons name="ellipse" size={8} color="#3C3C43" style={styles.tagIcon} />
                    )}
                    <Text style={styles.tagText} numberOfLines={1}>{item.label}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            {!hideActions && (
              <View style={styles.footer}>
                {!hideRegisterButton && (
                  <TouchableOpacity style={styles.registerButton} onPress={onRegisterPress}>
                    <Text style={styles.registerButtonText}>Register</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.iconButton} onPress={onRepostPress}>
                  <Ionicons name="repeat-outline" size={22} color="#1C1C1E" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                  <Ionicons name="paper-plane-outline" size={22} color="#1C1C1E" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Button on right – 50% inside card, 50% outside, vertical center */}
      {showArrowButton && onArrowPress && (
        <TouchableOpacity
          style={styles.floatingRightButton}
          onPress={(e) => {
            e?.stopPropagation?.();
            onArrowPress();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-forward" size={24} color="#1C1C1E" />
        </TouchableOpacity>
      )}

      {/* Organizer pill – tappable to open organizer profile */}
      <TouchableOpacity
        style={[styles.organizerPill, pillsAboveCard && styles.organizerPillAbove]}
        activeOpacity={0.8}
        onPress={(e) => {
          e?.stopPropagation?.();
          if (organizerUserId) {
            router.push({ pathname: '/profile/[userId]', params: { userId: organizerUserId } } as any);
          }
        }}
        disabled={!organizerUserId}
      >
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerName} numberOfLines={1}>{organizerName}</Text>
          <Text style={styles.organizerTime} numberOfLines={1}>{timeText}</Text>
        </View>
        <Avatar uri={organizerAvatar} size={26} style={styles.organizerAvatarRight} />
      </TouchableOpacity>

      {/* Attendees – always 3 circles (avatars or default DP), then +counter (FIGMA) */}
      {onGuestListPress && (
        <TouchableOpacity
          style={[
            styles.interactedPillOnImage,
            showArrowButton && styles.interactedPillOnImageWithArrow,
            pillsAboveCard && styles.interactedPillAbove,
          ]}
          onPress={(e) => {
            e?.stopPropagation?.();
            onGuestListPress?.();
          }}
          activeOpacity={0.8}
        >
          {[0, 1, 2].map((idx) => {
            const u = displayUsers[idx];
            return (
              <View key={u?.id ?? idx} style={[styles.interactedAvatarWrap, { marginLeft: idx === 0 ? 0 : -10, zIndex: 3 - idx }]}>
                <Avatar uri={u?.avatar ?? undefined} size={20} />
              </View>
            );
          })}
          {attendeesCount > 0 && <Text style={styles.interactedPlus}>+{attendeesCount}</Text>}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// Swipeable Business Card Wrapper
export default function BusinessCard({
  plan,
  user,
  attendeesCount,
  interactedUsers: interactedUsersProp,
  isSwipeable = true,
  hideActions = false,
  hideRegisterButton = false,
  containerStyle,
  onPress,
  onRegisterPress,
  onRequireAuth,
  onSharePress,
  onGuestListPress: onGuestListPressProp,
  showArrowButton,
  onArrowPress,
  pillsAboveCard = false,
}: BusinessCardProps) {
  const { isAuthenticated, user: authUser } = useAppSelector((state) => state.auth);
  const [saving, setSaving] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showGuestListModal, setShowGuestListModal] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const handleGuestListPress = () => {
    if (onGuestListPressProp) {
      onGuestListPressProp();
    } else {
      setShowGuestListModal(true);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !authUser?.user_id || !authUser?.access_token) {
      onRequireAuth?.();
      return;
    }

    if (!plan.plan_id) {
      Alert.alert('Error', 'Plan ID not found');
      return;
    }

    setSaving(true);
    try {
      await apiService.savePost(authUser.access_token, authUser.user_id, plan.plan_id);
      swipeableRef.current?.close();
      Alert.alert('Success', 'Plan saved!');
    } catch (error: any) {
      if (error.message?.includes('already saved')) {
        Alert.alert('Info', 'Plan is already saved');
        swipeableRef.current?.close();
      } else {
        Alert.alert('Error', error.message || 'Failed to save plan');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderLeftActions = (progress: any, dragX: any) => {
    const trans = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [-20, 0],
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
    if (direction === 'left' && !isAuthenticated && onRequireAuth) {
      onRequireAuth();
      return false;
    }
    return true;
  };

  const handleSwipeableOpen = (direction: 'left' | 'right') => {
    if (direction === 'left' && isAuthenticated && authUser?.user_id) {
      handleSave();
    }
  };

  const handleRepost = () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setShowRepostModal(true);
  };

  const organizerName = user?.name || plan.user?.name || 'Organizer';

  // If not swipeable, render base card directly
  if (!isSwipeable) {
    return (
      <>
        <BusinessCardBase
          plan={plan}
          user={user}
          attendeesCount={attendeesCount}
          interactedUsers={interactedUsersProp}
          containerStyle={containerStyle}
          onPress={onPress}
          onRegisterPress={onRegisterPress}
          onRequireAuth={onRequireAuth}
          onRepostPress={handleRepost}
          onSharePress={onSharePress}
          onGuestListPress={handleGuestListPress}
          hideActions={hideActions}
          hideRegisterButton={hideRegisterButton}
          showArrowButton={showArrowButton}
          onArrowPress={onArrowPress}
          pillsAboveCard={pillsAboveCard}
        />
        <GuestListModal
          visible={showGuestListModal}
          onClose={() => setShowGuestListModal(false)}
          planId={plan.plan_id}
          onRegisterPress={() => {
            setShowGuestListModal(false);
            onRegisterPress?.();
          }}
        />
        <RepostModal
          visible={showRepostModal}
          onClose={() => setShowRepostModal(false)}
          originalPlanId={plan.plan_id}
          originalPostTitle={plan.title}
          originalPostDescription={plan.description}
          originalAuthorName={organizerName}
          onSuccess={() => {
            setShowRepostModal(false);
            // Optionally refresh or update UI
          }}
        />
      </>
    );
  }

  // If swipeable, wrap in Swipeable component
  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        containerStyle={styles.swipeContainer}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        onSwipeableOpen={handleSwipeableOpen}
      >
        <BusinessCardBase
          plan={plan}
          user={user}
          attendeesCount={attendeesCount}
          interactedUsers={interactedUsersProp}
          containerStyle={containerStyle}
          onPress={onPress}
          onRegisterPress={onRegisterPress}
          onRequireAuth={onRequireAuth}
          onRepostPress={handleRepost}
          onSharePress={onSharePress}
          onGuestListPress={handleGuestListPress}
          hideActions={hideActions}
          hideRegisterButton={hideRegisterButton}
          showArrowButton={showArrowButton}
          onArrowPress={onArrowPress}
          pillsAboveCard={pillsAboveCard}
        />
      </Swipeable>
      <GuestListModal
        visible={showGuestListModal}
        onClose={() => setShowGuestListModal(false)}
        planId={plan.plan_id}
        onRegisterPress={() => {
          setShowGuestListModal(false);
          onRegisterPress?.();
        }}
      />
      <RepostModal
        visible={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        originalPlanId={plan.plan_id}
        originalPostTitle={plan.title}
        originalPostDescription={plan.description}
        originalAuthorName={organizerName}
        onSuccess={() => {
          setShowRepostModal(false);
          // Optionally refresh or update UI
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 25,
  },
  cardWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: CARD_FIXED_HEIGHT,
    position: 'relative',
    overflow: 'visible',
  },
  cardInner: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: '#FFF',
  },
  cardInnerWithPillsAbove: {
    marginTop: 44,
  },
  imageSection: {
    width: '100%',
    flex: CARD_IMAGE_PERCENT,
    overflow: 'hidden',
  },
  imageNatural: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteSection: {
    flex: CARD_WHITE_PERCENT,
    backgroundColor: '#FFF',
  },
  textBottom: {
    position: 'absolute',
    left: TEXT_INSET,
    right: TEXT_INSET,
    bottom: TEXT_INSET,
    justifyContent: 'flex-end',
  },
  textBottomInner: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  floatingRightButton: {
    position: 'absolute',
    right: -FLOATING_BUTTON_SIZE / 2,
    top: '50%',
    marginTop: -FLOATING_BUTTON_SIZE / 2,
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    borderRadius: FLOATING_BUTTON_SIZE / 2,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  organizerPill: {
    position: 'absolute',
    top: -10,
    left: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  organizerPillAbove: {
    top: 16,
    left: -6,
    backgroundColor: '#FFF',
  },
  interactedPillAbove: {
    top: 26,
  },
  organizerInfo: {
    flex: 1,
    minWidth: 0,
  },
  organizerAvatarRight: {
    marginLeft: 8,
  },
  organizerName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  organizerTime: {
    fontSize: 10,
    color: '#888',
  },
  interactedPillOnImage: {
    position: 'absolute',
    top: -10,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 14,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  interactedPillOnImageWithArrow: {
    right: 56,
  },
  interactedAvatarWrap: {
    width: 20,
    height: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
  },
  interactedPlus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsScroll: {
    marginBottom: 12,
    maxHeight: 36,
    flexGrow: 0,
  },
  tagsScrollContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
  },
  tagIcon: {
    marginRight: 2,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    minHeight: 44,
    marginTop: 4,
  },
  registerButton: {
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    paddingLeft: 16,
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
});
