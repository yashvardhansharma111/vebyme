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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    runnerPreference: false,
    audienceFeedback: false,
    testEvents: true,
  });

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

  const toggleSection = (key: string) => {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  };

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
  const totalGender = (g.male || 0) + (g.female || 0) + (g.other || 0);
  const segments = totalGender > 0
    ? [
        { label: 'Male', pct: g.male || 0, color: '#22C55E' },
        { label: 'Female', pct: g.female || 0, color: '#14B8A6' },
        { label: 'Others', pct: g.other || 0, color: '#3B82F6' },
      ]
    : [
        { label: '5k', pct: 47, color: '#22C55E' },
        { label: '10k', pct: 31, color: '#14B8A6' },
        { label: 'Others', pct: 22, color: '#3B82F6' },
      ];

  const eventTypeRows = data.per_event?.length
    ? data.per_event.slice(0, 6).map((ev, i) => ({
        label: ev.title || `Event ${i + 1}`,
        pct: Math.round(ev.showup_rate_percent),
        icon: (['walk', 'barbell-outline', 'people-outline'] as const)[i % 3],
      }))
    : [
        { label: 'Run Only Events', pct: 81, icon: 'walk' as const },
        { label: 'Fitness/Training Events', pct: 92, icon: 'barbell-outline' as const },
        { label: 'Social/Community Events', pct: 93, icon: 'people-outline' as const },
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

        {/* Event distribution (horizontal bar) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event distribution</Text>
          <View style={styles.barContainer}>
            {segments.map((seg, i) => (
              <View
                key={seg.label}
                style={[
                  styles.barSegment,
                  { flex: seg.pct || 0.01, backgroundColor: seg.color },
                  i === 0 && styles.barSegmentFirst,
                  i === segments.length - 1 && styles.barSegmentLast,
                ]}
              >
                <Text style={styles.barSegmentPct}>{seg.pct}%</Text>
              </View>
            ))}
          </View>
          <View style={styles.barLabels}>
            {segments.map((seg) => (
              <Text key={seg.label} style={styles.barLabelText}>{seg.label}</Text>
            ))}
          </View>
        </View>

        {/* Event type performance list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event type performance</Text>
          <View style={styles.eventTypeCard}>
            {eventTypeRows.map((row, i) => (
              <View key={i} style={styles.eventTypeRow}>
                <View style={styles.eventTypeIconWrap}>
                  <Ionicons name={row.icon} size={20} color="#1C1C1E" />
                </View>
                <Text style={styles.eventTypeLabel} numberOfLines={1}>{row.label}</Text>
                <Text style={styles.eventTypePct}>{row.pct}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Collapsible: Runner Preference */}
        <View style={styles.collapsibleCard}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => toggleSection('runnerPreference')}
            activeOpacity={0.7}
          >
            <Text style={styles.collapsibleTitle}>Runner Preference</Text>
            <Ionicons
              name={collapsed.runnerPreference ? 'chevron-down' : 'chevron-up'}
              size={22}
              color="#8E8E93"
            />
          </TouchableOpacity>
          {!collapsed.runnerPreference && (
            <View style={styles.collapsibleBody}>
              <Text style={styles.placeholderItem}>#reposts</Text>
              <Text style={styles.placeholderItem}>#reposts</Text>
            </View>
          )}
        </View>

        {/* Collapsible: Audience Feedback */}
        <View style={styles.collapsibleCard}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => toggleSection('audienceFeedback')}
            activeOpacity={0.7}
          >
            <Text style={styles.collapsibleTitle}>Audience Feedback</Text>
            <Ionicons
              name={collapsed.audienceFeedback ? 'chevron-down' : 'chevron-up'}
              size={22}
              color="#8E8E93"
            />
          </TouchableOpacity>
          {!collapsed.audienceFeedback && (
            <View style={styles.collapsibleBody}>
              <Text style={styles.placeholderItem}>#reposts</Text>
              <Text style={styles.placeholderItem}>#reposts</Text>
            </View>
          )}
        </View>

        {/* Collapsible: Test events / Per event */}
        <View style={styles.collapsibleCard}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => toggleSection('testEvents')}
            activeOpacity={0.7}
          >
            <Text style={styles.collapsibleTitle}>Per event</Text>
            <Ionicons
              name={collapsed.testEvents ? 'chevron-down' : 'chevron-up'}
              size={22}
              color="#8E8E93"
            />
          </TouchableOpacity>
          {!collapsed.testEvents && data.per_event && data.per_event.length > 0 && (
            <View style={styles.collapsibleBody}>
              {data.per_event.map((ev) => (
                <TouchableOpacity
                  key={ev.plan_id}
                  style={styles.perEventRow}
                  onPress={() =>
                    router.push({ pathname: '/analytics/event/[planId]', params: { planId: ev.plan_id } } as any)
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.perEventTitle} numberOfLines={1}>{ev.title}</Text>
                  <Text style={styles.perEventMeta}>
                    {ev.registered_count} reg · {Math.round(ev.showup_rate_percent)}% showup
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!collapsed.testEvents && (!data.per_event || data.per_event.length === 0) && (
            <View style={styles.collapsibleBody}>
              <Text style={styles.placeholderItem}>#reposts</Text>
              <Text style={styles.placeholderItem}>#reposts</Text>
              <Text style={styles.placeholderItem}>#reposts</Text>
            </View>
          )}
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
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
  barSegmentPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  barLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
  eventTypeLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  eventTypePct: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
    marginLeft: 8,
  },

  collapsibleCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  collapsibleBody: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  placeholderItem: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  perEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  perEventTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  perEventMeta: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 8,
  },
});
