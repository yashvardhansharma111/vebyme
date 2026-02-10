import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlanAnalyticsMini {
  registered_count: number;
  first_timers_count: number;
  returning_count: number;
  showup_rate_percent?: number;
  returning_percent?: number;
  first_timers_percent?: number;
}

function usePlanAnalytics(planId: string | undefined) {
  const [data, setData] = useState<PlanAnalyticsMini | null>(null);
  const [loading, setLoading] = useState(!!planId);
  useEffect(() => {
    if (!planId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiService
      .getEventAnalytics(planId)
      .then((res: any) => {
        const payload = res?.data ?? res;
        if (!cancelled && payload && typeof payload === 'object') {
          const total = Number(payload.registered_count ?? 0) || 0;
          const first = Number(payload.first_timers_count ?? 0) || 0;
          const ret = Number(payload.returning_count ?? 0) || 0;
          setData({
            registered_count: total,
            first_timers_count: first,
            returning_count: ret,
            showup_rate_percent: Number(payload.showup_rate_percent ?? 0) || 0,
            returning_percent: total ? Math.round((ret / total) * 100) : 0,
            first_timers_percent: total ? Math.round((first / total) * 100) : 0,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [planId]);
  return { analytics: data, loading };
}

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

function formatPlanDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${day}${suffix} ${month}, ${weekday}`;
}

function PlanCardWithAnalytics({
  plan,
  isCancelled,
  isCancelling,
  onCardPress,
  onDuplicate,
  onEdit,
  onCancel,
  onLongPress,
}: {
  plan: Plan;
  displayTags: string[];
  isCancelled: boolean;
  isCancelling: boolean;
  onCardPress: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onLongPress?: () => void;
}) {
  const { analytics, loading } = usePlanAnalytics(plan.plan_id);
  const hasImage = plan.media && plan.media.length > 0;
  const showupPct = analytics?.showup_rate_percent ?? 0;
  const returningPct = analytics?.returning_percent ?? 0;
  const firstTimersPct = analytics?.first_timers_percent ?? 0;

  return (
    <View style={styles.planCardWrapper}>
      <Text style={styles.planDateText}>{formatPlanDate(plan.date)}</Text>
      <TouchableOpacity
        style={styles.planCard}
        activeOpacity={0.95}
        onPress={onCardPress}
        onLongPress={onLongPress}
        delayLongPress={400}
      >
        {isCancelled && (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledText}>Cancelled</Text>
          </View>
        )}
        {plan.is_repost && (
          <View style={styles.repostBadge}>
            <Text style={styles.repostText}>You Reposted</Text>
          </View>
        )}
        <View style={styles.planCardImageWrap}>
          {hasImage ? (
            <Image source={{ uri: plan.media![0].url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.planCardImagePlaceholder]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
            style={styles.planCardOverlay}
          />
          <View style={styles.planCardTextBlock}>
            <Text style={styles.planCardTitle} numberOfLines={2}>{plan.title || 'Untitled Plan'}</Text>
            <Text style={styles.planCardDesc} numberOfLines={3}>
              {plan.description}
              <Text style={styles.vybemeText}> vybeme!</Text>
            </Text>
          </View>
        </View>

        {!isCancelled && (
          <View style={styles.analyticsBox}>
            <TouchableOpacity style={styles.totalAttendeesRow} onPress={onCardPress} activeOpacity={0.8}>
              <Text style={styles.totalAttendeesLabel}>
                Total Attendees: {loading ? '—' : String(analytics?.registered_count ?? 0)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <View style={styles.metricsRow}>
              <View style={[styles.metricBox, styles.metricBoxDark]}>
                <Text style={styles.metricBoxValueDark}>{loading ? '—' : `${showupPct} %`}</Text>
                <Text style={styles.metricBoxLabelDark}>Showup Rate</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricBoxValue}>{loading ? '—' : `${returningPct} %`}</Text>
                <Text style={styles.metricBoxLabel}>Returning</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricBoxValue}>{loading ? '—' : `${firstTimersPct} %`}</Text>
                <Text style={styles.metricBoxLabel}>First Timers</Text>
              </View>
            </View>
          </View>
        )}

        {!isCancelled && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.duplicateButton]} onPress={onDuplicate}>
              <Ionicons name="copy-outline" size={16} color="#1C1C1E" />
              <Text style={styles.actionButtonText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
              <Ionicons name="create-outline" size={16} color="#1C1C1E" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
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
    </View>
  );
}

export default function YourPlansScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);
  const [contextMenuPlan, setContextMenuPlan] = useState<Plan | null>(null);

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
        <Text style={styles.headerTitle}>My Plans</Text>
        {currentUser?.is_business ? (
          <TouchableOpacity
            style={styles.headerAnalyticsButton}
            onPress={() => router.push('/analytics/overall')}
          >
            <Ionicons name="stats-chart-outline" size={20} color="#2563EB" />
            <Text style={styles.headerAnalyticsText}>Analytics</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
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
            const displayTags = [
              ...(plan.temporal_tags || []),
              ...(plan.category_sub || []),
            ].slice(0, 3);
            const isCancelled = plan.post_status === 'deleted';
            const isCancelling = cancellingPlanId === plan.plan_id;
            return (
              <PlanCardWithAnalytics
                key={plan.plan_id || `plan-${index}`}
                plan={plan}
                displayTags={displayTags}
                isCancelled={isCancelled}
                isCancelling={isCancelling}
                onCardPress={() => {
                  router.push({ pathname: '/analytics/event/[planId]', params: { planId: plan.plan_id } } as any);
                }}
                onDuplicate={() => handleDuplicatePlan(plan)}
                onEdit={() => handleEditPlan(plan)}
                onCancel={() => handleCancelPlan(plan)}
                onLongPress={() => setContextMenuPlan(plan)}
              />
            );
          })
        )}
      </ScrollView>

      {/* Tap-and-hold context menu */}
      <Modal
        visible={!!contextMenuPlan}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenuPlan(null)}
      >
        <Pressable style={styles.contextMenuBackdrop} onPress={() => setContextMenuPlan(null)}>
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          <Pressable style={styles.contextMenuContainer} onPress={(e) => e.stopPropagation()}>
            {contextMenuPlan && (
              <>
                <View style={styles.contextMenuCard}>
                  <Text style={styles.contextMenuTitle} numberOfLines={2}>{contextMenuPlan.title || 'Untitled Plan'}</Text>
                  <Text style={styles.contextMenuDesc} numberOfLines={2}>
                    {contextMenuPlan.description || 'No description'}
                  </Text>
                </View>
                <View style={styles.contextMenuActions}>
                  <View style={styles.contextMenuRow}>
                    <TouchableOpacity
                      style={[styles.contextMenuBtn, styles.contextMenuBtnSmall]}
                      onPress={() => {
                        handleDuplicatePlan(contextMenuPlan);
                        setContextMenuPlan(null);
                      }}
                    >
                      <Text style={styles.contextMenuBtnText}>Duplicate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.contextMenuBtn, styles.contextMenuBtnSmall, styles.contextMenuBtnDanger]}
                      onPress={() => {
                        setContextMenuPlan(null);
                        handleCancelPlan(contextMenuPlan);
                      }}
                    >
                      <Text style={[styles.contextMenuBtnText, styles.contextMenuBtnTextDanger]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.contextMenuBtn, styles.contextMenuBtnPrimary]}
                    onPress={() => {
                      setContextMenuPlan(null);
                      router.push({
                        pathname: '/analytics/event/[planId]',
                        params: { planId: contextMenuPlan.plan_id },
                      } as any);
                    }}
                  >
                    <Text style={styles.contextMenuBtnTextPrimary}>View Analytics</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  headerAnalyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  headerAnalyticsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
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

  planCardWrapper: {
    marginBottom: 24,
  },
  planDateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  planCardImageWrap: {
    height: 200,
    position: 'relative',
  },
  planCardImagePlaceholder: {
    backgroundColor: '#94A3B8',
  },
  planCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 18,
  },
  planCardTextBlock: {
    paddingBottom: 8,
  },
  planCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  planCardDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 22,
  },
  analyticsBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    margin: 14,
    marginTop: 12,
    padding: 16,
  },
  totalAttendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalAttendeesLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricBoxDark: {
    backgroundColor: '#1C1C1E',
  },
  metricBoxValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  metricBoxValueDark: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  metricBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  metricBoxLabelDark: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  repostBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 2,
  },
  repostText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  vybemeText: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  cancelledBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 2,
  },
  cancelledText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  actionButtons: {
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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

  // Tap-and-hold context menu
  contextMenuBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contextMenuContainer: {
    width: '100%',
    maxWidth: 340,
  },
  contextMenuCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  contextMenuTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  contextMenuDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  contextMenuActions: {
    gap: 10,
  },
  contextMenuRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contextMenuBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contextMenuBtnSmall: {
    flex: 1,
  },
  contextMenuBtnDanger: {
    backgroundColor: 'rgba(255,245,245,0.98)',
  },
  contextMenuBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  contextMenuBtnTextDanger: {
    color: '#FF3B30',
  },
  contextMenuBtnPrimary: {
    backgroundColor: '#1C1C1E',
  },
  contextMenuBtnTextPrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});