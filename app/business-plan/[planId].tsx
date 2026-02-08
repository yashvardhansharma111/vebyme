import { apiService } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '@/components/Avatar';

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
  }>;
  add_details?: Array<{
    detail_type: string;
    title: string;
    description?: string;
  }>;
  event_production?: string[];
  venue_required?: boolean;
  is_women_only?: boolean;
  user_id?: string;
  joins_count?: number;
}

export default function BusinessPlanDetailScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

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

  const { user } = useAppSelector((state) => state.auth);

  const handleRegister = async () => {
    if (!user?.user_id || !user?.access_token) {
      Alert.alert('Login Required', 'Please log in to register for this event');
      return;
    }

    if (!selectedPass && plan?.passes && plan.passes.length > 0) {
      Alert.alert('Select Ticket', 'Please select a ticket type first');
      return;
    }

    try {
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

  const imageList = (plan.media || [])
    .filter((m) => m.url && (m.type === 'image' || !m.type))
    .map((m) => m.url);
  const mediaCount = imageList.length;
  const hasImages = mediaCount > 0;
  const organizerName = organizer?.name ?? organizer?.username ?? 'Organizer';
  const organizerAvatar = organizer?.profile_image ?? organizer?.avatar;

  const onImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = Dimensions.get('window').width;
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    setImageIndex(Math.min(index, mediaCount - 1));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image – swipeable when multiple images */}
        <View style={styles.headerImageContainer}>
          {hasImages ? (
            <ScrollView
              horizontal
              pagingEnabled
              onMomentumScrollEnd={onImageScroll}
              showsHorizontalScrollIndicator={false}
              style={styles.headerImageScroll}
              contentContainerStyle={styles.headerImageScrollContent}
            >
              {imageList.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.headerImage} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.headerImage, styles.headerImagePlaceholder]}>
              <Ionicons name="image-outline" size={56} color="#8E8E93" />
            </View>
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </View>
          </TouchableOpacity>
          {user?.user_id && (plan.user_id === user.user_id || plan.business_id === user.user_id) && (
            <TouchableOpacity
              style={styles.analyticsButton}
              onPress={() => router.push({ pathname: '/analytics/event/[planId]', params: { planId: plan.plan_id } } as any)}
            >
              <View style={styles.analyticsButtonCircle}>
                <Ionicons name="stats-chart" size={22} color="#000" />
              </View>
            </TouchableOpacity>
          )}
          {/* Organizer pill – top left over hero */}
          <View style={styles.organizerPill}>
            <Avatar uri={organizerAvatar} size={32} />
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName} numberOfLines={1}>{organizerName}</Text>
              <Text style={styles.organizerTime}>{formatOrganizerTime(plan.date)}</Text>
            </View>
          </View>
          {/* Carousel dots – one per image, reflect current index */}
          {mediaCount > 1 && (
            <View style={styles.carouselDots}>
              {imageList.map((_, i) => (
                <View key={i} style={[styles.carouselDot, i === imageIndex && styles.carouselDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* White content card – overlaps bottom of hero */}
        <View style={styles.contentPanel}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.description}>{plan.description}</Text>

          {/* Location + Date side by side */}
          <View style={styles.keyInfoRow}>
            {plan.location_text && (
              <View style={styles.keyInfoBlock}>
                <Ionicons name="location" size={20} color="#666" />
                <Text style={styles.keyInfoTitle}>{plan.location_text}</Text>
                <Text style={styles.keyInfoSubtitle}>{plan.location_coordinates ? '3 Km away' : ' '}</Text>
              </View>
            )}
            {plan.date && (
              <View style={styles.keyInfoBlock}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.keyInfoTitle} numberOfLines={2}>{formatDayAndTime(plan.date, plan.time)}</Text>
              </View>
            )}
          </View>

          {/* Detail pills – Distance, Starting Point, Dress Code, F&B */}
          {plan.add_details && plan.add_details.length > 0 && (
            <View style={styles.detailPillsWrap}>
              {plan.add_details.slice(0, 4).map((detail, index) => (
                <View key={index} style={styles.detailPill}>
                  <Text style={styles.detailPillLabel}>{detail.title}</Text>
                  {detail.description ? (
                    <Text style={styles.detailPillValue} numberOfLines={1}>{detail.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* See who's coming – dark block, text left, avatars right */}
          <View style={styles.attendeesCard}>
            <View style={styles.attendeesTextBlock}>
              <Text style={styles.attendeesTitle}>See who's coming</Text>
              <Text style={styles.attendeesSubtitle}>Join event to view.</Text>
            </View>
            <View style={styles.attendeesAvatars}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.avatarStack, { marginLeft: i === 1 ? 0 : -10 }]}>
                  <Avatar uri={`https://i.pravatar.cc/150?u=${i}`} size={32} />
                </View>
              ))}
            </View>
          </View>

          {/* Select Tickets */}
          {plan.passes && plan.passes.length > 0 && (
            <View style={styles.ticketsSection}>
              <Text style={styles.ticketsTitle}>Select Tickets</Text>
              {plan.passes.map((pass, index) => {
                const isSelected = selectedPass === pass.pass_id;
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

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </View>
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
  headerImageScroll: {
    width: '100%',
    height: '100%',
  },
  headerImageScrollContent: {
    flexGrow: 1,
  },
  headerImage: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  headerImagePlaceholder: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  analyticsButtonCircle: {
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
    marginBottom: 18,
  },
  keyInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  keyInfoBlock: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 14,
  },
  keyInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 8,
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
  },
  detailPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailPillValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
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
