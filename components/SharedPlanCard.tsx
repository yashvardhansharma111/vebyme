import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

export interface SharedPlanCardPlan {
  plan_id?: string;
  title: string;
  description: string;
  media?: any[];
  tags?: string[];
  category_main?: string;
  category_sub?: string[];
  is_business?: boolean;
}

interface SharedPlanCardProps {
  plan: SharedPlanCardPlan;
  /** When user taps Register/Join or the card body – open plan detail */
  onJoinPress?: () => void;
  /** When user taps the card (not just the button) – open plan preview/detail */
  onCardPress?: () => void;
  onSharePress?: () => void;
  containerStyle?: ViewStyle;
  /** Compact mode for inside chat bubbles (slightly smaller) */
  compact?: boolean;
  /** Optional: show sender like feed (avatar + name + time) */
  senderName?: string;
  senderTime?: string;
  senderAvatar?: string | null;
  /** Position of sender pill: left (received) or right (sent) - matches chat alignment */
  pillPosition?: 'left' | 'right';
}

function getMediaUrl(mediaItem: any): string | null {
  if (!mediaItem) return null;
  return typeof mediaItem === 'string' ? mediaItem : mediaItem?.url ?? null;
}

function getPlanMedia(plan: SharedPlanCardPlan): any[] {
  if (Array.isArray(plan.media) && plan.media.length > 0) return plan.media;
  const p = plan as any;
  const single = p.image ?? p.plan_image ?? p.media_url ?? p.url ?? (p.media?.[0] ? (typeof p.media[0] === 'string' ? p.media[0] : p.media[0]?.url) : null);
  if (single) return [typeof single === 'string' ? { url: single } : single];
  return [];
}

function getPlanTags(plan: SharedPlanCardPlan): string[] {
  const p = plan as any;
  const fromArray = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : String(x))).filter(Boolean);
    return typeof v === 'string' && v.trim() ? [v.trim()] : [];
  };
  const seen = new Set<string>();
  const add = (arr: string[]) => {
    arr.forEach((t) => {
      const s = (t || '').trim();
      if (s) seen.add(s);
    });
  };
  add(fromArray(p.tags));
  add(fromArray(p.category_sub));
  add(fromArray(p.categories));
  if (p.category_main && typeof p.category_main === 'string') add([p.category_main]);
  if (p.category && typeof p.category === 'string') add([p.category]);
  return Array.from(seen);
}

