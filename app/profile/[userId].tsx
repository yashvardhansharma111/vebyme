import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserProfile, fetchUserStats } from '@/store/slices/profileSlice';
import { apiService } from '@/services/api';
import { extractInstagramIdFromUrl, getInstagramProfileUrl } from '@/utils/social';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 3,
};

const INTEREST_ICONS: { [key: string]: string } = {
  Rooftop: 'business',
  Rave: 'musical-notes',
  Art: 'color-palette',
  Sports: 'football',
  Karaoke: 'mic',
  Cycling: 'bicycle',
  Breakfast: 'restaurant',
  Lunch: 'restaurant',
  Dinner: 'restaurant',
  Coffee: 'cafe',
  Music: 'musical-notes',
  Movies: 'film',
  'Board Games': 'dice',
  'House Party': 'home',
  'Road Trip': 'car',
  Concert: 'mic',
  Cooking: 'restaurant',
  'Live Music': 'guitar',
  Party: 'balloon',
  Health: 'heart',
  Nature: 'leaf',
  Standup: 'mic',
  Workshops: 'construct',
  Podcasts: 'radio',
};

const TAG_ICONS: { [key: string]: string } = {
  Weekend: 'calendar',
  Evening: 'sunny',
  Hitchhiking: 'thumbs-up',
  Today: 'today',
  Tomorrow: 'calendar-outline',
  Morning: 'sunny-outline',
  Night: 'moon',
};

