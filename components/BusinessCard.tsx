import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, Alert, Share } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import Avatar from './Avatar';
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
}

// Base Business Card Component
function BusinessCardBase({
  plan,
  user,
  attendeesCount = 0,
  containerStyle,
  onPress,
  onRegisterPress,
  onRequireAuth,
  onRepostPress,
}: Omit<BusinessCardProps, 'isSwipeable'> & { onRepostPress?: () => void }) {
  const mainImage = plan.media && plan.media.length > 0 ? plan.media[0].url : 'https://picsum.photos/id/1011/200/300';
  const organizerName = user?.name || plan.user?.name || 'Organizer';
  const organizerAvatar = user?.avatar || plan.user?.profile_image;
  const timeText = user?.time || (plan.date ? new Date(plan.date).toLocaleDateString() : '');

  const handleShare = async () => {
    try {
      if (!plan.plan_id) {
        Alert.alert('Error', 'Plan ID not found');
        return;
      }

      const planUrl = `https://vybeme.com/plan/${plan.plan_id}`;
      const shareMessage = `Check out this event: ${plan.title}\n\n${planUrl}`;

      await Share.share({
        message: shareMessage,
        url: planUrl,
        title: plan.title,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share plan');
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.cardContainer, containerStyle]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Main Image */}
      <Image source={{ uri: mainImage }} style={styles.mainImage} resizeMode="cover" />
      
      {/* Organizer Info Overlay (Top Left) */}
      <View style={styles.organizerPill}>
        <Avatar uri={organizerAvatar} size={32} />
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerName}>{organizerName}</Text>
          <Text style={styles.organizerTime}>{timeText}</Text>
        </View>
      </View>

      {/* Attendees Count (Top Right) */}
      {attendeesCount > 0 && (
        <View style={styles.attendeesPill}>
          <View style={styles.avatarStack}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.stackedAvatar, { marginLeft: i === 1 ? 0 : -8 }]}>
                <Avatar uri={`https://i.pravatar.cc/150?u=${i}`} size={24} />
              </View>
            ))}
          </View>
          <Text style={styles.attendeesText}>+{attendeesCount}</Text>
        </View>
      )}

      {/* Content Panel (Bottom Overlay) */}
      <View style={styles.contentPanel}>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {plan.description}
        </Text>

        {/* Tags */}
        {plan.category_sub && plan.category_sub.length > 0 && (
          <View style={styles.tagsContainer}>
            {plan.category_sub.slice(0, 3).map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Ionicons name="checkbox" size={12} color="#555" style={{ marginRight: 4 }} />
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
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={onRepostPress}
          >
            <Ionicons name="repeat-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleShare}
          >
            <Ionicons name="paper-plane-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
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
}: BusinessCardProps) {
  const { isAuthenticated, user: authUser } = useAppSelector((state) => state.auth);
  const [saving, setSaving] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

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
        />
        <RepostModal
          visible={showRepostModal}
          onClose={() => setShowRepostModal(false)}
          postId={plan.plan_id}
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
        />
      </Swipeable>
      <RepostModal
        visible={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        postId={plan.plan_id}
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
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mainImage: {
    width: '100%',
    height: 300,
  },
  organizerPill: {
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
  organizerInfo: {
    marginLeft: 8,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  organizerTime: {
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
    marginTop: -20,
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
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
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
