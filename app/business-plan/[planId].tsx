import { apiService, getWebBaseUrl } from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';
import { useSnackbar } from '@/context/SnackbarContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '@/components/Avatar';
import ShareToChatModal from '@/components/ShareToChatModal';
import { fontTitle, fontBody } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Extract domain from URL for display (e.g. https://drive.google.com/... -> drive.google.com) */
function domainFromUrl(str: string): string | null {
  const trimmed = str.trim();
  try {
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const u = new URL(url);
    return u.hostname || null;
  } catch {
    return null;
  }
}
function isUrl(str: string): boolean {
  return /^https?:\/\/\S+/i.test(str.trim()) || /^[\w.-]+\.\w{2,}(\/.*)?$/i.test(str.trim());
}
// Hero image – white card starts exactly at bottom border of image (no gap, no overlap)
const HERO_HEIGHT = Math.max(260, SCREEN_HEIGHT * 0.58);
const HERO_OVERLAP = 24;
const CONTENT_PADDING_H = 20;
import GuestListModal from '@/components/GuestListModal';
import FormFiller from '@/components/FormFiller';

// Pass cards use the event's main image as background (see plan.media below)

interface BusinessPlan {
  plan_id: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type: string }>;
  location_text?: string;
  location_coordinates?: { lat: number; long: number };
  date?: string | Date;
  time?: string;
  created_at?: string; // when the plan was posted
  category_sub?: string[];
  passes?: Array<{
    pass_id: string;
    name: string;
    price: number;
    description?: string;
    capacity?: number;
    media?: Array<{ url: string; type: string }>;
  }>;
  add_details?: Array<{
    detail_type: string;
    title?: string;
    description?: string;
    heading?: string; // for additional_info: user heading
  }>;
  venue_required?: boolean;
  is_women_only?: boolean;
  allow_view_guest_list?: boolean;
  user_id?: string;
  business_id?: string;
  joins_count?: number;
}

