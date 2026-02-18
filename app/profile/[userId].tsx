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
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserProfile, fetchUserStats } from '@/store/slices/profileSlice';
import { apiService } from '@/services/api';
import { extractInstagramIdFromUrl, getInstagramProfileUrl } from '@/utils/social';
import { WebView } from 'react-native-webview';
import { EventCard } from '@/components/SwipeableEventCard';

function resolveProfileImageUri(uri: string | null | undefined): string | null {
  if (!uri || !uri.trim()) return null;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  const base = (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '';
  const assetBase = base ? base.replace(/\/api\/?$/, '') : '';
  return assetBase ? `${assetBase}${uri.startsWith('/') ? uri : `/${uri}`}` : uri;
}

const FIGMA_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 72 },
  shadowOpacity: 0.02,
  shadowRadius: 64,
  elevation: 64,
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
  Hitchhiking: 'person',
  Today: 'today',
  Tomorrow: 'calendar-outline',
  Morning: 'sunny-outline',
  Night: 'moon',
};

function getPlanDisplayTags(plan: any): string[] {
  const tags: string[] = [];
  const addDetails = plan.add_details || [];
  addDetails.forEach((d: any) => {
    if (d.title && typeof d.title === 'string') tags.push(d.title.trim());
  });
  if (plan.temporal_tags?.length) tags.push(...plan.temporal_tags);
  if (plan.category_sub?.length) tags.push(...plan.category_sub);
  return [...new Set(tags)].slice(0, 5);
}

