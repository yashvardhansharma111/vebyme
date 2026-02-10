import { apiService } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my ticket for ${ticket?.plan?.title || 'this event'}`,
      });
    } catch (error: any) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToWallet = async () => {
    if (!ticketCardRef.current) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save the ticket to your photos.');
        return;
      }
      const uri = await captureRef(ticketCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 400,
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Ticket image saved to your photos.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save ticket image.');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Loading ticket...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ticket not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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

  // Activity items for the details card (icon + label), from categories or defaults
  const activityItems = (() => {
    const main = ticket.plan?.category_main;
    const sub = ticket.plan?.category_sub || [];
    const labels = [main, ...sub].filter(Boolean).slice(0, 4);
    const iconMap: Record<string, string> = {
      sports: 'football-outline',
      music: 'musical-notes-outline',
      food: 'cafe-outline',
      cafe: 'cafe-outline',
      fitness: 'barbell-outline',
      run: 'walk-outline',
      default: 'ellipse-outline',
    };
    if (labels.length === 0) labels.push('Event', 'Check-in', 'Pass', 'Entry');
    return labels.map((label) => {
      const key = (typeof label === 'string' ? label.toLowerCase() : '').replace(/\s+/g, '');
      const icon = iconMap[key] || iconMap[key?.slice(0, 4)] || iconMap.default;
      return { icon, label: String(label) };
    });
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - blue bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Ticket</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleAddToWallet} style={styles.headerIconBtn}>
              <Ionicons name="download-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.headerIconBtn}>
              <Ionicons name="share-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner: event image with bottom overlay (title, date, time, location) */}
        <View ref={ticketCardRef} collapsable={false}>
          <View style={styles.bannerContainer}>
            {mainImage ? (
              <Image source={{ uri: mainImage }} style={styles.bannerImage} resizeMode="cover" />
            ) : (
              <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
                <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.bannerOverlay}
            >
              <Text style={styles.bannerTitle}>{ticket.plan?.title || 'Event'}</Text>
              <View style={styles.bannerMetaRow}>
                <Text style={styles.bannerDate}>{formatDate(ticket.plan?.date)}</Text>
                <Text style={styles.bannerTime}>{formatTime(ticket.plan?.time)}</Text>
              </View>
              {ticket.plan?.location_text ? (
                <Text style={styles.bannerLocation} numberOfLines={1}>{ticket.plan.location_text}</Text>
              ) : null}
            </LinearGradient>
          </View>

          {/* White frosted details card: activities (left) + QR & pass (right) */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsCardLeft}>
              {activityItems.map((item, idx) => (
                <View key={idx} style={styles.activityRow}>
                  <View style={styles.activityIconWrap}>
                    <Ionicons name={item.icon as any} size={18} color="#1C1C1E" />
                  </View>
                  <Text style={styles.activityLabel} numberOfLines={1}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.detailsCardRight}>
              <View style={styles.qrWrap}>
                {ticket.qr_code_hash ? (
                  <QRCode
                    value={ticket.qr_code_hash}
                    size={120}
                    color="#1C1C1E"
                    backgroundColor="#FFF"
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code-outline" size={64} color="#8E8E93" />
                  </View>
                )}
              </View>
              <Text style={styles.passType}>{passName}</Text>
              <Text style={styles.passId}>{ticket.ticket_number}</Text>
            </View>
          </View>
        </View>

        {/* Post-event review */}
        {showReviewCard && (
          <View style={styles.reviewSection}>
            <EventReviewCard
              question={
                ticket.plan?.title
                  ? `How was your last event at ${ticket.plan.title}?`
                  : 'How was your experience?'
              }
              selectedRating={selectedReview}
              onSelectRating={setSelectedReview}
              onSubmit={handleReviewSubmit}
              variant="standalone"
            />
          </View>
        )}

        {/* Done button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  headerLeft: {
    minWidth: 80,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  headerIconBtn: {
    padding: 6,
  },
  bannerContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bannerTitle: {
    fontSize: 28,
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
  detailsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  detailsCardLeft: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  detailsCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  qrWrap: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  passId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: 1,
  },
  reviewSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  doneButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
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
