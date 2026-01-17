import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | undefined): string => {
    if (!time) return '';
    return time;
  };

  const handleRegister = () => {
    if (!selectedPass && plan?.passes && plan.passes.length > 0) {
      Alert.alert('Select Ticket', 'Please select a ticket type first');
      return;
    }
    Alert.alert('Registration', 'Registration functionality will be implemented');
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

  const mainImage = plan.media && plan.media.length > 0 ? plan.media[0].url : 'https://picsum.photos/id/1011/200/300';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerImageContainer}>
          <Image source={{ uri: mainImage }} style={styles.headerImage} resizeMode="cover" />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Content Panel */}
        <View style={styles.contentPanel}>
          {/* Title */}
          <Text style={styles.title}>{plan.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{plan.description}</Text>

          {/* Key Details */}
          <View style={styles.detailsCard}>
            {plan.location_text && (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailTitle}>{plan.location_text}</Text>
                  {plan.location_coordinates && (
                    <Text style={styles.detailSubtitle}>3 Km away</Text>
                  )}
                </View>
              </View>
            )}

            {plan.date && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailTitle}>{formatDate(plan.date)}</Text>
                  {plan.time && (
                    <Text style={styles.detailSubtitle}>{formatTime(plan.time)} onwards</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Tags */}
          {plan.category_sub && plan.category_sub.length > 0 && (
            <View style={styles.tagsContainer}>
              {plan.category_sub.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Ionicons name="checkbox" size={12} color="#555" style={{ marginRight: 4 }} />
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Additional Details */}
          {plan.add_details && plan.add_details.length > 0 && (
            <View style={styles.additionalDetailsSection}>
              {plan.add_details.map((detail, index) => (
                <View key={index} style={styles.additionalDetailChip}>
                  <Text style={styles.additionalDetailTitle}>{detail.title}</Text>
                  {detail.description && (
                    <Text style={styles.additionalDetailDescription}>{detail.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* See who's coming */}
          <View style={styles.attendeesCard}>
            <View style={styles.attendeesHeader}>
              <Text style={styles.attendeesTitle}>See who's coming</Text>
              <Text style={styles.attendeesSubtitle}>Join event to view</Text>
            </View>
            <View style={styles.attendeesAvatars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[styles.avatarStack, { marginLeft: i === 1 ? 0 : -12 }]}>
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
                const gradientColors = [
                  ['#8B5CF6', '#6366F1'],
                  ['#10B981', '#059669'],
                  ['#F59E0B', '#D97706'],
                ];
                const colors = gradientColors[index % gradientColors.length];

                return (
                  <TouchableOpacity
                    key={pass.pass_id}
                    style={styles.passCard}
                    onPress={() => setSelectedPass(pass.pass_id)}
                  >
                    <LinearGradient
                      colors={colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.passGradient}
                    >
                      <View style={styles.passContent}>
                        <Text style={styles.passName}>{pass.name}</Text>
                        {pass.description && (
                          <Text style={styles.passDescription}>{pass.description}</Text>
                        )}
                        <Text style={styles.passPrice}>₹{pass.price}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
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
    height: 300,
    position: 'relative',
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
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentPanel: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  additionalDetailsSection: {
    marginBottom: 20,
  },
  additionalDetailChip: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  additionalDetailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  additionalDetailDescription: {
    fontSize: 12,
    color: '#666',
  },
  attendeesCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  attendeesHeader: {
    marginBottom: 12,
  },
  attendeesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  attendeesSubtitle: {
    fontSize: 14,
    color: '#999',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  passCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  passGradient: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passContent: {
    flex: 1,
  },
  passName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  passDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  passPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  selectedIndicator: {
    marginLeft: 12,
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