export default function OtherUserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { height: screenHeight } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { viewedUser, stats, isLoading } = useAppSelector((state) => state.profile);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [recentPlansModalVisible, setRecentPlansModalVisible] = useState(false);
  const [showInstagramWebView, setShowInstagramWebView] = useState(false);

  const isOwnProfile = !!userId && !!currentUser?.user_id && String(userId) === String(currentUser.user_id);
  const profileImageUri = resolveProfileImageUri(viewedUser?.profile_image ?? undefined);
  const showProfileImage = !!profileImageUri && !profileImageError;

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const topSectionHeight = screenHeight * 0.5;
  const overlapPx = Math.round(topSectionHeight * 0.05);
  const contentWidth = screenWidth - 30;
  const recentPlanCardWidth = Math.min(screenWidth * 0.78, 320);

  useEffect(() => {
    if (userId) {
      setProfileImageError(false);
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserStats(userId));
      loadRecentPlans();
    }
  }, [dispatch, userId]);

  useEffect(() => {
    setProfileImageError(false);
  }, [viewedUser?.profile_image]);

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

  const isBusinessProfile = (viewedUser as any)?.is_business === true;
  const socialMedia = (viewedUser as any)?.social_media || {};
  const interests = viewedUser?.interests || [];
  const hasInteracted = (viewedUser as any)?.has_interacted === true;
  const instagramId = extractInstagramIdFromUrl(socialMedia.instagram) || socialMedia.instagram?.replace(/^@/, '') || '';
  const instagramUrl = getInstagramProfileUrl(socialMedia.instagram) || (instagramId ? `https://www.instagram.com/${instagramId}/` : null);
  // For business Instagram grid: use first 9 plan media images as preview, or empty slots
  const instagramGridImages = isBusinessProfile
    ? recentPlans.flatMap((p) => (p.media || []).map((m: any) => m.url)).filter(Boolean).slice(0, 9)
    : [];

  // Social card: Instagram and X rows with handle or "Not added"
  const socialCardEntries: { key: string; icon: string; handle: string; url: string | null; isX: boolean }[] = [
    { key: 'instagram', icon: 'logo-instagram', handle: instagramId || socialMedia.instagram || 'Not added', url: instagramUrl || (instagramId ? `https://instagram.com/${instagramId}` : null), isX: false },
    { key: 'x', icon: 'x', handle: socialMedia.x || socialMedia.twitter || 'Not added', url: (socialMedia.x || socialMedia.twitter) ? `https://x.com/${String(socialMedia.x || socialMedia.twitter).replace(/^@/, '')}` : null, isX: true },
  ];

  // Business profile: link section entries – show all socials (Instagram, X, Snapchat, Google Drive) when added
  const businessLinkEntries: { key: string; icon: string; label: string; url: string | null; color: string }[] = [
    ...(instagramUrl || instagramId ? [{ key: 'instagram', icon: 'logo-instagram', label: 'Instagram', url: instagramUrl || (instagramId ? `https://instagram.com/${instagramId}` : null), color: '#E4405F' }] : []),
    ...(socialMedia.google_drive ? [{ key: 'google_drive', icon: 'document-text', label: 'Google Drive', url: socialMedia.google_drive.startsWith('http') ? socialMedia.google_drive : `https://drive.google.com/${socialMedia.google_drive}`, color: '#4285F4' }] : []),
    ...((socialMedia.x || socialMedia.twitter) ? [{ key: 'x', icon: 'x', label: 'X', url: `https://x.com/${String(socialMedia.x || socialMedia.twitter).replace(/^@/, '')}`, color: '#000000' }] : []),
    ...(socialMedia.snapchat ? [{ key: 'snapchat', icon: 'logo-snapchat', label: 'Snapchat', url: socialMedia.snapchat.startsWith('http') ? socialMedia.snapchat : `https://www.snapchat.com/add/${String(socialMedia.snapchat).replace(/^@/, '')}`, color: '#FFFC00' }] : []),
  ];

  const copySocialLink = async (url: string, handle: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied!', `${handle} link copied to clipboard.`);
  };

  return (
    <View style={styles.container}>
      {/* 1. Hero – fixed; image only (stays when scrolling) */}
      <View
        key="top-section"
        style={[
          styles.heroWrap,
          {
            height: topSectionHeight,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          },
        ]}
        pointerEvents="box-none"
      >
        {showProfileImage ? (
          <Image
            source={{ uri: profileImageUri! }}
            style={styles.profileBackgroundImage}
            resizeMode="cover"
            onError={() => setProfileImageError(true)}
          />
        ) : (
          <View style={styles.profileBackgroundPlaceholder} />
        )}
      </View>

      {/* Back button – fixed overlay (stays when scrolling) */}
      <View style={[styles.stickyBackOverlay, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backButtonFigma}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFill} />
          <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      {/* 2. ScrollView – text section scrolls over the image */}
      <ScrollView
        style={styles.scrollBelowHero}
        contentContainerStyle={{
          paddingTop: topSectionHeight,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Bottom section: curved top, overlaps image; name + bio + cards */}
        <View
          key="bottom-section"
          style={[
            styles.bottomSection,
            {
              marginTop: -overlapPx,
              paddingTop: overlapPx + 16,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            },
            isBusinessProfile && { backgroundColor: '#FFF' },
          ]}
        >
          {/* Name + bio in text section */}
          <View style={styles.profileTextSection}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileNameText}>{viewedUser?.name || 'User'}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#1C1C1E" />
            </View>
            {viewedUser?.bio ? (
              <Text style={styles.profileBioText} numberOfLines={3}>
                {viewedUser.bio}
              </Text>
            ) : null}
          </View>
          {isBusinessProfile ? (
            <>
              {/* Business: link section (same UX as normal user – Google Drive, X, Snap, Instagram if added) */}
              {businessLinkEntries.length > 0 && (
                <View key="business-links" style={[styles.sectionCard, styles.socialCardFigma, { marginBottom: 16 }]}>
                  {businessLinkEntries.map((entry, index) => (
                    <React.Fragment key={entry.key}>
                      {index > 0 && <View style={styles.hairlineDividerFigma} />}
                      <TouchableOpacity
                        style={styles.socialRow}
                        onPress={() => entry.url && Linking.openURL(entry.url)}
                        activeOpacity={entry.url ? 0.7 : 1}
                        disabled={!entry.url}
                      >
                        {entry.key === 'x' ? (
                          <Text style={styles.socialXIcon}>𝕏</Text>
                        ) : (
                          <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={entry.icon as any} size={24} color={entry.color} />
                          </View>
                        )}
                        <Text style={[styles.socialHandle, !entry.url && styles.socialHandlePlaceholder]}>{entry.label}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              )}

              {/* Business: Instagram preview – same as before */}
              <View key="business-content" style={styles.businessContentCard}>
                {/* Instagram preview: logo + handle, inline WebView mini profile; tap opens full WebView modal */}
                <View style={styles.businessInstaSection}>
                  <TouchableOpacity
                    style={styles.businessInstaHeader}
                    onPress={() => instagramUrl && setShowInstagramWebView(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                    <Text style={styles.businessInstaHandle}>{instagramId || viewedUser?.name || 'instagram'}</Text>
                    <Ionicons name="open-outline" size={18} color="#8E8E93" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                  {/* Inline WebView mini profile preview (fixed height, no scroll) */}
                  {instagramUrl && (
                    <View style={styles.instagramWebViewPreviewWrap}>
                      <WebView
                        source={{ uri: instagramUrl }}
                        style={styles.instagramWebViewPreview}
                        scrollEnabled={false}
                        javaScriptEnabled
                        domStorageEnabled
                        sharedCookiesEnabled={false}
                        incognito
                        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        startInLoadingState
                        renderLoading={() => (
                          <View style={styles.instagramWebViewPreviewLoading}>
                            <ActivityIndicator size="large" color="#E4405F" />
                          </View>
                        )}
                      />
                    </View>
                  )}
                  {/* View Instagram posts – commented out for now
                  <TouchableOpacity
                    style={styles.businessInstaViewPostsBtn}
                    onPress={() => instagramUrl && setShowInstagramWebView(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.businessInstaViewPostsText}>View Instagram posts</Text>
                  </TouchableOpacity>
                  <View style={styles.businessInstaGrid}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.businessInstaGridTile}
                        onPress={() => instagramUrl && setShowInstagramWebView(true)}
                        activeOpacity={0.8}
                      >
                        {instagramGridImages[i] ? (
                          <Image source={{ uri: instagramGridImages[i] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        ) : (
                          <View style={styles.businessInstaGridPlaceholder}>
                            <Ionicons name="image-outline" size={20} color="#8E8E93" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  */}
                </View>

                {/* Instagram account view – WebView (iframe-style) */}
                {instagramUrl && (
                  <Modal
                    visible={showInstagramWebView}
                    animationType="slide"
                    onRequestClose={() => setShowInstagramWebView(false)}
                  >
                    <SafeAreaView style={styles.instagramWebViewContainer} edges={['top']}>
                      <View style={styles.instagramWebViewHeader}>
                        <TouchableOpacity onPress={() => setShowInstagramWebView(false)} style={styles.instagramWebViewCloseBtn}>
                          <Ionicons name="close" size={28} color="#1C1C1E" />
                        </TouchableOpacity>
                        <Text style={styles.instagramWebViewTitle} numberOfLines={1}>
                          @{instagramId || viewedUser?.name || 'instagram'}
                        </Text>
                        <TouchableOpacity onPress={() => Linking.openURL(instagramUrl)} style={styles.instagramWebViewOpenBtn}>
                          <Ionicons name="open-outline" size={22} color="#1C1C1E" />
                        </TouchableOpacity>
                      </View>
                      <WebView
                        source={{ uri: instagramUrl }}
                        style={styles.instagramWebView}
                        startInLoadingState
                        renderLoading={() => (
                          <View style={styles.instagramWebViewLoading}>
                            <ActivityIndicator size="large" color="#E4405F" />
                          </View>
                        )}
                        javaScriptEnabled
                        domStorageEnabled
                        sharedCookiesEnabled={false}
                        incognito
                        // Use a desktop user agent so Instagram shows the full profile grid (mobile often redirects to app)
                        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                      />
                    </SafeAreaView>
                  </Modal>
                )}

              </View>

              {/* Previous Runs – separate box with shadow, spaced from Instagram preview */}
              <View style={styles.businessPreviousRunsCard}>
                <View style={styles.businessPreviousRunsSection}>
                  <View style={styles.businessPreviousRunsHeader}>
                    <Text style={styles.businessPreviousRunsTitle}>Previous Runs</Text>
                    <TouchableOpacity style={styles.businessPreviousRunsArrowBtn} onPress={() => {}}>
                      <Ionicons name="chevron-forward" size={22} color="#1C1C1E" />
                    </TouchableOpacity>
                  </View>
                  {loadingPlans ? (
                    <View style={styles.recentPlansHorizontalLoader}>
                      <ActivityIndicator size="small" color="#1C1C1E" />
                    </View>
                  ) : recentPlans.length === 0 ? (
                    <Text style={styles.emptyText}>No plans yet</Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.businessPreviousRunsScrollContent}
                      style={styles.businessPreviousRunsScroll}
                    >
                      {recentPlans.map((plan, planIndex) => {
                        const hasImage = plan.media && plan.media.length > 0;
                        const planKey = plan.plan_id ?? (plan as any).planId ?? (plan as any).id ?? `plan-${planIndex}`;
                        return (
                          <TouchableOpacity
                            key={planKey}
                            style={[styles.businessPreviousRunCardNew, { width: recentPlanCardWidth }]}
                            activeOpacity={0.95}
                            onPress={() =>
                              router.push({
                                pathname: '/business-plan/[planId]',
                                params: { planId: plan.plan_id },
                              } as any)
                            }
                          >
                            <View style={styles.businessPreviousRunCardImageWrap}>
                              {hasImage ? (
                                <Image
                                  source={{ uri: plan.media[0].url }}
                                  style={styles.businessPreviousRunCardImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={[styles.businessPreviousRunCardImage, styles.businessPreviousRunCardPlaceholder]} />
                              )}
                            </View>
                            <View style={styles.businessPreviousRunCardWhiteStrip}>
                              <Text style={styles.businessPreviousRunCardTitleNew} numberOfLines={2}>
                                {plan.title || 'Untitled Plan'}
                              </Text>
                              <Text style={styles.businessPreviousRunCardDescriptionNew} numberOfLines={2}>
                                {plan.description || 'No description'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* Business profile: Report only */}
              {!isOwnProfile && (
                <TouchableOpacity style={styles.businessReportButton} onPress={handleReport} activeOpacity={0.7}>
                  <Ionicons name="flag-outline" size={22} color="#FF3B30" />
                  <Text style={styles.businessReportButtonText}>Report</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
          {/* Social card (Figma: frameContainer - Instagram + X) */}
          <View key="social-card" style={[styles.sectionCard, styles.socialCardFigma]}>
            {socialCardEntries.map((entry, index) => (
              <React.Fragment key={entry.key}>
                {index > 0 && <View style={styles.hairlineDividerFigma} />}
                <TouchableOpacity
                  style={styles.socialRow}
                  onPress={() => entry.url && Linking.openURL(entry.url)}
                  activeOpacity={entry.url ? 0.7 : 1}
                  disabled={!entry.url}
                >
                  {entry.isX ? (
                    <Text style={styles.socialXIcon}>𝕏</Text>
                  ) : (
                    <Ionicons name={entry.icon as any} size={24} color="#252525" />
                  )}
                  <Text style={[styles.socialHandle, !entry.url && styles.socialHandlePlaceholder]}>{entry.handle}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>

          {/* Stats card: #plans | #interactions (Figma) */}
          <View key="stats-card" style={[styles.statsCardFigma, { marginBottom: 8 }]}>
            <View style={styles.statsCardInner}>
              <View style={styles.statHalf}>
                <Text style={styles.statNumberFigma}>{stats?.plans_count ?? 0}</Text>
                <Text style={styles.statLabelFigma}>#plans </Text>
              </View>
              <View style={styles.statsDividerFigma} />
              <View style={styles.statHalf}>
                <Text style={styles.statNumberFigma}>{stats?.interactions_count ?? 0}</Text>
                <Text style={styles.statLabelFigma}>#interactions </Text>
              </View>
            </View>
          </View>

          {/* #interests (Figma) */}
          {interests.length > 0 && (
            <View key="interests-card" style={[styles.interestsCardFigma, { marginBottom: 8 }]}>
              <Text style={styles.interestsTitleFigma}>#interests</Text>
              <View style={styles.interestsRowWrap}>
                {interests.slice(0, 9).map((interest) => (
                  <View key={interest} style={styles.interestPillFigma}>
                    <Ionicons name={(INTEREST_ICONS[interest] || 'pricetag') as any} size={20} color="#3b3c3d" />
                    <Text style={styles.interestPillText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent Plans – vertically scrollable list of EventCards (no repost icon) */}
          <View key="recent-plans-section" style={styles.recentPlansSectionFigma}>
            <Text style={styles.recentPlansTitleFigma}>Recent Plans</Text>
            {loadingPlans ? (
              <View style={styles.recentPlansHorizontalLoader}>
                <ActivityIndicator size="small" color="#1C1C1E" />
              </View>
            ) : recentPlans.length === 0 ? (
              <Text style={styles.emptyText}>No plans yet</Text>
            ) : (
              <View style={styles.recentPlansListWrap}>
                {recentPlans.map((plan, planIndex) => {
                  const planKey = plan.plan_id ?? (plan as any).planId ?? (plan as any).id ?? `plan-${planIndex}`;
                  const planTime = plan.created_at
                    ? (() => {
                        try {
                          const d = typeof plan.created_at === 'string' ? new Date(plan.created_at) : plan.created_at;
                          return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                        } catch {
                          return 'Recently';
                        }
                      })()
                    : 'Recently';
                  return (
                    <TouchableOpacity
                      key={planKey}
                      activeOpacity={1}
                      onPress={() => {
                        router.push({
                          pathname: '/business-plan/[planId]',
                          params: { planId: plan.plan_id },
                        } as any);
                      }}
                      style={styles.recentPlanCardWrap}
                    >
                      <EventCard
                        user={{
                          id: userId ?? '',
                          name: viewedUser?.name ?? 'User',
                          avatar: viewedUser?.profile_image ?? 'https://via.placeholder.com/44',
                          time: planTime,
                        }}
                        event={{
                          title: plan.title || 'Untitled Plan',
                          description: plan.description || 'No description',
                          tags: getPlanDisplayTags(plan),
                          image: plan.media?.[0]?.url ?? '',
                        }}
                        onUserPress={() => {}}
                        onJoinPress={() => {
                          router.push({
                            pathname: '/business-plan/[planId]',
                            params: { planId: plan.plan_id },
                          } as any);
                        }}
                        onSharePress={() => {}}
                        onRepostPress={() => {}}
                        joinDisabled={isOwnProfile}
                        hideRepostButton={true}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Modal: all recent plans, same EventCard list */}
            <Modal
              visible={recentPlansModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setRecentPlansModalVisible(false)}
            >
              <Pressable style={styles.recentPlansModalOverlay} onPress={() => setRecentPlansModalVisible(false)}>
                <View style={styles.recentPlansModalContent} onStartShouldSetResponder={() => true}>
                  <View style={styles.recentPlansModalHeader}>
                    <Text style={styles.recentPlansModalTitle}>Recent Plans</Text>
                    <TouchableOpacity onPress={() => setRecentPlansModalVisible(false)} hitSlop={12}>
                      <Ionicons name="close" size={28} color="#1C1C1E" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={styles.recentPlansModalScroll}
                    contentContainerStyle={styles.recentPlansModalScrollContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {recentPlans.map((plan, planIndex) => {
                      const planKey = plan.plan_id ?? (plan as any).planId ?? (plan as any).id ?? `plan-${planIndex}`;
                      const planTime = plan.created_at
                        ? (() => {
                            try {
                              const d = typeof plan.created_at === 'string' ? new Date(plan.created_at) : plan.created_at;
                              return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                            } catch {
                              return 'Recently';
                            }
                          })()
                        : 'Recently';
                      return (
                        <TouchableOpacity
                          key={planKey}
                          activeOpacity={1}
                          onPress={() => {
                            setRecentPlansModalVisible(false);
                            router.push({
                              pathname: '/business-plan/[planId]',
                              params: { planId: plan.plan_id },
                            } as any);
                          }}
                          style={styles.recentPlanCardWrapModal}
                        >
                          <EventCard
                            user={{
                              id: userId ?? '',
                              name: viewedUser?.name ?? 'User',
                              avatar: viewedUser?.profile_image ?? 'https://via.placeholder.com/44',
                              time: planTime,
                            }}
                            event={{
                              title: plan.title || 'Untitled Plan',
                              description: plan.description || 'No description',
                              tags: getPlanDisplayTags(plan),
                              image: plan.media?.[0]?.url ?? '',
                            }}
                            onUserPress={() => {}}
                            onJoinPress={() => {
                              setRecentPlansModalVisible(false);
                              router.push({
                                pathname: '/business-plan/[planId]',
                                params: { planId: plan.plan_id },
                              } as any);
                            }}
                            onSharePress={() => {}}
                            onRepostPress={() => {}}
                            joinDisabled={isOwnProfile}
                            hideRepostButton={true}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
          </View>

          {/* Actions: Interacted = Remove Interaction + Report in one card + Chat. Non-interacted = Report only. Hide Report on own profile. */}
          {hasInteracted ? (
            <React.Fragment key="actions-interacted">
              <View style={[styles.sectionCard, styles.actionsCardFigma]}>
                <TouchableOpacity style={styles.actionRow} onPress={() => {}} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color="#252525" />
                  <Text style={styles.actionRowText}>Remove Interaction</Text>
                </TouchableOpacity>
                {!isOwnProfile && (
                  <>
                    <View style={styles.hairlineDividerFigma} />
                    <TouchableOpacity style={styles.actionRow} onPress={handleReport} activeOpacity={0.7}>
                      <Ionicons name="person-remove-outline" size={24} color="#FF3B30" />
                      <Text style={[styles.actionRowText, styles.actionRowTextDanger]}>Report User</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              {!isOwnProfile && (
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => userId && router.push({ pathname: '/chat/[groupId]', params: { groupId: userId } } as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          ) : !isOwnProfile ? (
            <TouchableOpacity key="actions-report-only" style={styles.reportOnlyButton} onPress={handleReport} activeOpacity={0.7}>
              <Ionicons name="person-remove-outline" size={18} color="#FF3B30" />
              <Text style={styles.reportOnlyText}>Report User</Text>
            </TouchableOpacity>
          ) : null}
            </>
          )}
          <View key="bottom-spacer" style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
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
  heroWrap: {
    width: '100%',
    overflow: 'hidden',
    zIndex: 10,
    elevation: 10,
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
  stickyBackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  backButtonFigma: {
    width: 48,
    height: 48,
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...FIGMA_CARD_SHADOW,
  },
  scrollBelowHero: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 11,
    elevation: 11,
  },
  profileTextSection: {
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  profileNameText: {
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 32,
    color: '#1C1C1E',
    fontWeight: '700',
  },
  profileBioText: {
    fontSize: 15,
    color: '#3C3C43',
    letterSpacing: -0.2,
    lineHeight: 22,
    fontWeight: '500',
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
    paddingHorizontal: 15,
    gap: 8,
    alignItems: 'center',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 20,
    alignSelf: 'stretch',
    ...FIGMA_CARD_SHADOW,
  },
  statsCardFigma: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    ...FIGMA_CARD_SHADOW,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCardInner: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
    gap: 25,
    justifyContent: 'center',
    height: 93,
  },
  statNumberFigma: {
    fontSize: 36,
    letterSpacing: -1.4,
    lineHeight: 36,
    textAlign: 'center',
    fontWeight: '700',
    color: '#252525',
  },
  statLabelFigma: {
    color: 'rgba(71, 71, 71, 0.85)',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 14,
  },
  statsDividerFigma: {
    height: 52,
    width: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(71, 71, 71, 0.1)',
    borderStyle: 'solid',
  },
  interestsCardFigma: {
    borderRadius: 40,
    padding: 18,
    gap: 12,
    backgroundColor: '#fff',
    alignSelf: 'stretch',
    ...FIGMA_CARD_SHADOW,
  },
  interestsTitleFigma: {
    color: '#3b3c3d',
    lineHeight: 24,
    textAlign: 'left',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -1,
  },
  interestsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    gap: 12,
  },
  interestPillFigma: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f3f3f3',
  },
  interestPillText: {
    lineHeight: 19,
    color: '#3b3c3d',
    letterSpacing: -0.6,
    fontSize: 14,
    fontWeight: '700',
  },
  recentPlansSectionFigma: {
    paddingTop: 32,
    gap: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  recentPlansTitleFigma: {
    color: '#3b3c3d',
    lineHeight: 24,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -1,
    alignSelf: 'stretch',
  },
  recentPlansListWrap: {
    alignSelf: 'stretch',
    paddingBottom: 8,
  },
  recentPlanCardWrap: {
    marginBottom: 20,
  },
  recentPlanCardWrapModal: {
    marginBottom: 20,
  },
  recentPlansStackWrap: {
    alignSelf: 'stretch',
    position: 'relative',
    marginBottom: 8,
  },
  recentPlansStackBack: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: -8,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 20,
    ...FIGMA_CARD_SHADOW,
  },
  recentPlanPostCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    alignSelf: 'stretch',
    minHeight: 140,
    ...FIGMA_CARD_SHADOW,
  },
  recentPlanPostCardModal: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    alignSelf: 'stretch',
    minHeight: 120,
    marginBottom: 12,
    ...FIGMA_CARD_SHADOW,
  },
  recentPlanPostContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  recentPlanPostTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  recentPlanPostDescription: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 8,
  },
  recentPlanPostTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentPlanPostTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  recentPlanPostTagText: {
    fontSize: 12,
    color: '#3C3C43',
    fontWeight: '500',
    maxWidth: 80,
  },
  recentPlanPostImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
  },
  recentPlanPostImage: {
    width: '100%',
    height: '100%',
  },
  recentPlanPostImagePlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentPlansModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  recentPlansModalContent: {
    backgroundColor: '#f3f3f3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  recentPlansModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  recentPlansModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  recentPlansModalScroll: {
    flex: 1,
  },
  recentPlansModalScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  // Business profile
  businessContentCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignSelf: 'stretch',
    marginTop: -1,
    ...FIGMA_CARD_SHADOW,
  },
  businessActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  businessActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  businessActionButtonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessActionButtonIconPhotos: {
    backgroundColor: '#fff',
  },
  businessActionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  businessInstaSection: {
    marginBottom: 24,
  },
  businessInstaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  businessInstaHandle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  businessInstaViewPostsBtn: {
    marginBottom: 12,
  },
  businessInstaViewPostsText: {
    fontSize: 14,
    color: '#E4405F',
    fontWeight: '600',
  },
  businessInstaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  businessInstaGridTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  businessInstaGridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instagramWebViewPreviewWrap: {
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#f2f2f7',
    ...FIGMA_CARD_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  instagramWebViewPreview: {
    flex: 1,
    width: '100%',
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  instagramWebViewPreviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramWebViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  instagramWebViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  instagramWebViewCloseBtn: {
    padding: 4,
    width: 40,
  },
  instagramWebViewTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
  },
  instagramWebViewOpenBtn: {
    padding: 4,
    width: 40,
    alignItems: 'flex-end',
  },
  instagramWebView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  instagramWebViewLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessPreviousRunsCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 24,
    ...FIGMA_CARD_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  businessPreviousRunsSection: {
    marginBottom: 8,
  },
  businessPreviousRunsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  businessPreviousRunsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  businessPreviousRunsArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f3f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessPreviousRunsScroll: {
    marginHorizontal: -20,
  },
  businessPreviousRunsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 14,
  },
  businessPreviousRunCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 14,
    // ...FIGMA_CARD_SHADOW,
  },
  businessPreviousRunCardNew: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: '#FFF',
    // ...FIGMA_CARD_SHADOW,
  },
  businessPreviousRunCardImageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
  },
  businessPreviousRunCardImage: {
    width: '100%',
    height: '100%',
  },
  businessPreviousRunCardPlaceholder: {
    backgroundColor: '#2C2C2E',
  },
  businessPreviousRunCardWhiteStrip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 14,
  },
  businessPreviousRunCardTitleNew: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  businessPreviousRunCardDescriptionNew: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
  },
  businessPreviousRunCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 18,
  },
  businessPreviousRunCardContent: {
    paddingBottom: 4,
  },
  businessPreviousRunCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  businessPreviousRunCardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 20,
  },
  businessReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 12,
    alignSelf: 'stretch',
    ...FIGMA_CARD_SHADOW,
  },
  businessReportButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
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
  instaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  instaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instaHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#252525',
  },
  instaHandleMuted: {
    color: 'rgba(71, 71, 71, 0.7)',
  },
  instaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  instaTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
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
  actionsCardFigma: {
    marginBottom: 8,
    gap: 16,
    minHeight: 122,
    justifyContent: 'center',
  },
  actionRowText: {
    fontSize: 17,
    color: '#252525',
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 20,
    flex: 1,
    textAlign: 'left',
  },
  actionRowTextDanger: {
    color: '#FF3B30',
  },
  socialCardFigma: {
    marginBottom: 8,
    minHeight: 122,
    justifyContent: 'center',
  },
  hairlineDividerFigma: {
    borderTopWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    alignSelf: 'stretch',
    transform: [{ rotate: '-0.4deg' }],
  },
  chatButton: {
    backgroundColor: '#252525',
    borderRadius: 100,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
    ...FIGMA_CARD_SHADOW,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
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
  recentPlansSection: {
    marginBottom: 20,
  },
  recentPlansHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  recentPlansSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  recentPlansHorizontalScroll: {
    marginHorizontal: -20,
  },
  recentPlansHorizontalContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  recentPlansHorizontalLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  recentPlanCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 14,
  },
  recentPlanCardPlaceholder: {
    backgroundColor: '#94A3B8',
  },
  recentPlanCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 18,
  },
  recentPlanCardContent: {
    paddingBottom: 4,
  },
  recentPlanCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  recentPlanCardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
    ...FIGMA_CARD_SHADOW,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