export default function OtherUserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { height: screenHeight } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { viewedUser, stats, isLoading } = useAppSelector((state) => state.profile);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const topSectionHeight = screenHeight * 0.6;
  const blurHeight = topSectionHeight * 0.4;

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserStats(userId));
      loadRecentPlans();
    }
  }, [dispatch, userId]);

  const loadRecentPlans = async () => {
    if (!userId) return;
    setLoadingPlans(true);
    try {
      const response = await apiService.getUserPlans(userId, 5, 0);
      if (response.data) {
        setRecentPlans(response.data);
      }
    } catch (error: any) {
      console.error('Error loading plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report User',
      'Are you sure you want to report this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'User reported successfully');
          },
        },
      ]
    );
  };

  if (isLoading && !viewedUser) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      </View>
    );
  }

  const socialMedia = (viewedUser as any)?.social_media || {};
  const interests = viewedUser?.interests || [];
  const hasProfileImage = viewedUser?.profile_image;
  const hasInteracted = (viewedUser as any)?.has_interacted === true;
  const isBusiness = (viewedUser as any)?.is_business === true;
  const businessEmail = (viewedUser as any)?.email ?? (viewedUser as any)?.business_email ?? '';
  const instagramId = extractInstagramIdFromUrl(socialMedia.instagram) || socialMedia.instagram?.replace(/^@/, '') || '';
  const instagramUrl = getInstagramProfileUrl(socialMedia.instagram) || (instagramId ? `https://www.instagram.com/${instagramId}/` : null);

  const socialEntries = [
    (instagramId || socialMedia.instagram) && { key: 'instagram', icon: 'logo-instagram', handle: instagramId || socialMedia.instagram, url: instagramUrl || `https://instagram.com/${String(socialMedia.instagram).replace(/^@/, '')}`, isX: false },
    (socialMedia.x || socialMedia.twitter) && { key: 'x', icon: 'x', handle: socialMedia.x || socialMedia.twitter, url: `https://x.com/${String(socialMedia.x || socialMedia.twitter).replace(/^@/, '')}`, isX: true },
    socialMedia.facebook && { key: 'facebook', icon: 'logo-facebook', handle: socialMedia.facebook, url: `https://facebook.com/${String(socialMedia.facebook).replace(/^@/, '')}`, isX: false },
    socialMedia.snapchat && { key: 'snapchat', icon: 'logo-snapchat', handle: socialMedia.snapchat, url: `https://snapchat.com/add/${String(socialMedia.snapchat).replace(/^@/, '')}`, isX: false },
  ].filter(Boolean) as { key: string; icon: string; handle: string; url: string; isX?: boolean }[];

  const copySocialLink = async (url: string, handle: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied!', `${handle} link copied to clipboard.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isBusiness && (
        <View style={styles.businessProfileHeader}>
          <Text style={styles.businessProfileHeaderText}>Business Profile</Text>
        </View>
      )}
      {!hasInteracted && !isBusiness && (
        <View style={styles.profileTypeHeader}>
          <Text style={styles.profileTypeHeaderText} numberOfLines={1}>Other User Profile - Not interacted</Text>
        </View>
      )}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 1. Top section: profile image, blur on bottom 40% fading to background color */}
        <View style={[styles.topSection, { height: topSectionHeight }]}>
          {hasProfileImage ? (
            <Image
              source={{ uri: viewedUser!.profile_image! }}
              style={styles.profileBackgroundImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profileBackgroundPlaceholder} />
          )}

          {/* Transition Layer: Blur + Gradient */}
          <View style={[styles.blurOverlay, { height: blurHeight }]}>
            {/* Layer 1: The Blur - Intensity 90+ gives that thick glass look */}
            <BlurView
              intensity={95}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
            {/* Layer 2: The Grain/Texture Overlay (Optional)
                If you have a small noise/grain png, you'd place it here with 0.05 opacity
            */}
            {/* Layer 3: The "Melt" Gradient - 4-step to control where grainy photo turns into solid background */}
            <LinearGradient
              colors={[
                'rgba(242, 242, 242, 0)',
                'rgba(242, 242, 242, 0.2)',
                'rgba(242, 242, 242, 0.7)',
                '#F2F2F2',
              ]}
              locations={[0, 0.3, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* UI Elements on top of the transition */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>

          <View style={styles.profileOverlay}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{viewedUser?.name || 'User'}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={styles.verifiedIcon} />
            </View>
            {viewedUser?.bio ? (
              <View style={styles.taglineRow}>
                <Text style={styles.statusTagline} numberOfLines={2}>
                  {viewedUser.bio}
                </Text>
                <Ionicons name="headset-outline" size={16} color="rgba(255,255,255,0.9)" style={styles.taglineIcon} />
              </View>
            ) : null}
          </View>
        </View>

        {/* 2. Bottom section: solid #F2F2F2, content cards */}
        <View style={styles.bottomSection}>
          {isBusiness ? (
            <>
              {/* Business: email + Instagram (extracted ID from link) */}
              <View style={styles.businessContactRow}>
                <View style={styles.businessContactField}>
                  <Ionicons name="mail-outline" size={20} color="#8E8E93" />
                  <Text style={styles.businessContactText} numberOfLines={1}>
                    {businessEmail || 'No email'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.businessContactField}
                  onPress={() => instagramUrl && copySocialLink(instagramUrl, instagramId)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-instagram" size={20} color="#8E8E93" />
                  <Text style={styles.businessContactText} numberOfLines={1}>
                    {instagramId || 'No Instagram'}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Instagram grid placeholder (9 cells) – link to profile if we have ID */}
              {instagramId ? (
                <View style={styles.instagramGrid}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <View key={i} style={styles.instagramGridCell}>
                      <View style={styles.instagramGridPlaceholder} />
                    </View>
                  ))}
                </View>
              ) : null}
              {/* All Plans header */}
              <View style={styles.allPlansHeader}>
                <Text style={styles.allPlansTitle}>All Plans</Text>
                <Ionicons name="chevron-forward" size={20} color="#1C1C1E" />
              </View>
            </>
          ) : null}

          {!isBusiness && (
            <View style={[styles.sectionCard, styles.statsCard, { marginBottom: 15 }]}>
              <View style={styles.statHalf}>
                <Text style={styles.statNumber}>{stats?.plans_count ?? 0}</Text>
                <Text style={styles.statLabel}>#plans</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statHalf}>
                <Text style={styles.statNumber}>{stats?.interactions_count ?? 0}</Text>
                <Text style={styles.statLabel}>#interactions</Text>
              </View>
            </View>
          )}

          {/* Social links card - tap to copy (non-business or when business and we show both) */}
          {!isBusiness && socialEntries.length > 0 && (
            <View style={[styles.sectionCard, { marginBottom: 15 }]}>
              {socialEntries.map((entry, index) => (
                <React.Fragment key={entry.key}>
                  {index > 0 && <View style={styles.hairlineDivider} />}
                  <TouchableOpacity
                    style={styles.socialRow}
                    onPress={() => copySocialLink(entry.url, entry.handle)}
                    activeOpacity={0.7}
                  >
                    {entry.isX ? (
                      <Text style={styles.socialXIcon}>𝕏</Text>
                    ) : (
                      <Ionicons name={entry.icon as any} size={22} color="#1C1C1E" />
                    )}
                    <Text style={styles.socialHandle}>{entry.handle}</Text>
                    <Ionicons name="copy-outline" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Interests card */}
          {interests.length > 0 && (
            <View style={[styles.sectionCard, { marginBottom: 15 }]}>
              <Text style={styles.interestsLabel}>#interests</Text>
              <View style={styles.interestsWrap}>
                {interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Ionicons
                      name={(INTEREST_ICONS[interest] || 'ellipse') as any}
                      size={14}
                      color="#1C1C1E"
                      style={styles.interestTagIcon}
                    />
                    <Text style={styles.interestTagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent Plans / All Plans */}
          {loadingPlans ? (
            <ActivityIndicator size="small" color="#1C1C1E" style={{ paddingVertical: 20 }} />
          ) : recentPlans.length === 0 ? (
            <>
              <View style={styles.recentPlansHeader}>
                <View style={styles.recentPlansPill}>
                  <Text style={styles.recentPlansPillText}>{isBusiness ? 'All Plans' : 'Recent Plans'}</Text>
                </View>
              </View>
              <Text style={styles.emptyText}>No plans yet</Text>
            </>
          ) : (
            <View style={[styles.recentPlansListWrapper, isBusiness && styles.recentPlansListHorizontal]}>
              {!isBusiness && (
                <View style={styles.recentPlansPillStuck}>
                  <Text style={styles.recentPlansPillText}>Recent Plans</Text>
                </View>
              )}
              {isBusiness ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.allPlansScroll}>
                  {recentPlans.map((plan, planIndex) => {
                    const hasImage = plan.media && plan.media.length > 0;
                    return (
                      <TouchableOpacity
                        key={plan.plan_id}
                        style={styles.planCardHorizontal}
                        onPress={() => router.push((plan.is_business ? '/business-plan/' : '/plan/') + plan.plan_id as any)}
                        activeOpacity={0.9}
                      >
                        {hasImage ? (
                          <Image source={{ uri: plan.media[0].url }} style={styles.planCardHorizontalImage} resizeMode="cover" />
                        ) : (
                          <View style={[styles.planCardHorizontalImage, styles.planCardHorizontalPlaceholder]} />
                        )}
                        <View style={styles.planCardHorizontalOverlay} />
                        <Text style={styles.planCardHorizontalTitle} numberOfLines={2}>{plan.title || 'Untitled'}</Text>
                        <Text style={styles.planCardHorizontalDesc} numberOfLines={2}>{plan.description || ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <>
            {recentPlans.map((plan, planIndex) => {
              const allTags = [
                ...(plan.temporal_tags || []),
                ...(plan.category_sub || []),
              ].slice(0, 3);
              const hasImage = plan.media && plan.media.length > 0;
              const isFirstCard = planIndex === 0;

              return (
                <View key={plan.plan_id} style={[styles.planCard, isFirstCard && styles.planCardFirst]}>
                  <View style={styles.planCardInner}>
                    <View style={styles.planTextBlock}>
                      <Text style={styles.planTitle}>{plan.title || 'Untitled Plan'}</Text>
                      <Text style={styles.planDescription} numberOfLines={4}>
                        {plan.description || 'No description'}
                      </Text>
                      {allTags.length > 0 && (
                        <View style={styles.planTagsRow}>
                          {allTags.map((tag: string, idx: number) => (
                            <View key={idx} style={styles.planTagChip}>
                              <Ionicons
                                name={(TAG_ICONS[tag] || 'ellipse') as any}
                                size={12}
                                color="#222"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.planTagChipText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    {hasImage && (
                      <Image
                        source={{ uri: plan.media[0].url }}
                        style={styles.planThumbnail}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                </View>
              );
            })}
                </>
              )}
            </View>
          )}

          {/* Actions: Interacted = Remove Interaction + Report in one card + Chat. Non-interacted = Report only */}
          {hasInteracted ? (
            <>
              <View style={[styles.sectionCard, { marginBottom: 15 }]}>
                <TouchableOpacity style={styles.actionRow} onPress={() => {}} activeOpacity={0.7}>
                  <Ionicons name="close-circle-outline" size={20} color="#1C1C1E" />
                  <Text style={styles.actionRowText}>Remove Interaction</Text>
                </TouchableOpacity>
                <View style={styles.hairlineDivider} />
                <TouchableOpacity style={styles.actionRow} onPress={handleReport} activeOpacity={0.7}>
                  <Ionicons name="person-remove-outline" size={20} color="#FF3B30" />
                  <Text style={[styles.actionRowText, styles.actionRowTextDanger]}>Report User</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => userId && router.push({ pathname: '/chat/[groupId]', params: { groupId: userId } } as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.reportOnlyButton} onPress={handleReport} activeOpacity={0.7}>
              <Ionicons name="person-remove-outline" size={18} color="#FF3B30" />
              <Text style={styles.reportOnlyText}>Report User</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  businessProfileHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
  },
  businessProfileHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  profileTypeHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E8E8ED',
  },
  profileTypeHeaderText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
  },
  topSection: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#F2F2F2',
  },
  profileBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  profileBackgroundPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4A3B69',
  },
  blurOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    zIndex: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  taglineIcon: {
    marginLeft: 6,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statsDivider: {
    width: 0.5,
    backgroundColor: '#E5E5EA',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  businessContactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  businessContactField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  businessContactText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  instagramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 20,
  },
  instagramGridCell: {
    width: '32%',
    aspectRatio: 1,
  },
  instagramGridPlaceholder: {
    flex: 1,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
  },
  allPlansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  allPlansTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  allPlansScroll: {
    paddingBottom: 16,
    gap: 12,
  },
  recentPlansListHorizontal: {
    flexDirection: 'column',
  },
  planCardHorizontal: {
    width: 280,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
  },
  planCardHorizontalImage: {
    width: '100%',
    height: 140,
  },
  planCardHorizontalPlaceholder: {
    backgroundColor: '#C7C7CC',
  },
  planCardHorizontalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  planCardHorizontalTitle: {
    position: 'absolute',
    bottom: 36,
    left: 12,
    right: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  planCardHorizontalDesc: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 22,
    ...CARD_SHADOW,
  },
  hairlineDivider: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 0,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  socialXIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
    width: 28,
    textAlign: 'center',
  },
  socialHandle: {
    fontSize: 15,
    color: '#1C1C1E',
    marginLeft: 14,
    fontWeight: '500',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  actionRowText: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  actionRowTextDanger: {
    color: '#FF3B30',
  },
  chatButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  chatButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  reportOnlyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  reportOnlyText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
  },
  interestsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 14,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
  },
  interestTagIcon: {
    marginRight: 6,
  },
  interestTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  recentPlansHeader: {
    marginBottom: 8,
  },
  recentPlansPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  recentPlansListWrapper: {
    position: 'relative',
    marginBottom: 0,
  },
  recentPlansPillStuck: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  recentPlansPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 35,
    padding: 22,
    marginBottom: 15,
    ...CARD_SHADOW,
  },
  planCardFirst: {
    marginTop: 26,
  },
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  planTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 10,
  },
  planTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planTagChipIcon: {
    marginRight: 4,
  },
  planTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  planTagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  planThumbnail: {
    width: 75,
    height: 75,
    borderRadius: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