export default function BusinessPlanDetailScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState<string | null>(null);
  const [showGuestListModal, setShowGuestListModal] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userHasTicket, setUserHasTicket] = useState<boolean | null>(null);
  const [registering, setRegistering] = useState(false);
  const galleryScrollRef = useRef<ScrollView>(null);
  const heroScrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const galleryPaddingH = 24;
  const galleryPaddingV = 20;
  const gallerySlideWidth = screenWidth - galleryPaddingH * 2;

  // Form-related state
  const [form, setForm] = useState<any>(null);
  const [showFormFiller, setShowFormFiller] = useState(false);
  const [formLoadingError, setFormLoadingError] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  useEffect(() => {
    if (showImageGallery && galleryScrollRef.current) {
      const t = setTimeout(() => {
        galleryScrollRef.current?.scrollTo({ x: galleryIndex * gallerySlideWidth, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [showImageGallery, galleryIndex, gallerySlideWidth]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBusinessPlan(planId);
      if (response.data) {
        setPlan(response.data);
        
        // Load organizer info
        if (response.data.user_id) {
          try {
            const userResponse = await apiService.getUserProfile(response.data.user_id);
            if (userResponse.data) {
              setOrganizer(userResponse.data);
            }
          } catch (error) {
            console.error('Failed to load organizer:', error);
          }
        }

        // Load form if form_id is present
        if (response.data.form_id) {
          try {
            const formResponse = await apiService.getForm(response.data.form_id);
            if (formResponse.data) {
              setForm(formResponse.data);
              setFormLoadingError(null);
            }
          } catch (error) {
            console.error('Failed to load form:', error);
            setFormLoadingError('Could not load registration form');
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load plan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate();
    const ord = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `${day}${ord} ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  const formatDayAndTime = (date: string | Date | undefined, time: string | undefined): string => {
    if (!date) return time || '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const timePart = time ? ` | ${time} onwards` : '';
    return `${formatDate(date)}${timePart}`;
  };

  const formatOrganizerTime = (date: string | Date | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  /** Post date for center pill: "Monday, 2:37pm" */
  const formatPostedDate = (createdAt: string | undefined, eventDate: string | Date | undefined): string => {
    if (createdAt) {
      const d = typeof createdAt === 'string' ? new Date(createdAt) : new Date(createdAt);
      return d.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (eventDate) {
      const d = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
      return d.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return 'Recent';
  };

  const formatTimeOnly = (time: string | undefined): string => {
    if (!time) return '';
    return time;
  };

  const handleSharePlan = () => {
    setShowShareModal(true);
  };

  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (user?.session_id && !currentUser) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [user?.session_id, currentUser, dispatch]);

  const isOwnEvent = !!(plan && user?.user_id && (plan.user_id === user.user_id || plan.business_id === user.user_id));

  useEffect(() => {
    if (!planId || !user?.user_id || !plan) {
      setUserHasTicket(null);
      return;
    }
    apiService.hasTicketForPlan(planId, user.user_id).then(setUserHasTicket).catch(() => setUserHasTicket(false));
  }, [planId, user?.user_id, plan?.plan_id]);

  const handleViewPass = async () => {
    if (!user?.user_id || !planId) return;
    try {
      const res = await apiService.getUserTicket(planId, user.user_id);
      const ticket = (res as any)?.data ?? (res as any);
      const ticketId = ticket?.ticket_id;
      if (ticketId && ticket) {
        const ticketData = encodeURIComponent(JSON.stringify(ticket));
        router.push({
          pathname: '/ticket/[ticketId]',
          params: { ticketId, planId, ticketData },
        } as any);
      } else {
        Alert.alert('Error', 'Could not load ticket');
      }
    } catch (e: any) {
      Alert.alert('Error', (e as any)?.message || 'Failed to load ticket');
    }
  };

  const handleRegister = async () => {
    if (!user?.user_id || !user?.access_token) {
      router.push('/login');
      return;
    }

    if (isOwnEvent) {
      Alert.alert('Cannot Register', "You can't register for your own event.");
      return;
    }

    if (plan?.is_women_only) {
      const gender = (currentUser?.gender || '').toLowerCase();
      if (gender !== 'female') {
        showSnackbar('The post is for women only');
        return;
      }
    }

    if (!selectedPass && plan?.passes && plan.passes.length > 0) {
      Alert.alert('Select Ticket', 'Please select a ticket type first');
      return;
    }

    // If form is attached, show form first
    if (form && form.fields && form.fields.length > 0) {
      setShowFormFiller(true);
      return;
    }

    // Otherwise proceed with registration
    await completeRegistration();
  };

  const completeRegistration = async (formResponses?: Record<string, any>) => {
    if (!user?.user_id || !planId) return;

    setRegistering(true);
    try {
      const alreadyRegistered = await apiService.hasTicketForPlan(planId, user.user_id);
      if (alreadyRegistered) {
        setUserHasTicket(true);
        Alert.alert(
          'Already Registered',
          "You are already registered for this event. You can check your pass from your profile."
        );
        return;
      }

      const response = await apiService.registerForEvent(
        planId,
        user.user_id,
        selectedPass || undefined
      );

      if (response.success && response.data?.ticket) {
        // Submit form response if available
        if (form && formResponses && response.data.registration_id) {
          try {
            await apiService.submitFormResponse({
              form_id: form.form_id,
              registration_id: response.data.registration_id,
              plan_id: planId,
              user_id: user.user_id,
              responses: formResponses
            });
          } catch (formError) {
            console.error('Failed to submit form response:', formError);
            // Continue anyway - registration was successful
          }
        }

        setUserHasTicket(true);
        const ticketData = encodeURIComponent(JSON.stringify(response.data.ticket));
        router.push({
          pathname: '/ticket/[ticketId]',
          params: {
            ticketId: response.data.ticket.ticket_id,
            planId: planId,
            ticketData: ticketData,
          },
        } as any);
      } else {
        console.error('Registration response missing ticket:', response);
        Alert.alert('Registration Failed', 'Ticket was not created. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Failed to register for event');
    } finally {
      setRegistering(false);
      setShowFormFiller(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Loading plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plan not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const planMedia = plan.media && plan.media.length > 0 ? plan.media.slice(0, 5) : [{ url: 'https://picsum.photos/id/1011/200/300', type: 'image' }];
  const mediaCount = planMedia.length;
  const organizerName = organizer?.name ?? organizer?.username ?? 'Organizer';
  const organizerAvatar = organizer?.profile_image ?? organizer?.avatar;

  const heroImageUri = planMedia[0]?.url || 'https://picsum.photos/id/1011/800/1200';

  const detailPills = plan.add_details?.filter((d) => d.detail_type !== 'google_drive_link') ?? [];
  const distanceSubtitle = plan.add_details?.find((d) => d.detail_type === 'distance')?.title
    || plan.add_details?.find((d) => d.detail_type === 'distance')?.description
    || null;

  /** Human-readable label for category pill (e.g. distance -> Distance, f&b -> F&B) */
  const categoryLabel = (detail: { detail_type: string; title?: string; heading?: string }) => {
    if (detail.title) return detail.title;
    const t = detail.detail_type;
    if (t === 'f&b') return 'F&B';
    return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ');
  };

  const heroTotalHeight = HERO_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Full-screen blur white background (replaces solid black) */}
      <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
      {/* HERO – fixed to screen */}
      <View
        style={[
          styles.heroWrap,
          {
            height: HERO_HEIGHT,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          },
        ]}
      >
          {mediaCount > 1 ? (
            <ScrollView
              ref={heroScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setHeroImageIndex(i);
              }}
              style={styles.heroScroll}
              contentContainerStyle={[styles.heroScrollContent, { height: heroTotalHeight }]}
            >
              {planMedia.map((item, i) => (
                <Image key={i} source={{ uri: item.url }} style={[styles.heroImageSlide, { height: heroTotalHeight }]} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <Image source={{ uri: heroImageUri }} style={[styles.heroImage, { height: heroTotalHeight }]} resizeMode="cover" />
          )}

          <View style={[styles.topSafe, { bottom: 24, top: undefined }]}>
            {mediaCount > 1 && (
              <View style={styles.carouselDots}>
                {planMedia.map((_, i) => (
                  <View key={i} style={[styles.carouselDot, i === heroImageIndex && styles.carouselDotActive]} />
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setGalleryIndex(heroImageIndex); setShowImageGallery(true); }}
          />
      </View>

      {/* ScrollView – white card starts exactly where image ends (no gap) */}
      <ScrollView
        style={[styles.scrollBelowHero, { flex: 1 }]}
        contentContainerStyle={{
          paddingTop: HERO_HEIGHT,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* WHITE CARD – top edge on image bottom border; 5px horizontal margin; only top corners rounded */}
        <View
          style={[
            styles.contentOverlay,
            styles.contentOverlayShadow,
            {
              marginHorizontal: 5,
              paddingTop: 20,
              paddingHorizontal: CONTENT_PADDING_H,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderWidth: 0,
              borderColor: 'transparent',
              backgroundColor: '#FFF',
            },
          ]}
        >
          <LinearGradient colors={['rgba(255,255,255,0.7)', '#FFFFFF']} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={styles.contentOverlayInner}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.description}>{plan.description}</Text>

          {/* Venue + date/time – one gray rounded section */}
          <View style={styles.venueDateCard}>
            {plan.location_text && (
              <View style={styles.venueDateRow}>
                <Ionicons name="location" size={18} color="#1C1C1E" style={styles.venueDateIcon} />
                <View style={styles.venueDateTextWrap}>
                  <Text style={styles.venueDateTitle}>{plan.location_text}</Text>
                  {distanceSubtitle ? <Text style={styles.venueDateSubtitle}>{distanceSubtitle}</Text> : null}
                </View>
              </View>
            )}
            {(plan.date || plan.time) && (
              <View style={styles.venueDateRow}>
                <Ionicons name="calendar-outline" size={18} color="#1C1C1E" style={styles.venueDateIcon} />
                <View style={styles.venueDateTextWrap}>
                  <Text style={styles.venueDateTitle}>
                    {formatDate(plan.date)}
                    {plan.time ? ` | ${plan.time} onwards` : ''}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Category pills – title above, value below; links shortened to domain and clickable */}
          {detailPills.length > 0 && (
            <View style={styles.categoryPillsWrap}>
              {detailPills.slice(0, 4).map((detail, index) => {
                const heading = detail.detail_type === 'additional_info'
                  ? (detail.heading ?? detail.title ?? 'Additional Info')
                  : categoryLabel(detail);
                const value = detail.description ?? '';
                const displayValue = value && isUrl(value) ? (domainFromUrl(value) || value) : value;
                const isLink = value && isUrl(value);
                return (
                  <View key={index} style={styles.categoryPill}>
                    <Text style={styles.categoryPillHeading}>{heading}</Text>
                    {value ? (
                      isLink ? (
                        <TouchableOpacity onPress={() => { try { Linking.openURL(value.startsWith('http') ? value : `https://${value}`); } catch (_) {} }}>
                          <Text style={[styles.categoryPillValue, styles.categoryPillLink]} numberOfLines={2}>{displayValue}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.categoryPillValue} numberOfLines={2}>{value}</Text>
                      )
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* Dark gray See who's coming pill – only if more than 3 registered */}
          {plan.allow_view_guest_list !== false && (plan.joins_count ?? 0) > 3 && (
            <TouchableOpacity style={styles.attendeesCard} onPress={() => setShowGuestListModal(true)} activeOpacity={0.9}>
              <View style={styles.attendeesTextBlock}>
                <Text style={styles.attendeesTitle}>See who's coming</Text>
                <Text style={styles.attendeesSubtitle}>Join event to view</Text>
              </View>
              <View style={styles.attendeesAvatars}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[styles.avatarStack, { marginLeft: i === 1 ? 0 : -10 }]}>
                    <Avatar uri={`https://i.pravatar.cc/150?u=${i}`} size={32} />
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}

          {/* Select Passes – ticket bg images; unselected blurred 50% white */}
          {plan.passes && plan.passes.length > 0 && (() => {
            const eventImageUri = plan.media && plan.media.length > 0 && plan.media[0]?.url
              ? plan.media[0].url
              : null;
            const bgSource = eventImageUri ? { uri: eventImageUri } : require('@/assets/images/ticket1 bg.png');
            return (
            <View style={styles.ticketsSection}>
              <Text style={styles.ticketsTitle}>Select Passes</Text>
              {plan.passes.map((pass) => {
                const isSelected = selectedPass === pass.pass_id;
                return (
                  <TouchableOpacity
                    key={pass.pass_id}
                    style={styles.passCard}
                    onPress={() => setSelectedPass(pass.pass_id)}
                    activeOpacity={0.9}
                  >
                    <ImageBackground source={bgSource} style={styles.passBg} imageStyle={styles.passBgImage}>
                      {selectedPass !== null && !isSelected && <View style={styles.passBlurOverlay} />}
                      <View style={styles.passContent}>
                        <Text style={styles.passName}>{pass.name}</Text>
                        {pass.description ? (
                          <Text style={styles.passDescription} numberOfLines={2}>{pass.description}</Text>
                        ) : null}
                      </View>
                      <View style={styles.passPriceBlock}>
                        <Text style={styles.passPrice}>₹{pass.price}</Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={22} color="#FFF" style={styles.passCheck} />
                        )}
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              })}
            </View>
            );
          })()}

          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom bar – Register / View Pass (match web mobile) */}
      <View style={[styles.bottomBarWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {userHasTicket === true && (
          <TouchableOpacity style={styles.bottomBarButton} onPress={handleViewPass}>
            <Text style={styles.registerButtonText}>View Pass</Text>
          </TouchableOpacity>
        )}
        {userHasTicket !== true && !isOwnEvent && (
          <TouchableOpacity
            style={[styles.bottomBarButton, registering && styles.registerButtonGreyed]}
            onPress={handleRegister}
            disabled={registering}
          >
            {registering ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>
        )}
        {userHasTicket !== true && isOwnEvent && (
          <TouchableOpacity style={[styles.bottomBarButton, styles.registerButtonGreyed]} disabled>
            <Text style={[styles.registerButtonText, styles.registerButtonTextGreyed]}>Register</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sticky header: back (blur), user pill (blur), share (blur) – all in one line */}
      <View style={[styles.stickyHeaderOverlay, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.headerRowSingle}>
          <TouchableOpacity style={styles.backButtonTouch} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <BlurView intensity={60} tint="light" style={styles.iconBlur}>
              <View style={styles.backButtonCircle}>
                <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
              </View>
            </BlurView>
          </TouchableOpacity>
          <View style={styles.organizerPillWrapSingle} collapsable={false}>
            <BlurView intensity={60} tint="light" style={styles.organizerPillBlur}>
              <TouchableOpacity
                style={styles.organizerPillCenter}
                activeOpacity={0.8}
                onPress={() => {
                  const userId = organizer?.user_id ?? plan?.user_id;
                  if (userId) router.push({ pathname: '/profile/[userId]', params: { userId } } as any);
                }}
                disabled={!(organizer?.user_id ?? plan?.user_id)}
              >
                <Avatar uri={organizerAvatar} size={36} />
                <View style={styles.organizerPillText}>
                  <Text style={styles.organizerName} numberOfLines={1}>{organizerName}</Text>
                  <Text style={styles.organizerTime} numberOfLines={1}>{formatPostedDate(plan.created_at, plan.date)}</Text>
                </View>
              </TouchableOpacity>
            </BlurView>
          </View>
          <View style={styles.headerRightRow}>
            {user?.user_id && (plan.user_id === user.user_id || plan.business_id === user.user_id) && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push({ pathname: '/analytics/event/[planId]', params: { planId: plan.plan_id } } as any)}
              >
                <BlurView intensity={60} tint="light" style={styles.iconBlur}>
                  <View style={styles.headerIconCircle}>
                    <Ionicons name="stats-chart" size={22} color="#1C1C1E" />
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerIconButton} onPress={handleSharePlan}>
              <BlurView intensity={60} tint="light" style={styles.iconBlur}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="share-outline" size={22} color="#1C1C1E" />
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <GuestListModal
        visible={showGuestListModal}
        onClose={() => setShowGuestListModal(false)}
        planId={planId || ''}
        onRegisterPress={() => {
          setShowGuestListModal(false);
          handleRegister();
        }}
      />

      <ShareToChatModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={plan?.plan_id ?? ''}
        postTitle={plan?.title ?? ''}
        postDescription={plan?.description ?? ''}
        postMedia={plan?.media ?? []}
        postTags={plan?.category_sub}
        postCategorySub={plan?.category_sub}
        postCategoryMain={plan?.category_sub?.[0]}
        postIsBusiness={true}
        userId={user?.user_id ?? ''}
        currentUserAvatar={organizer?.profile_image ?? organizer?.avatar}
      />

      {/* Full-screen image gallery modal – safe area, inset from borders; tap backdrop or close to dismiss */}
      <Modal
        visible={showImageGallery}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowImageGallery(false)}
      >
        <SafeAreaView style={styles.galleryOverlay} edges={['top', 'bottom']}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowImageGallery(false)} />
          <View
            style={[styles.galleryContentWrap, { paddingHorizontal: galleryPaddingH, paddingTop: galleryPaddingV, paddingBottom: galleryPaddingV, margin: 20 }]}
            pointerEvents="box-none"
          >
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
            {mediaCount > 1 && (
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

      {/* Form Filler Modal */}
      {form && form.fields && (
        <FormFiller
          fields={form.fields}
          visible={showFormFiller}
          onSubmit={async (responses) => {
            await completeRegistration(responses);
          }}
          onCancel={() => setShowFormFiller(false)}
          loading={registering}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { paddingBottom: 40, flexGrow: 1 },
  textSectionScroll: {
    flex: 1,
  },
  
  textSectionScrollContent: {
    flexGrow: 1,
  },
  heroWrap: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    zIndex: 10,
    elevation: 10,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    backgroundColor: 'transparent',
  },
  heroScroll: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  heroScrollContent: {},
  heroImageSlide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroWhiteOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  stickyHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  headerRowSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButtonTouch: { zIndex: 11 },
  topSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 11,
  },
  iconBlur: {
    overflow: 'hidden',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {},
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerPillWrap: {
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: 16,
  },
  organizerPillWrapSingle: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  organizerPillBlur: {
    overflow: 'hidden',
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'center',
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  organizerPillCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    gap: 8,
  },
  organizerPillText: {
    minWidth: 0,
    maxWidth: 140,
    justifyContent: 'center',
  },
  organizerInfo: {
    minWidth: 0,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  organizerTime: {
    fontSize: 11,
    color: '#1C1C1E',
    marginTop: 2,
  },
  carouselDots: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  carouselDotActive: {
    backgroundColor: '#FFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  scrollBelowHero: {
    backgroundColor: 'transparent',
    zIndex: 11,
    elevation: 11,
  },
  contentOverlay: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    minHeight: SCREEN_HEIGHT * 0.3,
    overflow: 'hidden',
  },
  contentOverlayShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  contentOverlayInner: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingTop: 2,
  },
  venueDateCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  venueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  venueDateIcon: {
    marginRight: 8,
  },
  venueDateTextWrap: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  venueDateTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontTitle,
    color: '#1C1C1E',
    textAlign: 'left',
  },
  venueDateSubtitle: {
    fontSize: 12,
    fontFamily: fontBody,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'left',
  },
  categoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryPill: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: '47%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillHeading: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontTitle,
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
  },
  categoryPillValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontBody,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
  },
  categoryPillLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backButtonText: {
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
  galleryScroll: {
    flex: 1,
  },
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fontTitle,
    color: '#1C1C1E',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: fontBody,
    color: '#444',
    lineHeight: 21,
    marginBottom: 20,
  },
  attendeesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  attendeesTextBlock: {
    flex: 1,
  },
  attendeesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  attendeesSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  attendeesAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStack: {
    borderWidth: 2,
    borderColor: '#1C1C1E',
    borderRadius: 16,
  },
  ticketsSection: {
    marginBottom: 24,
  },
  ticketsTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fontTitle,
    color: '#1C1C1E',
    marginBottom: 14,
  },
  passCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  passBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 100,
  },
  passBgImage: {
    borderRadius: 16,
  },
  passBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
  },
  passContent: {
    flex: 1,
    marginRight: 12,
  },
  passName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
  },
  passDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  passPriceBlock: {
    alignItems: 'flex-end',
  },
  passPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  passCheck: {
    marginTop: 6,
  },
  registerButton: {
    backgroundColor: '#1C1C1E',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonGreyed: {
    backgroundColor: '#C5C5D0',
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontTitle,
  },
  registerButtonTextGreyed: {
    color: '#8E8E93',
  },
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: CONTENT_PADDING_H,
    paddingTop: 12,
    zIndex: 50,
    elevation: 50,
  },
  bottomBarButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});
