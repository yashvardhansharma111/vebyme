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
  shadowOffset: { width: 0, height: 72 },
  shadowOpacity: 0.02,
  shadowRadius: 64,
  elevation: 8,
};

const INTEREST_ICONS: { [key: string]: string } = {
  Rooftop: 'business',
  Rave: 'musical-notes',
  Art: 'color-palette',
  Sports: 'football',
  Karaoke: 'mic',
  Cycling: 'bicycle',
  Work: 'briefcase',
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
  const blurHeight = topSectionHeight * 0.5; // blur on bottom 50% – too tall = washed look

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
  const instagramId = extractInstagramIdFromUrl(socialMedia.instagram) || socialMedia.instagram?.replace(/^@/, '') || '';
  const instagramUrl = getInstagramProfileUrl(socialMedia.instagram) || (instagramId ? `https://www.instagram.com/${instagramId}/` : null);

  // Always show Instagram and X rows (with logos); show handle or placeholder
  const socialCardEntries: { key: string; icon: string; handle: string; url: string | null; isX: boolean }[] = [
    { key: 'instagram', icon: 'logo-instagram', handle: instagramId || socialMedia.instagram || 'Not added', url: instagramUrl || (instagramId ? `https://instagram.com/${instagramId}` : null), isX: false },
    { key: 'x', icon: 'x', handle: socialMedia.x || socialMedia.twitter || 'Not added', url: (socialMedia.x || socialMedia.twitter) ? `https://x.com/${String(socialMedia.x || socialMedia.twitter).replace(/^@/, '')}` : null, isX: true },
  ];

  const copySocialLink = async (url: string, handle: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied!', `${handle} link copied to clipboard.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 1. Top section: profile image, blur on bottom 60% */}
        <View key="top-section" style={[styles.topSection, { height: topSectionHeight }]}>
          {hasProfileImage ? (
            <Image
              source={{ uri: viewedUser!.profile_image! }}
              style={styles.profileBackgroundImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profileBackgroundPlaceholder} />
          )}

          {/* Glass blur: frosted blur + subtle blue tint, gradient blends into image */}
          <View style={[styles.blurOverlay, { height: blurHeight }]} pointerEvents="none">
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[
                'transparent',
                'rgba(248,250,252,0.12)',
                'rgba(240,247,255,0.25)',
                'rgba(241,245,249,0.5)',
              ]}
              locations={[0, 0.4, 0.7, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
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

        {/* 2. Bottom section: solid #F2F2F2, content cards – order as in screenshot */}
        <View key="bottom-section" style={styles.bottomSection}>
          {/* Social card: always Instagram above, X below – show logos always; handle or "Not added" */}
          <View key="social-card" style={[styles.sectionCard, { marginBottom: 15 }]}>
            {socialCardEntries.map((entry, index) => (
              <React.Fragment key={entry.key}>
                {index > 0 && <View style={styles.hairlineDivider} />}
                <TouchableOpacity
                  style={styles.socialRow}
                  onPress={() => entry.url && copySocialLink(entry.url, entry.handle)}
                  activeOpacity={entry.url ? 0.7 : 1}
                  disabled={!entry.url}
                >
                  {entry.isX ? (
                    <Text style={styles.socialXIcon}>𝕏</Text>
                  ) : (
                    <Ionicons name={entry.icon as any} size={24} color="#252525" />
                  )}
                  <Text style={[styles.socialHandle, !entry.url && styles.socialHandlePlaceholder]}>{entry.handle}</Text>
                  {entry.url ? <Ionicons name="copy-outline" size={18} color="#8E8E93" /> : null}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>

          {/* Stats card: #plans (left) | #interactions (right) */}
          <View key="stats-card" style={[styles.sectionCard, styles.statsCard, { marginBottom: 15 }]}>
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

          {/* Interests card */}
          {interests.length > 0 && (
            <View key="interests-card" style={[styles.sectionCard, { marginBottom: 15 }]}>
              <Text style={styles.interestsLabel}>#interests</Text>
              <View style={styles.interestsWrap}>
                {interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Ionicons
                      name={(INTEREST_ICONS[interest] || 'ellipse') as any}
                      size={20}
                      color="#3b3c3d"
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
            <View key="plans-loading">
              <ActivityIndicator size="small" color="#1C1C1E" style={{ paddingVertical: 20 }} />
            </View>
          ) : recentPlans.length === 0 ? (
            <React.Fragment key="empty-plans">
              <View style={styles.recentPlansHeader}>
                <View style={styles.recentPlansPill}>
                  <Text style={styles.recentPlansPillText}>Recent Plans</Text>
                </View>
              </View>
              <Text style={styles.emptyText}>No plans yet</Text>
            </React.Fragment>
          ) : (
            <View key="recent-plans-wrapper" style={styles.recentPlansListWrapper}>
              <View key="recent-plans-pill" style={styles.recentPlansPillStuck}>
                <Text style={styles.recentPlansPillText}>Recent Plans</Text>
              </View>
              <React.Fragment key="recent-plans-list">
                {recentPlans.map((plan, planIndex) => {
                  const allTags = [
                    ...(plan.temporal_tags || []),
                    ...(plan.category_sub || []),
                  ].slice(0, 3);
                  const hasImage = plan.media && plan.media.length > 0;
                  const isFirstCard = planIndex === 0;
                  const planKey = plan.plan_id ?? (plan as any).planId ?? (plan as any).id ?? `plan-${planIndex}`;

                  return (
                    <View key={planKey} style={[styles.planCard, isFirstCard && styles.planCardFirst]}>
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
              </React.Fragment>
            </View>
          )}

          {/* Actions: Interacted = Remove Interaction + Report in one card + Chat. Non-interacted = Report only */}
          {hasInteracted ? (
            <React.Fragment key="actions-interacted">
              <View style={[styles.sectionCard, { marginBottom: 15, gap: 16 }]}>
                <TouchableOpacity style={styles.actionRow} onPress={() => {}} activeOpacity={0.7}>
                  <Ionicons name="close-circle-outline" size={24} color="#252525" />
                  <Text style={styles.actionRowText}>Remove Interaction</Text>
                </TouchableOpacity>
                <View style={styles.hairlineDivider} />
                <TouchableOpacity style={styles.actionRow} onPress={handleReport} activeOpacity={0.7}>
                  <Ionicons name="person-remove-outline" size={24} color="#c33939" />
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
            </React.Fragment>
          ) : (
            <TouchableOpacity key="actions-report-only" style={styles.reportOnlyButton} onPress={handleReport} activeOpacity={0.7}>
              <Ionicons name="person-remove-outline" size={18} color="#FF3B30" />
              <Text style={styles.reportOnlyText}>Report User</Text>
            </TouchableOpacity>
          )}
          <View key="bottom-spacer" style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f3f3',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
  },
  topSection: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#f3f3f3',
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
    gap: 8,
    marginBottom: 6,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -1.1,
    lineHeight: 38,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  verifiedIcon: {
    marginLeft: 0,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 22,
    flex: 1,
  },
  taglineIcon: {
    marginLeft: 6,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 24,
    overflow: 'hidden',
  },
  statHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statsDivider: {
    width: 2,
    backgroundColor: 'rgba(71, 71, 71, 0.1)',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#252525',
    letterSpacing: -1.4,
    lineHeight: 36,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(71, 71, 71, 0.85)',
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 14,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#f3f3f3',
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 8,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 20,
    ...CARD_SHADOW,
  },
  hairlineDivider: {
    height: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 0,
    alignSelf: 'stretch',
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  socialXIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#252525',
    width: 24,
    height: 24,
    textAlign: 'center',
  },
  socialHandle: {
    fontSize: 17,
    color: '#252525',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  socialHandlePlaceholder: {
    color: 'rgba(71, 71, 71, 0.85)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionRowText: {
    fontSize: 17,
    color: '#252525',
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 20,
    flex: 1,
  },
  actionRowTextDanger: {
    color: '#c33939',
  },
  chatButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    height: 48,
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
    fontSize: 17,
    color: '#c33939',
    fontWeight: '600',
  },
  interestsLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b3c3d',
    letterSpacing: -1,
    lineHeight: 24,
    marginBottom: 12,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 24,
    gap: 4,
  },
  interestTagIcon: {
    marginRight: 0,
  },
  interestTagText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b3c3d',
    letterSpacing: -0.6,
    lineHeight: 19,
  },
  recentPlansHeader: {
    marginBottom: 16,
  },
  recentPlansPill: {
    alignSelf: 'stretch',
  },
  recentPlansListWrapper: {
    position: 'relative',
    marginBottom: 0,
    paddingTop: 32,
  },
  recentPlansPillStuck: {
    marginBottom: 16,
  },
  recentPlansPillText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b3c3d',
    lineHeight: 24,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 20,
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
    gap: 24,
  },
  planTextBlock: {
    flex: 1,
    marginRight: 0,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#263739',
    letterSpacing: -1,
    lineHeight: 34,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 18,
    color: 'rgba(0, 0, 0, 0.7)',
    lineHeight: 24,
    marginBottom: 10,
  },
  planTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 24,
    gap: 4,
  },
  planTagChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#263739',
    letterSpacing: -0.6,
    lineHeight: 14,
  },
  planThumbnail: {
    width: 100,
    height: 84,
    borderRadius: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
