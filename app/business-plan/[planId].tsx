import { apiService, getWebBaseUrl } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '@/components/Avatar';
import GuestListModal from '@/components/GuestListModal';

interface BusinessPlan {
  plan_id: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type: string }>;
  location_text?: string;
  location_coordinates?: { lat: number; long: number };
  date?: string | Date;
  time?: string;
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

  useEffect(() => {
    loadPlan();
  }, [planId]);

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

  const formatTimeOnly = (time: string | undefined): string => {
    if (!time) return '';
    return time;
  };

  const handleSharePlan = async () => {
    try {
      const planUrl = `${getWebBaseUrl()}/go/post/${plan?.plan_id}`;
      const message = `Check out this event: ${plan?.title}\n\n${planUrl}`;
      await Share.share({ message, url: planUrl, title: plan?.title });
    } catch (err: any) {
      if (err?.message && !err.message.includes('cancel')) {
        Alert.alert('Error', err.message);
      }
    }
  };

  const { user } = useAppSelector((state) => state.auth);

  const isOwnEvent = !!(plan && user?.user_id && (plan.user_id === user.user_id || plan.business_id === user.user_id));

  const handleRegister = async () => {
    if (!user?.user_id || !user?.access_token) {
      Alert.alert('Login Required', 'Please log in to register for this event');
      return;
    }

    if (isOwnEvent) {
      Alert.alert('Cannot Register', "You can't register for your own event.");
      return;
    }

    if (!selectedPass && plan?.passes && plan.passes.length > 0) {
      Alert.alert('Select Ticket', 'Please select a ticket type first');
      return;
    }

    try {
      const alreadyRegistered = await apiService.hasTicketForPlan(planId, user.user_id);
      if (alreadyRegistered) {
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
      
      console.log('Registration response:', response);
      
      if (response.success && response.data?.ticket) {
        // Navigate to ticket display screen with ticket data
        const ticketData = encodeURIComponent(JSON.stringify(response.data.ticket));
        router.push({
          pathname: '/ticket/[ticketId]',
          params: { 
            ticketId: response.data.ticket.ticket_id,
            planId: planId,
            ticketData: ticketData
          }
        } as any);
      } else {
        console.error('Registration response missing ticket:', response);
        Alert.alert('Registration Failed', 'Ticket was not created. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Failed to register for event');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Images - scrollable up to 5 */}
        <View style={styles.headerImageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.heroScroll}
            contentContainerStyle={styles.heroScrollContent}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
              setHeroImageIndex(index);
            }}
          >
            {planMedia.map((item, index) => (
              <View key={index} style={[styles.heroSlide, { width: Dimensions.get('window').width }]}>
                <Image source={{ uri: item.url }} style={styles.headerImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerRightRow}>
            {user?.user_id && (plan.user_id === user.user_id || plan.business_id === user.user_id) && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push({ pathname: '/analytics/event/[planId]', params: { planId: plan.plan_id } } as any)}
              >
                <View style={styles.headerIconCircle}>
                  <Ionicons name="stats-chart" size={22} color="#000" />
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerIconButton} onPress={handleSharePlan}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="paper-plane-outline" size={22} color="#000" />
              </View>
            </TouchableOpacity>
          </View>
          {/* Organizer pill – top left over hero */}
          <View style={styles.organizerPill}>
            <Avatar uri={organizerAvatar} size={32} />
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName} numberOfLines={1}>{organizerName}</Text>
              <Text style={styles.organizerTime}>{formatOrganizerTime(plan.date)}</Text>
            </View>
          </View>
          {/* Carousel dots */}
          {mediaCount > 1 && (
            <View style={styles.carouselDots}>
              {planMedia.map((_, i) => (
                <View key={i} style={[styles.carouselDot, i === heroImageIndex && styles.carouselDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* White content card – overlaps bottom of hero */}
        <View style={styles.contentPanel}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.description}>{plan.description}</Text>

          {/* Date, Time, Location – clear key info blocks */}
          <View style={styles.keyInfoWrap}>
            {plan.date && (
              <View style={styles.keyInfoBlock}>
                <Ionicons name="calendar-outline" size={20} color="#1C1C1E" style={styles.keyInfoIcon} />
                <View style={styles.keyInfoTextWrap}>
                  <Text style={styles.keyInfoLabel}>Date</Text>
                  <Text style={styles.keyInfoTitle}>{formatDate(plan.date)}</Text>
                </View>
              </View>
            )}
            {plan.time && (
              <View style={styles.keyInfoBlock}>
                <Ionicons name="time-outline" size={20} color="#1C1C1E" style={styles.keyInfoIcon} />
                <View style={styles.keyInfoTextWrap}>
                  <Text style={styles.keyInfoLabel}>Time</Text>
                  <Text style={styles.keyInfoTitle}>{formatTimeOnly(plan.time)}</Text>
                </View>
              </View>
            )}
            {plan.location_text && (
              <View style={styles.keyInfoBlock}>
                <Ionicons name="location-outline" size={20} color="#1C1C1E" style={styles.keyInfoIcon} />
                <View style={styles.keyInfoTextWrap}>
                  <Text style={styles.keyInfoLabel}>Location</Text>
                  <Text style={styles.keyInfoTitle} numberOfLines={2}>{plan.location_text}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Detail pills – all categories: first field as heading, user value below; additional_info: user heading + description */}
          {plan.add_details && plan.add_details.length > 0 && (
            <View style={styles.detailPillsWrap}>
              {plan.add_details.map((detail, index) => {
                const isAdditionalInfo = detail.detail_type === 'additional_info';
                const heading = isAdditionalInfo
                  ? (detail.heading ?? detail.title ?? 'Additional Info')
                  : (detail.title ?? detail.detail_type);
                const value = detail.description ?? '';
                return (
                  <View key={index} style={styles.detailPill}>
                    <Text style={styles.detailPillLabel}>{heading}</Text>
                    {value ? (
                      <Text style={styles.detailPillValue} numberOfLines={isAdditionalInfo ? 4 : 2}>{value}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* See who's coming – only when allow_view_guest_list is true */}
          {plan.allow_view_guest_list !== false && (
            <TouchableOpacity
              style={styles.attendeesCard}
              onPress={() => setShowGuestListModal(true)}
              activeOpacity={0.9}
            >
              <View style={styles.attendeesTextBlock}>
                <Text style={styles.attendeesTitle}>See who's coming</Text>
                <Text style={styles.attendeesSubtitle}>Tap to view guest list</Text>
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

          {/* Select Tickets */}
          {plan.passes && plan.passes.length > 0 && (
            <View style={styles.ticketsSection}>
              <Text style={styles.ticketsTitle}>Select Tickets</Text>
              {plan.passes.map((pass, index) => {
                const isSelected = selectedPass === pass.pass_id;
                const passImage = pass.media && pass.media.length > 0 ? pass.media[0].url : null;
                const gradientColors: [string, string][] = [
                  ['#7C3AED', '#6366F1'],
                  ['#059669', '#10B981'],
                  ['#047857', '#059669'],
                ];
                const colors = gradientColors[index % gradientColors.length];
                return (
                  <TouchableOpacity
                    key={pass.pass_id}
                    style={styles.passCard}
                    onPress={() => setSelectedPass(pass.pass_id)}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.passGradient}
                    >
                      {passImage ? (
                        <Image source={{ uri: passImage }} style={styles.passImage} resizeMode="cover" />
                      ) : null}
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
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!isOwnEvent && (
            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <GuestListModal
        visible={showGuestListModal}
        onClose={() => setShowGuestListModal(false)}
        planId={planId || ''}
        onRegisterPress={() => {
          setShowGuestListModal(false);
          handleRegister();
        }}
      />
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
  headerImageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  heroScroll: {
    width: '100%',
    height: '100%',
  },
  heroScrollContent: {},
  heroSlide: {
    height: 280,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightRow: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  headerIconButton: {},
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerPill: {
    position: 'absolute',
    top: 56,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 8,
    zIndex: 2,
    maxWidth: '38%',
  },
  organizerInfo: {
    flex: 1,
    minWidth: 0,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  organizerTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  carouselDots: {
    position: 'absolute',
    bottom: 12,
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
  contentPanel: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    marginBottom: 20,
  },
  keyInfoWrap: {
    gap: 12,
    marginBottom: 20,
  },
  keyInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  keyInfoIcon: {
    marginRight: 12,
  },
  keyInfoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  keyInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  keyInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  keyInfoSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  detailPill: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: '47%',
    minHeight: 62,
  },
  detailPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailPillValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 18,
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
    color: '#1C1C1E',
    marginBottom: 14,
  },
  passCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  passGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  passImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
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
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