export default function SharedPlanCard({
  plan,
  onJoinPress,
  onCardPress,
  onSharePress,
  containerStyle,
  compact = false,
  senderName,
  senderTime,
  senderAvatar,
  pillPosition = 'left',
}: SharedPlanCardProps) {
  const [imageError, setImageError] = useState(false);
  const media = getPlanMedia(plan);
  const mediaItem = media[0];
  const mediaUri = getMediaUrl(mediaItem);
  const hasImage = mediaUri && mediaUri.trim() !== '' && !imageError;

  const tags = getPlanTags(plan);
  const isBusiness = plan.is_business === true;
  const actionLabel = isBusiness ? 'Register' : 'Join';
  const showSender = senderName != null || senderTime != null;

  const openPlan = onCardPress ?? onJoinPress;
  const handleAction = () => {
    (onJoinPress ?? onCardPress)?.();
  };

  return (
    <View style={[styles.cardOuter, showSender && styles.cardOuterWithPill, containerStyle]}>
      {/* White card – tappable to open plan preview/detail */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={openPlan}
        style={[styles.card, compact && styles.cardCompact, showSender && (compact ? styles.cardWithPillCompact : styles.cardWithPill)]}
      >
        {/* Hero image (business) - or default placeholder when no image */}
        {isBusiness && (
          hasImage ? (
            <Image
              source={{ uri: mediaUri! }}
              style={compact ? styles.heroImageCompact : styles.heroImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[compact ? styles.heroImageCompact : styles.heroImage, styles.defaultImagePlaceholder]}>
              <Ionicons name="image-outline" size={40} color="#8E8E93" />
            </View>
          )
        )}

        <View style={[styles.content, compact && styles.contentCompact, isBusiness && styles.contentAfterHero]}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
          {plan.title}
        </Text>
        <Text style={[styles.description, compact && styles.descriptionCompact]} numberOfLines={3}>
          {plan.description}
        </Text>

        <View style={[styles.middleRow, compact && styles.middleRowCompact]}>
          <View style={[styles.tagsContainer, compact && styles.tagsContainerCompact]}>
            {tags.map((tag: string, i: number) => (
              <View key={i} style={[styles.tag, compact && styles.tagCompact]}>
                <Ionicons
                  name={
                    tag === 'Hitchhiking'
                      ? 'walk'
                      : tag === 'Weekend'
                        ? 'calendar-outline'
                        : 'pricetag-outline'
                  }
                  size={compact ? 10 : 12}
                  color="#555"
                  style={{ marginRight: compact ? 3 : 4 }}
                />
                <Text style={[styles.tagText, compact && styles.tagTextCompact]} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
          {/* Small image on right - or default placeholder when no image */}
          {!isBusiness && (
            hasImage ? (
              <Image
                source={{ uri: mediaUri! }}
                style={compact ? styles.sideImageCompact : styles.sideImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[compact ? styles.sideImageCompact : styles.sideImage, styles.defaultImagePlaceholder]}>
                <Ionicons name="image-outline" size={compact ? 20 : 28} color="#8E8E93" />
              </View>
            )
          )}
        </View>

        {/* Footer: Join/Register on left, Share icon on right (clear border for iOS) */}
        <View style={[styles.footer, compact && styles.footerCompact]}>
          <TouchableOpacity style={[styles.actionButton, compact && styles.actionButtonCompact]} onPress={handleAction} activeOpacity={0.8}>
            <Text style={[styles.actionButtonText, compact && styles.actionButtonTextCompact]}>{actionLabel}</Text>
          </TouchableOpacity>
          <View style={[styles.footerIcons, compact && styles.footerIconsCompact]}>
            <TouchableOpacity style={[styles.footerIconBtn, compact && styles.footerIconBtnCompact]} onPress={onSharePress ?? (() => {})}>
              <Ionicons name="share-outline" size={compact ? 18 : 22} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </TouchableOpacity>

      {/* Sender pill - half outside, half on top edge (left or right per message side) */}
      {showSender && (
        <View style={[styles.senderPill, compact && styles.senderPillCompact, pillPosition === 'right' && styles.senderPillRight, compact && pillPosition === 'right' && styles.senderPillRightCompact]}>
          <Avatar uri={senderAvatar ?? null} size={compact ? 28 : 32} />
          <View style={[styles.senderTextWrap, compact && styles.senderTextWrapCompact]}>
            {senderName != null && <Text style={[styles.senderName, compact && styles.senderNameCompact]} numberOfLines={1}>{senderName}</Text>}
            {senderTime != null && <Text style={[styles.senderTime, compact && styles.senderTimeCompact]}>{senderTime}</Text>}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    overflow: 'visible',
    marginBottom: 8,
  },
  cardOuterWithPill: {
    marginTop: 28,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardCompact: {
    borderRadius: 18,
    padding: 12,
    paddingTop: 12,
    minWidth: 260,
    maxWidth: 280,
  },
  cardWithPill: {
    paddingTop: 35,
  },
  cardWithPillCompact: {
    paddingTop: 28,
  },
  heroImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E5EA',
    marginHorizontal: -20,
    marginTop: -20,
  },
  heroImageCompact: {
    width: '100%',
    height: 72,
    backgroundColor: '#E5E5EA',
    marginHorizontal: -12,
    marginTop: -12,
  },
  defaultImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
  },
  content: {
    marginBottom: 16,
  },
  contentAfterHero: {
    marginTop: 12,
  },
  senderPill: {
    position: 'absolute',
    top: -20,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  senderPillRight: {
    left: undefined,
    right: 20,
  },
  senderPillCompact: {
    top: -16,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  senderPillRightCompact: {
    right: 12,
  },
  senderTextWrap: {
    marginLeft: 8,
  },
  senderTextWrapCompact: {
    marginLeft: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  senderTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  senderNameCompact: {
    fontSize: 12,
  },
  senderTimeCompact: {
    fontSize: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 16,
  },
  descriptionCompact: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  contentCompact: {
    marginBottom: 10,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  middleRowCompact: {
    marginBottom: 0,
  },
  tagsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 10,
  },
  tagsContainerCompact: {
    gap: 5,
    marginRight: 6,
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
  tagCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagTextCompact: {
    fontSize: 10,
    fontWeight: '600',
  },
  sideImage: {
    width: 80,
    height: 60,
    borderRadius: 12,
    marginLeft: 10,
    backgroundColor: '#E5E5EA',
  },
  sideImageCompact: {
    width: 56,
    height: 42,
    borderRadius: 10,
    marginLeft: 6,
    backgroundColor: '#E5E5EA',
  },
  // Same as feed footerPill
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 24,
    minHeight: 54,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  footerCompact: {
    minHeight: 40,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
  },
  footerIconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerIconBtnCompact: {
    width: 34,
    height: 34,
  },
  footerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerIconsCompact: {
    gap: 6,
  },
  actionButton: {
    minWidth: 72,
    height: 34,
    paddingHorizontal: 20,
    marginRight: 12,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 17,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  actionButtonCompact: {
    height: 28,
    borderRadius: 14,
    marginLeft: 6,
  },
  actionButtonTextCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
});
