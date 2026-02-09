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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme'; // Assuming Colors has basic definitions
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Plan {
  plan_id: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type: string }>;
  category_sub?: string[];
  category_main?: string;
  temporal_tags?: string[]; // Added to support tags like 'Weekend'
  location_text?: string;
  created_at: string;
  is_repost?: boolean;
  type?: 'regular' | 'business';
  post_status?: string;
  external_link?: string;
  is_women_only?: boolean;
  post_type?: 'individual' | 'group';
  num_people?: number;
  date?: string;
  time?: string;
  // Business plan specific fields
  passes?: Array<{ pass_id: string; name: string; price: number; description: string; capacity?: number }>;
  is_paid_plan?: boolean;
  add_details?: Array<{ detail_type: string; title: string; description: string }>;
  venue_required?: boolean;
  allow_view_guest_list?: boolean;
  reshare_to_announcement_group?: boolean;
}

const TAG_ICONS: { [key: string]: string } = {
  Weekend: 'calendar',
  Evening: 'cloud',
  Hitchhiking: 'thumbs-up',
  Morning: 'sunny',
  Night: 'moon',
  Today: 'today',
};

export default function YourPlansScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    if (!user?.user_id) return;
    
    try {
      setLoading(true);
      const response = await apiService.getUserPlans(user.user_id);
      if (response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicatePlan = async (plan: Plan) => {
    try {
      // Store plan data in AsyncStorage for the creation page to read
      const planData = {
        ...plan,
        mode: 'duplicate',
      };
      await AsyncStorage.setItem('planForCreation', JSON.stringify(planData));
      
      // Navigate to appropriate creation page
      if (plan.type === 'business') {
        router.push('/(tabs)/createBusinessPost');
      } else {
        router.push('/(tabs)/createPost');
      }
    } catch (error) {
      console.error('Error duplicating plan:', error);
      Alert.alert('Error', 'Failed to duplicate plan');
    }
  };

  const handleCancelPlan = async (plan: Plan) => {
    if (!user?.access_token) {
      Alert.alert('Error', 'Please log in to cancel plans');
      return;
    }

    Alert.alert(
      'Cancel Plan',
      'Are you sure you want to cancel this plan? It will no longer be visible to other users.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingPlanId(plan.plan_id);
              const planType = plan.type || 'regular';
              await apiService.cancelPlan(user.access_token, plan.plan_id, planType as 'regular' | 'business');
              
              // Update local state
              setPlans(plans.map(p => 
                p.plan_id === plan.plan_id 
                  ? { ...p, post_status: 'deleted' }
                  : p
              ));
              
              Alert.alert('Success', 'Plan cancelled successfully');
            } catch (error: any) {
              console.error('Error cancelling plan:', error);
              Alert.alert('Error', error.message || 'Failed to cancel plan');
            } finally {
              setCancellingPlanId(null);
            }
          },
        },
      ]
    );
  };

  const handleEditPlan = async (plan: Plan) => {
    try {
      // Store plan data in AsyncStorage for the creation page to read
      const planData = {
        ...plan,
        mode: 'edit',
      };
      await AsyncStorage.setItem('planForCreation', JSON.stringify(planData));
      
      // Navigate to appropriate creation page
      if (plan.type === 'business') {
        router.push('/(tabs)/createBusinessPost');
      } else {
        router.push('/(tabs)/createPost');
      }
    } catch (error) {
      console.error('Error editing plan:', error);
      Alert.alert('Error', 'Failed to edit plan');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1C1C1E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Plans</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="documents-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>No plans yet</Text>
            <Text style={styles.emptySubtext}>Create your first plan to get started!</Text>
          </View>
        ) : (
          plans.map((plan, index) => {
            // Combine tags for display (Sub-categories + Temporal tags)
            const displayTags = [
              ...(plan.temporal_tags || []),
              ...(plan.category_sub || [])
            ].slice(0, 3); // Limit to 3 tags

            const isCancelled = plan.post_status === 'deleted';
            const isCancelling = cancellingPlanId === plan.plan_id;

            return (
              <TouchableOpacity
                key={plan.plan_id || `plan-${index}`}
                style={styles.planCard}
                activeOpacity={0.9}
                onPress={() => {
                  router.push({ pathname: '/analytics/event/[planId]', params: { planId: plan.plan_id } } as any);
                }}
              >
                
                {/* Repost Badge */}
                {plan.is_repost && (
                  <View style={styles.repostBadge}>
                    <Text style={styles.repostText}>You Reposted</Text>
                  </View>
                )}

                {/* Cancelled Badge */}
                {isCancelled && (
                  <View style={styles.cancelledBadge}>
                    <Text style={styles.cancelledText}>Cancelled</Text>
                  </View>
                )}

                <View style={styles.cardContentRow}>
                  {/* Left Column: Text & Tags */}
                  <View style={styles.textColumn}>
                    <Text style={styles.planTitle}>{plan.title || 'Untitled Plan'}</Text>
                    <Text style={styles.planDescription} numberOfLines={3}>
                      {plan.description}
                      <Text style={styles.vybemeText}> vybeme!</Text>
                    </Text>

                    {/* Tags Row */}
                    {displayTags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {displayTags.map((tag, tagIndex) => (
                          <View key={`${plan.plan_id}-tag-${tag}-${tagIndex}`} style={styles.tag}>
                            <Ionicons 
                              name={(TAG_ICONS[tag] || 'ellipse') as any} 
                              size={12} 
                              color="#555" 
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Right Column: Image */}
                  {plan.media && plan.media.length > 0 && (
                    <Image
                      source={{ uri: plan.media[0].url }}
                      style={styles.planImage}
                      resizeMode="cover"
                    />
                  )}
                </View>

                {/* Action Buttons */}
                {!isCancelled && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.duplicateButton]}
                      onPress={() => handleDuplicatePlan(plan)}
                    >
                      <Ionicons name="copy-outline" size={16} color="#1C1C1E" />
                      <Text style={styles.actionButtonText}>Duplicate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditPlan(plan)}
                    >
                      <Ionicons name="create-outline" size={16} color="#1C1C1E" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleCancelPlan(plan)}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
                          <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Plan Card
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  repostBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#555555', // Dark gray for repost badge
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  repostText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  cardContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textColumn: {
    flex: 1,
    marginRight: 12,
  },
  
  // Text Styles
  planTitle: {
    fontSize: 18,
    fontWeight: '800', // Bold title
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  planDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  vybemeText: {
    fontWeight: '700',
    color: '#1C1C1E',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },

  // Image
  planImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },

  // Cancelled Badge
  cancelledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  cancelledText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  duplicateButton: {
    backgroundColor: '#F2F2F7',
  },
  editButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButton: {
    backgroundColor: '#FFF5F5',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  cancelButtonText: {
    color: '#FF3B30',
  },
});