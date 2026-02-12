import { apiService } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import EventReviewCard, { EventReviewRating } from '@/components/EventReviewCard';
import QRCode from 'react-native-qrcode-svg';

const EVENT_REVIEWS_KEY = '@vybeme_event_reviews';

interface TicketData {
  ticket_id: string;
  ticket_number: string;
  qr_code: string;
  qr_code_hash: string;
  status: string;
  price_paid: number;
  plan: {
    plan_id: string;
    title: string;
    description: string;
    location_text?: string;
    date?: string;
    time?: string;
    media?: Array<{ url: string; type: string }>;
    ticket_image?: string;
    passes?: Array<{ pass_id: string; name: string; price?: number }>;
    category_main?: string;
    category_sub?: string[];
    group_id?: string | null;
    add_details?: Array<{ detail_type: string; title?: string; description?: string }>;
  };
  pass_id?: string;
  user: {
    user_id: string;
    name: string;
    profile_image?: string;
  };
}

export default function TicketScreen() {
  const router = useRouter();
  const { ticketId, planId, ticketData } = useLocalSearchParams<{ 
    ticketId: string; 
    planId: string;
    ticketData?: string; // JSON stringified ticket data
  }>();
  const { user } = useAppSelector((state) => state.auth);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewedPlans, setReviewedPlans] = useState<Record<string, EventReviewRating>>({});
  const [selectedReview, setSelectedReview] = useState<EventReviewRating | null>(null);
  const ticketCardRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const planIdFromTicket = ticket?.plan?.plan_id;
  const eventDate = ticket?.plan?.date ? new Date(ticket.plan.date) : null;
  const hasEventPassed = eventDate ? eventDate < new Date() : false;
  const isReviewed = planIdFromTicket ? !!reviewedPlans[planIdFromTicket] : false;
  const showReviewCard = !loading && !!ticket && hasEventPassed && !isReviewed;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(EVENT_REVIEWS_KEY);
        if (raw) setReviewedPlans(JSON.parse(raw));
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    loadTicket();
  }, [ticketId, planId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      
      // First, try to use ticket data passed from registration (if available)
      if (ticketData) {
        try {
          const parsedTicket = JSON.parse(decodeURIComponent(ticketData));
          if (parsedTicket) {
            // Ensure plan object exists
            if (!parsedTicket.plan) {
              console.warn('Ticket data missing plan, creating default plan object');
              parsedTicket.plan = {
                plan_id: parsedTicket.plan_id || planId || '',
                title: '',
                description: '',
                location_text: null,
                date: null,
                time: null,
                media: [],
                ticket_image: null
              };
            }
            setTicket(parsedTicket);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log('Failed to parse ticket data from params, fetching from API', e);
        }
      }
      
      // Otherwise, fetch from API
      if (ticketId) {
        const response = await apiService.getTicketById(ticketId);
        if (response.success && response.data?.ticket) {
          const ticketData = response.data.ticket;
          // Ensure plan object exists
          if (!ticketData.plan) {
            console.warn('Ticket from API missing plan data');
            ticketData.plan = {
              plan_id: ticketData.plan_id || '',
              title: '',
              description: '',
              location_text: null,
              date: null,
              time: null,
              media: []
            };
          }
          setTicket(ticketData);
        } else if (response.data?.ticket) {
          // Some APIs might not have success field
          const ticketData = response.data.ticket;
          if (!ticketData.plan) {
            ticketData.plan = {
              plan_id: ticketData.plan_id || '',
              title: '',
              description: '',
              location_text: null,
              date: null,
              time: null,
              media: []
            };
          }
          setTicket(ticketData);
        } else {
          throw new Error(response.message || 'Ticket not found in response');
        }
      } else {
        throw new Error('Ticket ID is required');
      }
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      Alert.alert('Error', error.message || 'Failed to load ticket');
      // Don't go back - let user see error
    } finally {
      setLoading(false);
    }
  };

  const shareTicketImage = async (uri: string) => {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Save ticket',
      });
    } else {
      await Share.share({
        url: uri,
        title: 'Save ticket',
        type: 'image/png',
      });
    }
  };

  const handleAddToWallet = async () => {
    if (!ticketCardRef.current) return;
    try {
      const uri = await captureRef(ticketCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 800,
      });

      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved', 'Ticket (with QR code) saved to your photos.');
          return;
        }
      } catch (mediaError: any) {
        const msg = mediaError?.message || '';
        const isExpoGoMediaRejected =
          msg.includes('requestPermissionsAsync') && msg.includes('rejected');
        const isAndroidMediaRestriction =
          msg.includes('Expo Go') || msg.includes('development build');
        if (isExpoGoMediaRejected || isAndroidMediaRestriction) {
          try {
            await shareTicketImage(uri);
            return;
          } catch (shareErr: any) {
            if (shareErr?.message?.includes('cancel') || shareErr?.code === 'E_SHARE_CANCELLED') return;
            Alert.alert(
              'Could not save to photos',
              'In Expo Go on Android, saving to photos is not available. Use Share to save the ticket image to your device, or create a development build for direct save.',
              [{ text: 'OK' }]
            );
            return;
          }
        }
      }

      // Permission denied or save failed: offer share so user can save the image
      await shareTicketImage(uri);
    } catch (error: any) {
      const msg = error?.message || '';
      if (
        msg.includes('requestPermissionsAsync') &&
        (msg.includes('rejected') || msg.includes('Expo Go') || msg.includes('development build'))
      ) {
        Alert.alert(
          'Save not available in Expo Go',
          'On Android, Expo Go cannot save directly to photos. Create a development build to save tickets to your gallery, or use Share to save the ticket image elsewhere.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error?.message || 'Could not save ticket image.');
      }
    }
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'Jan 29, 2022';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string | undefined): string => {
    if (!time) return '10:00 PM';
    return time;
  };

  const handleReviewSubmit = async (rating: EventReviewRating) => {
    if (!planIdFromTicket) return;
    try {
      const next = { ...reviewedPlans, [planIdFromTicket]: rating };
      setReviewedPlans(next);
      setSelectedReview(rating);
      await AsyncStorage.setItem(EVENT_REVIEWS_KEY, JSON.stringify(next));
    } catch (_) {}
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#8B7AB8', '#C9A0B8', '#F5E6E8', '#FFFFFF']} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeRoot}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1C1C1E" />
            <Text style={styles.loadingText}>Loading ticket...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#8B7AB8', '#C9A0B8', '#F5E6E8', '#FFFFFF']} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeRoot}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Ticket not found</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Use this ticket's plan image (ticket_image first, then first media, then placeholder)
  const mainImage = ticket.plan?.ticket_image
    ? ticket.plan.ticket_image
    : (ticket.plan?.media && ticket.plan.media.length > 0 && ticket.plan.media[0]?.url)
      ? ticket.plan.media[0].url
      : undefined;

  // Pass name from ticket.pass_id + plan.passes
  const passName = (() => {
    const passId = (ticket as TicketData & { pass_id?: string }).pass_id;
    const passes = ticket.plan?.passes || [];
    if (passId && passes.length > 0) {
      const p = passes.find((x: { pass_id: string }) => x.pass_id === passId);
      if (p?.name) return p.name;
    }
    if (passes.length > 0 && passes[0].name) return passes[0].name;
    return 'Ticket';
  })();

  // Pills: Price, Distance, F&B, Music (from plan add_details + passes)
  const pillItems = (() => {
    const plan = ticket.plan as TicketData['plan'] & { add_details?: Array<{ detail_type: string; title?: string; description?: string }> };
    const addDetails = plan?.add_details || [];
    const passes = plan?.passes || [];
    const detailBy = (t: string) => addDetails.find((d) => d.detail_type === t);
    const priceLabel = ticket.price_paid > 0 ? `₹${ticket.price_paid}` : (passes[0]?.price != null && passes[0].price > 0) ? `₹${passes[0].price}` : 'Free';
    const distanceLabel = detailBy('distance')?.title || detailBy('distance')?.description || plan?.location_text || '—';
    const fbLabel = detailBy('f&b')?.title || detailBy('f&b')?.description || '—';
    const musicLabel = plan?.category_main || (plan?.category_sub && plan.category_sub[0]) || 'Event';
    return [
      { icon: 'pricetag-outline' as const, label: priceLabel },
      { icon: 'navigate-outline' as const, label: distanceLabel },
      { icon: 'restaurant-outline' as const, label: fbLabel },
      { icon: 'musical-notes-outline' as const, label: musicLabel },
    ];
  })();

  const effectivePlanId = ticket.plan?.plan_id || planId;
  const groupId = (ticket.plan as { group_id?: string | null })?.group_id;

  const imageHeight = Math.round(windowHeight * 0.48);
  const overlapAmount = 56;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B7AB8', '#C9A0B8', '#F5E6E8', '#FFFFFF']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeRoot} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.pageTitle}>Booking Confirmed</Text>

          {/* Centered block: ticket card + overlapping details – ref wraps image + QR section so save includes QR */}
          <View style={styles.centeredBlock}>
            <View ref={ticketCardRef} collapsable={false} style={{ zIndex: 2 }}>
              {/* Main ticket card - image ~half viewport, on top of white section */}
              <View style={[styles.ticketCardWrap, { zIndex: 2 }]}>
                <View style={styles.ticketCard}>
                  {mainImage ? (
                    <Image source={{ uri: mainImage }} style={[styles.ticketCardImage, { height: imageHeight }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.ticketCardImage, styles.bannerPlaceholder, { height: imageHeight }]}>
                      <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.6)" />
                    </View>
                  )}
                  {/* Bottom 20% blur */}
                  <View style={[styles.ticketCardBlurStrip, { height: imageHeight * 0.2 }]} pointerEvents="none">
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                  </View>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.75)']}
                    style={styles.ticketCardOverlay}
                  >
                    <Text style={styles.bannerTitle} numberOfLines={2}>{ticket.plan?.title || 'Event'}</Text>
                    <View style={styles.bannerMetaRow}>
                      <Text style={styles.bannerDate}>{formatDate(ticket.plan?.date)}</Text>
                      <Text style={styles.bannerTime}>{formatTime(ticket.plan?.time)}</Text>
                    </View>
                    {ticket.plan?.location_text ? (
                      <Text style={styles.bannerLocation} numberOfLines={1}>{ticket.plan.location_text}</Text>
                    ) : null}
                  </LinearGradient>
                  <TouchableOpacity
                    style={styles.downloadTicketBtn}
                    onPress={handleAddToWallet}
                    hitSlop={12}
                  >
                    <Ionicons name="download-outline" size={22} color="#1C1C1E" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info section: pills + QR – inside ref so saved image includes QR */}
              <View style={[styles.infoSection, { marginTop: -overlapAmount, paddingTop: overlapAmount + 16, zIndex: 1 }]}>
                <View style={styles.infoLeft}>
                  {pillItems.map((item, idx) => (
                    <View key={idx} style={styles.pill}>
                      <Ionicons name={item.icon} size={18} color="#1C1C1E" />
                      <Text style={styles.pillLabel} numberOfLines={1}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.infoRight}>
                  <View style={styles.qrWrap}>
                    {ticket.qr_code_hash ? (
                      <QRCode value={ticket.qr_code_hash} size={112} color="#1C1C1E" backgroundColor="#FFF" />
                    ) : (
                      <View style={styles.qrPlaceholder}>
                        <Ionicons name="qr-code-outline" size={56} color="#8E8E93" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.passType}>{passName}</Text>
                  <Text style={styles.passId}>{ticket.ticket_number}</Text>
                </View>
              </View>
            </View>
          </View>

          {showReviewCard && (
            <View style={styles.reviewSection}>
              <EventReviewCard
                question={ticket.plan?.title ? `How was your last event at ${ticket.plan.title}?` : 'How was your experience?'}
                selectedRating={selectedReview}
                onSelectRating={setSelectedReview}
                onSubmit={handleReviewSubmit}
                variant="standalone"
              />
            </View>
          )}
        </ScrollView>

        {/* Bottom fixed actions */}
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.viewEventBtn}
            onPress={() => effectivePlanId && router.push({ pathname: '/business-plan/[planId]', params: { planId: effectivePlanId } } as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={20} color="#1C1C1E" style={styles.btnIconLeft} />
            <Text style={styles.viewEventBtnText}>View Event</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.eventChatBtn}
            onPress={() => {
              if (groupId) {
                router.push({ pathname: '/chat/group/[groupId]', params: { groupId } } as any);
              } else if (effectivePlanId) {
                router.push({ pathname: '/chat/[groupId]', params: { groupId: effectivePlanId } } as any);
              } else {
                router.back();
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.eventChatBtnText}>Go to Event Chat</Text>
            <Ionicons name="arrow-redo-outline" size={18} color="#FFF" style={styles.btnIconRight} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeRoot: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'center',
  },
  centeredBlock: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 420,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.98)',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  ticketCardWrap: {
    marginBottom: 0,
  },
  ticketCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  ticketCardImage: {
    width: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketCardBlurStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  ticketCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 2,
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  bannerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bannerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },
  bannerTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },
  bannerLocation: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  downloadTicketBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 20,
  },
  infoLeft: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    maxWidth: 140,
  },
  infoRight: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
  },
  qrWrap: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  qrPlaceholder: {
    width: 112,
    height: 112,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
  },
  passId: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  reviewSection: {
    marginTop: 24,
  },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  viewEventBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  viewEventBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  btnIconLeft: {
    marginRight: 8,
    transform: [{ scaleX: -1 }],
  },
  eventChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  eventChatBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  btnIconRight: {
    marginLeft: 8,
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
  backButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
