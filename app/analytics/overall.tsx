import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OverallData {
  since: string;
  months: number;
  events_count: number;
  registered_count: number;
  checked_in_count: number;
  showup_rate_percent: number;
  first_timers_percent: number;
  returning_percent: number;
  revenue: number;
  gender_distribution: { male: number; female: number; other: number };
  gender_distribution_percent: { male: number; female: number; other: number };
  per_event: Array<{
    plan_id: string;
    title: string;
    created_at: string;
    registered_count: number;
    checked_in_count: number;
    showup_rate_percent: number;
    revenue: number;
  }>;
}

export default function OverallAnalyticsScreen() {
  const router = useRouter();
  const [data, setData] = useState<OverallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getBusinessOverallAnalytics(months);
      if (res.success && res.data) setData(res.data as OverallData);
      else setData(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load analytics');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [months, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>No analytics data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showupRate = Math.round(data.showup_rate_percent);
  const repeatRunners = Math.round(data.returning_percent);
  const firstTimers = Math.round(data.first_timers_percent);
  const g = data.gender_distribution_percent;
  const counts = data.gender_distribution || { male: 0, female: 0, other: 0 };
  const allSegments = [
    { label: 'Male', pct: g.male || 0, count: counts.male || 0, color: '#22C55E' },
    { label: 'Female', pct: g.female || 0, count: counts.female || 0, color: '#14B8A6' },
    { label: 'Others', pct: g.other || 0, count: counts.other || 0, color: '#3B82F6' },
  ];
  const segments = allSegments.filter((s) => s.pct > 0 || s.count > 0);
  const totalGender = segments.reduce((sum, s) => sum + (s.pct || 0), 0) || 1;

  const eventTypeRows = data.per_event?.length
    ? data.per_event.slice(0, 6).map((ev, i) => ({
        label: ev.title || `Event ${i + 1}`,
        reg: ev.registered_count ?? 0,
        showupPct: Math.round(ev.showup_rate_percent ?? 0),
        icon: (['walk', 'barbell-outline', 'people-outline'] as const)[i % 3],
        planId: ev.plan_id,
      }))
    : [
        { label: 'Run Only Events', reg: 0, showupPct: 81, icon: 'walk' as const, planId: '' },
        { label: 'Fitness/Training Events', reg: 0, showupPct: 92, icon: 'barbell-outline' as const, planId: '' },
        { label: 'Social/Community Events', reg: 0, showupPct: 93, icon: 'people-outline' as const, planId: '' },
      ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top 3 metric cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardDark]}>
            <Text style={styles.metricValueLight}>{showupRate}%</Text>
            <Text style={styles.metricLabelLight}>Showup Rate</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{repeatRunners}%</Text>
            <Text style={styles.metricLabel}>Repeat Runners</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{firstTimers}%</Text>
            <Text style={styles.metricLabel}>First Timers</Text>
          </View>
        </View>

        {/* Gender distribution (horizontal bar) – label and % inside bar; no Female if 0 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Gender distribution</Text>
            {data.per_event?.length > 0 && (
              <TouchableOpacity
                style={styles.perEventArrowWrap}
                onPress={() =>
                  router.push({
                    pathname: '/analytics/event/[planId]',
                    params: { planId: data.per_event![0].plan_id },
                  } as any)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.perEventArrowText}>Per event</Text>
                <Ionicons name="chevron-forward" size={18} color="#1C1C1E" />
              </TouchableOpacity>
            )}
          </View>
          {segments.length > 0 ? (
            <View style={styles.barContainer}>
              {segments.map((seg, i) => (
                <View
                  key={seg.label}
                  style={[
                    styles.barSegment,
                    { flex: (seg.pct || 0.01) / totalGender, backgroundColor: seg.color },
                    i === 0 && styles.barSegmentFirst,
                    i === segments.length - 1 && styles.barSegmentLast,
                  ]}
                >
                  <Text style={styles.barSegmentLabel} numberOfLines={1}>{seg.label}</Text>
                  <Text style={styles.barSegmentPct}>{Math.round(seg.pct)}%</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noGenderData}>No gender data</Text>
          )}
        </View>

        {/* Event type performance list – X reg Y% showup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event type performance</Text>
          <View style={styles.eventTypeCard}>
            {eventTypeRows.map((row, i) => (
              <TouchableOpacity
                key={i}
                style={styles.eventTypeRow}
                onPress={
                  row.planId
                    ? () =>
                        router.push({
                          pathname: '/analytics/event/[planId]',
                          params: { planId: row.planId },
                        } as any)
                    : undefined
                }
                activeOpacity={row.planId ? 0.7 : 1}
                disabled={!row.planId}
              >
                <View style={styles.eventTypeIconWrap}>
                  <Ionicons name={row.icon} size={20} color="#1C1C1E" />
                </View>

                {/* Middle Content */}
                <View style={styles.eventTypeContent}>
                  <Text style={styles.eventTypeLabel} numberOfLines={1}>
                    {row.label}
                  </Text>

                  <View style={styles.eventTypeStats}>
                    <Text style={styles.eventTypeStatText}>
                      Registered: <Text style={styles.eventTypeStatValue}>{row.reg}</Text>
                    </Text>

                    <Text style={styles.eventTypeStatText}>
                      Show-up: <Text style={styles.eventTypeStatValue}>{row.showupPct}%</Text>
                    </Text>
                  </View>
                </View>

                {/* Arrow */}
                {row.planId && (
                  <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                )}
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 8, fontSize: 14, color: '#8E8E93' },
  emptyText: { fontSize: 16, color: '#8E8E93' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  metricCardDark: {
    backgroundColor: '#1C1C1E',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  metricValueLight: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metricLabelLight: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },

  section: { marginBottom: 20 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  perEventArrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  perEventArrowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  noGenderData: {
    fontSize: 14,
    color: '#8E8E93',
    paddingVertical: 12,
  },
  barContainer: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  barSegment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  barSegmentFirst: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  barSegmentLast: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  barSegmentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  barSegmentPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },

  eventTypeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  eventTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  eventTypeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventTypeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  eventTypeStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  eventTypeStatText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  eventTypeStatValue: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
});
