import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, Alert, Share } from 'react-native';
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
    category_sub?: string[];
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
  isSwipeable?: boolean;
  containerStyle?: any;
  onPress?: () => void;
  onRegisterPress?: () => void;
  onRequireAuth?: () => void;
  onGuestListPress?: () => void;
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
  onGuestListPress,
}: Omit<BusinessCardProps, 'isSwipeable'> & { onRepostPress?: () => void; onGuestListPress?: () => void; interactedUsers?: Array<{ id: string; avatar?: string }> }) {
  const mainImage = plan.media && plan.media.length > 0 ? plan.media[0].url : undefined;
  const organizerName = user?.name || plan.user?.name || 'Organizer';
  const organizerAvatar = user?.avatar || plan.user?.profile_image;
  const timeText = user?.time || (plan.date ? new Date(plan.date).toLocaleDateString() : '');
  const tags = plan.category_sub || [];
  const tagsToShow = tags.slice(0, 4);
  const remainingTags = Math.max(0, tags.length - tagsToShow.length);
  const passes = plan.passes || [];
  const prices = passes.filter((p) => p.price > 0).map((p) => p.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const showInteracted = attendeesCount > 0 || (interactedUsers && interactedUsers.length > 0);
  const displayUsers = interactedUsers?.slice(0, 3) || [];

  const handleShare = async () => {
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
      {/* Inner card (clipped) – image + white overlay only */}
      <View style={styles.cardInner}>
        <View style={styles.imageBehind}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.imageBehindImg} resizeMode="cover" />
          ) : (
            <View style={[styles.imageBehindImg, styles.imageBehindPlaceholder]}>
              <Ionicons name="image-outline" size={48} color="#8E8E93" />
            </View>
          )}
        </View>
        <View style={styles.contentOverlay}>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
          {plan.description}
        </Text>
        {(minPrice != null || tags.length > 0) && (
          <View style={styles.tagsContainer}>
            {minPrice != null && (
              <View style={styles.tag}>
                <Ionicons name="checkmark-circle" size={12} color="#3C3C43" style={styles.tagIcon} />
                <Text style={styles.tagText}>₹{minPrice}</Text>
              </View>
            )}
            {tagsToShow.map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Ionicons
                  name={tag.toLowerCase().includes('evening') ? 'cloud-outline' : 'checkmark-circle'}
                  size={12}
                  color="#3C3C43"
                  style={styles.tagIcon}
                />
                <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
            {remainingTags > 0 && (
              <View style={styles.tag}>
                <Ionicons name="add" size={12} color="#3C3C43" style={styles.tagIcon} />
                <Text style={styles.tagText} numberOfLines={1}>+{remainingTags}</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.registerButton} onPress={onRegisterPress}>
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onRepostPress}>
            <Ionicons name="repeat-outline" size={22} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="paper-plane-outline" size={22} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
      </View>
      </View>

      {/* User pill – hovers slightly outside card, small (~25% width) */}
      <View style={styles.organizerPill} pointerEvents="none">
        <Avatar uri={organizerAvatar} size={26} />
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerName} numberOfLines={1}>{organizerName}</Text>
          <Text style={styles.organizerTime} numberOfLines={1}>{timeText}</Text>
        </View>
      </View>

      {/* Attendees pill – tap to open guest list modal */}
      {onGuestListPress && (
        <TouchableOpacity
          style={styles.interactedPillOnImage}
          onPress={(e) => {
            e?.stopPropagation?.();
            onGuestListPress?.();
          }}
          activeOpacity={0.8}
        >
          {showInteracted ? (
            displayUsers.length > 0 ? (
              displayUsers.map((u: any, idx: number) => (
                <View key={u.id || idx} style={[styles.interactedAvatarWrap, { marginLeft: idx === 0 ? 0 : -10, zIndex: 3 - idx }]}>
                  <Avatar uri={u.avatar} size={20} />
                </View>
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <View key={i} style={[styles.interactedAvatarWrap, { marginLeft: i === 1 ? 0 : -10, zIndex: 4 - i }]}>
                  <Avatar uri={`https://i.pravatar.cc/150?u=${i}`} size={20} />
                </View>
              ))
            )
          ) : (
            <Ionicons name="people-outline" size={18} color="#1C1C1E" />
          )}
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
  isSwipeable = true,
  containerStyle,
  onPress,
  onRegisterPress,
  onRequireAuth,
  onGuestListPress: onGuestListPressProp,
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
          containerStyle={containerStyle}
          onPress={onPress}
          onRegisterPress={onRegisterPress}
          onRequireAuth={onRequireAuth}
          onRepostPress={handleRepost}
          onGuestListPress={handleGuestListPress}
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
          containerStyle={containerStyle}
          onPress={onPress}
          onRegisterPress={onRegisterPress}
          onRequireAuth={onRequireAuth}
          onRepostPress={handleRepost}
          onGuestListPress={handleGuestListPress}
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
    height: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  cardInner: {
    position: 'absolute',
    top: 25,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  imageBehind: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  imageBehindImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  imageBehindPlaceholder: {
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerPill: {
    position: 'absolute',
    top: 0,
    left: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 18,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  organizerInfo: {
    marginLeft: 6,
    flex: 1,
    minWidth: 0,
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
    top: 10,
    right: 18,
    zIndex: 11,
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
  contentOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: '52%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
    gap: 8,
  },
  registerButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
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
