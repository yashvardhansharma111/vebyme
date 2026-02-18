import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import { Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

const CARD_FIXED_HEIGHT = 400;
const CARD_IMAGE_PERCENT = 0.7;
const CARD_WHITE_PERCENT = 0.3;
const FLOATING_BUTTON_SIZE = 48;
const TEXT_INSET = 7;
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAppSelector } from '@/store/hooks';
import { apiService, getWebBaseUrl } from '@/services/api';
import { fontTitle, fontBody } from '@/constants/theme';
import Avatar from './Avatar';
import GuestListModal from './GuestListModal';

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
    temporal_tags?: string[];
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
  /** When true, show Register button but greyed/disabled (e.g. user's own plan) */
  registerButtonGreyed?: boolean;
  /** When true, pills stick above the card (same hack as event card) for list layouts */
  pillsAboveCard?: boolean;
  /** When true, card fills parent height (e.g. hero 75% viewport on homepage) */
  fillHeight?: boolean;
  /** When true, reduce vertical padding/margin (e.g. business-posts list) */
  compactVerticalPadding?: boolean;
  /** Max lines for description (default 4). Use 2 for business plans list. */
  descriptionNumberOfLines?: number;
  /** When true, no shadow on the card (e.g. business-posts list) */
  hideCardShadow?: boolean;
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
  onSharePress,
  onGuestListPress,
  hideActions = false,
  showArrowButton,
  onArrowPress,
  hideRegisterButton = false,
  registerButtonGreyed = false,
  pillsAboveCard = false,
  fillHeight = false,
  compactVerticalPadding = false,
  descriptionNumberOfLines = 4,
  hideCardShadow = false,
}: Omit<BusinessCardProps, 'isSwipeable'> & { onSharePress?: () => void; onGuestListPress?: () => void; interactedUsers?: Array<{ id: string; avatar?: string | null }>; hideActions?: boolean; hideRegisterButton?: boolean; registerButtonGreyed?: boolean; pillsAboveCard?: boolean; fillHeight?: boolean; compactVerticalPadding?: boolean; descriptionNumberOfLines?: number; hideCardShadow?: boolean }) {
  const router = useRouter();
  const planMedia = plan.media && plan.media.length > 0 ? plan.media : [];
  const mainImage = planMedia.length > 0 ? planMedia[0].url : undefined;
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryScrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = Dimensions.get('window');
  const galleryPaddingH = 24;
  const gallerySlideWidth = screenWidth - galleryPaddingH * 2;
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
  // Tags order: Amount, Additional settings (add_details), Category
  const cardTags: { type: 'price' | 'distance' | 'fb' | 'location' | 'category' | 'temporal' | 'additional'; label: string }[] = [];
  if (firstTicketPrice != null && firstTicketPrice > 0) cardTags.push({ type: 'price', label: `₹${firstTicketPrice}` });
  else if (firstTicketPrice === 0 || (passes.length > 0 && firstTicketPrice == null)) cardTags.push({ type: 'price', label: 'Free' });
  addDetails.forEach((d) => {
    const label = d.title || d.description || d.detail_type;
    if (label && String(label).trim()) cardTags.push({ type: 'additional', label: String(label).trim() });
  });
  if (plan.category_main) cardTags.push({ type: 'category', label: plan.category_main });
  if (plan.category_sub?.length) {
    for (const sub of plan.category_sub) {
      if (sub) cardTags.push({ type: 'category', label: sub });
    }
  }
  if (plan.temporal_tags?.length) {
    for (const t of plan.temporal_tags) {
      if (t) cardTags.push({ type: 'temporal', label: t });
    }
  }
  const tagsToShow = cardTags.slice(0, 10);
  const displayUsers = interactedUsers?.slice(0, 3) || [];

  const handleShare = async () => {
    if (onSharePress) {
      onSharePress();
      return;
    }
    if (!plan.plan_id) {
      Alert.alert('Error', 'Plan ID not found');
      return;
    }
    const planUrl = `${getWebBaseUrl()}/go/post/${plan.plan_id}`;
    const storyImageUrl = `${getWebBaseUrl()}/api/og/post/${plan.plan_id}/story`;
    const shareMessage = `Check out this event: ${plan.title}\n\n${planUrl}`;

    Alert.alert('Share', 'Share this event', [
      {
        text: 'Share link',
        onPress: async () => {
          try {
            await Share.share({ message: shareMessage, url: planUrl, title: plan.title });
          } catch (e: any) {
            if (e?.message !== 'User did not share') Alert.alert('Error', e?.message || 'Failed to share');
          }
        },
      },
      {
        text: 'Share to Instagram Story',
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(planUrl);
            Linking.openURL(storyImageUrl);
            Alert.alert(
              'Link copied',
              'Add the image that opened to your Instagram story, then tap the link sticker and paste the link.'
            );
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to copy or open image');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.cardOuterWrapper, fillHeight && styles.cardOuterWrapperFill, compactVerticalPadding && styles.cardOuterWrapperCompactVertical]}>
      <TouchableOpacity
        style={[styles.cardWrapper, fillHeight && styles.cardWrapperFill, containerStyle]}
        onPress={onPress}
        activeOpacity={0.98}
      >
        {/* 1. Image top 70% – when pillsAboveCard, marginTop leaves room for pills above */}
        <View style={[styles.cardInner, pillsAboveCard && styles.cardInnerWithPillsAbove, hideCardShadow && styles.cardInnerNoShadow]}>
        <View style={styles.imageSection}>
          {mainImage ? (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={(e) => {
                e?.stopPropagation?.();
                setGalleryIndex(0);
                setShowImageGallery(true);
              }}
            >
              <Image source={{ uri: mainImage }} style={styles.imageNatural} resizeMode="cover" />
            </TouchableOpacity>
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
            <Text style={styles.description} numberOfLines={descriptionNumberOfLines} ellipsizeMode="tail">
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
                  <View key={`${item.type}-${index}-${item.label}`} style={styles.tag}>
                    {item.type === 'price' ? (
                      <Ionicons name="cash-outline" size={12} color="#3C3C43" style={styles.tagIcon} />
                    ) : item.type === 'category' ? (
                      <Ionicons name="pricetag-outline" size={10} color="#3C3C43" style={styles.tagIcon} />
                    ) : item.type === 'temporal' ? (
                      <Ionicons name="time-outline" size={10} color="#3C3C43" style={styles.tagIcon} />
                    ) : item.type === 'additional' ? (
                      <Ionicons name="options-outline" size={10} color="#3C3C43" style={styles.tagIcon} />
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
                {(!hideRegisterButton || registerButtonGreyed) && (
                  <TouchableOpacity
                    style={[styles.registerButton, registerButtonGreyed && styles.registerButtonGreyed]}
                    onPress={registerButtonGreyed ? undefined : onRegisterPress}
                    disabled={registerButtonGreyed}
                  >
                    <Text style={[styles.registerButtonText, registerButtonGreyed && styles.registerButtonTextGreyed]}>Register</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.footerIconRow}>
                  <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                    <Ionicons name="paper-plane-outline" size={22} color="#1C1C1E" />
                  </TouchableOpacity>
                </View>
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

      {/* Organizer pill – image first, then name & detail (same as SwipeableEventCard user pill) */}
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
        <Avatar uri={organizerAvatar} size={36} />
        <View style={styles.organizerPillText}>
          <Text style={styles.organizerName} numberOfLines={1}>{organizerName}</Text>
          <Text style={styles.organizerTime} numberOfLines={1}>{timeText}</Text>
        </View>
      </TouchableOpacity>

      {/* Attendees: only when joiners > 0. 1→1 circle, 2→2 circles, 3→3 circles, 4+→3 circles + overflow count */}
      {attendeesCount > 0 && (() => {
        const numCircles = Math.min(3, attendeesCount);
        const pillStyle = [
          styles.interactedPillOnImage,
          showArrowButton && styles.interactedPillOnImageWithArrow,
          pillsAboveCard && styles.interactedPillAbove,
        ];
        const content = (
          <>
            {Array.from({ length: numCircles }, (_, idx) => {
              const u = displayUsers[idx];
              return (
                <View key={u?.id ?? idx} style={[styles.interactedAvatarWrap, { marginLeft: idx === 0 ? 0 : -10, zIndex: 3 - idx }]}>
                  <Avatar uri={u?.avatar ?? undefined} size={20} />
                </View>
              );
            })}
            {attendeesCount > 3 && <Text style={styles.interactedPlus}>+{attendeesCount - 3}</Text>}
          </>
        );
        if (onGuestListPress) {
          return (
            <TouchableOpacity
              style={pillStyle}
              onPress={(e) => {
                e?.stopPropagation?.();
                onGuestListPress?.();
              }}
              activeOpacity={0.8}
            >
              {content}
            </TouchableOpacity>
          );
        }
        return <View style={pillStyle}>{content}</View>;
      })()}

      </TouchableOpacity>

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
          <View style={[styles.galleryContentWrap, { paddingHorizontal: galleryPaddingH, paddingTop: 20, paddingBottom: 20, margin: 20 }]} pointerEvents="box-none">
            <ScrollView
              ref={galleryScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScroll}
              contentContainerStyle={styles.galleryScrollContent}
              onMomentumScrollEnd={(e) => {
                const w = e.nativeEvent.layoutMeasurement.width;
                const index = w > 0 ? Math.round(e.nativeEvent.contentOffset.x / w) : 0;
                setGalleryIndex(index);
              }}
            >
              {planMedia.map((item, index) => (
                <View key={index} style={[styles.gallerySlide, { width: gallerySlideWidth }]}>
                  <Image source={{ uri: item.url }} style={styles.galleryImage} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>
            {planMedia.length > 1 && (
              <View style={styles.galleryDots}>
                {planMedia.map((_, i) => (
                  <View key={i} style={[styles.galleryDot, i === galleryIndex && styles.galleryDotActive]} />
                ))}
              </View>
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
    </View>
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
  registerButtonGreyed = false,
  containerStyle,
  onPress,
  onRegisterPress,
  onRequireAuth,
  onSharePress,
  onGuestListPress: onGuestListPressProp,
  showArrowButton,
  onArrowPress,
  pillsAboveCard = false,
  fillHeight = false,
  compactVerticalPadding = false,
  descriptionNumberOfLines = 4,
  hideCardShadow = false,
}: BusinessCardProps) {
  const { isAuthenticated, user: authUser } = useAppSelector((state) => state.auth);
  const [saving, setSaving] = useState(false);
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
          onSharePress={onSharePress}
          onGuestListPress={handleGuestListPress}
          hideActions={hideActions}
          hideRegisterButton={hideRegisterButton}
          registerButtonGreyed={registerButtonGreyed}
          showArrowButton={showArrowButton}
          onArrowPress={onArrowPress}
          pillsAboveCard={pillsAboveCard}
          fillHeight={fillHeight}
          compactVerticalPadding={compactVerticalPadding}
          descriptionNumberOfLines={descriptionNumberOfLines}
          hideCardShadow={hideCardShadow}
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
      </>
    );
  }

  // If swipeable, wrap in Swipeable component
  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        containerStyle={[styles.swipeContainer, compactVerticalPadding && styles.swipeContainerCompact]}
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
          onSharePress={onSharePress}
          onGuestListPress={handleGuestListPress}
          hideActions={hideActions}
          hideRegisterButton={hideRegisterButton}
          registerButtonGreyed={registerButtonGreyed}
          showArrowButton={showArrowButton}
          onArrowPress={onArrowPress}
          pillsAboveCard={pillsAboveCard}
          fillHeight={fillHeight}
          compactVerticalPadding={compactVerticalPadding}
          descriptionNumberOfLines={descriptionNumberOfLines}
          hideCardShadow={hideCardShadow}
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
    </>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 25,
  },
  swipeContainerCompact: {
    marginBottom: 12,
  },
  cardWrapper: {
    marginHorizontal: 1,
    marginBottom: 16,
    height: CARD_FIXED_HEIGHT,
    position: 'relative',
    overflow: 'visible',
  },
  cardWrapperFill: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  cardOuterWrapper: {
    paddingHorizontal: 0,
    paddingVertical: 18,
  },
  cardOuterWrapperFill: {
    flex: 1,
    paddingVertical: 0,
  },
  cardOuterWrapperCompactVertical: {
    paddingVertical: 8,
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
  cardInnerNoShadow: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  organizerPill: {
    position: 'absolute',
    top: -20,
    left: 10,
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
  organizerPillAbove: {
    top: 16,
    left: 0,
    backgroundColor: '#FFF',
  },
  interactedPillAbove: {
    top: 26,
  },
  organizerPillText: {
    marginLeft: 8,
    flex: 1,
    minWidth: 0,
  },
  organizerInfo: {
    flex: 1,
    minWidth: 0,
  },
  organizerAvatarRight: {
    marginLeft: 8,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fontTitle,
    color: '#1C1C1E',
  },
  organizerTime: {
    fontSize: 11,
    fontFamily: fontBody,
    color: '#8E8E93',
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
    right: 0,
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
    fontFamily: fontTitle,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: fontBody,
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
    fontFamily: fontBody,
    color: '#1C1C1E',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 44,
    marginTop: 4,
  },
  registerButton: {
    flex: 1,
    maxWidth: '65%',
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  registerButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: fontTitle,
  },
  registerButtonGreyed: {
    backgroundColor: '#C5C5D0',
  },
  registerButtonTextGreyed: {
    color: '#8E8E93',
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
    fontFamily: fontBody,
    color: '#1C1C1E',
  },
  galleryOverlay: {
    flex: 1,
    backgroundColor: '#2C2C2E',
  },
  galleryContentWrap: {
    flex: 1,
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
    borderRadius: 12,
  },
  galleryDots: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  galleryDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
  },
});
