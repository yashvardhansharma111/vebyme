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

  const g = data.gender_distribution_percent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.period}>Last {data.months} month{data.months > 1 ? 's' : ''}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overview</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Events</Text>
            <Text style={styles.value}>{data.events_count}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Registered</Text>
            <Text style={styles.value}>{data.registered_count}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Showup rate</Text>
            <Text style={styles.value}>{data.showup_rate_percent.toFixed(1)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>% First timers</Text>
            <Text style={styles.value}>{data.first_timers_percent.toFixed(1)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>% Returning</Text>
            <Text style={styles.value}>{data.returning_percent.toFixed(1)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Revenue</Text>
            <Text style={styles.value}>₹{data.revenue.toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gender distribution</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Male</Text>
            <Text style={styles.value}>{g.male.toFixed(1)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Female</Text>
            <Text style={styles.value}>{g.female.toFixed(1)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Others</Text>
            <Text style={styles.value}>{g.other.toFixed(1)}%</Text>
          </View>
        </View>

        {data.per_event && data.per_event.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Per event</Text>
            {data.per_event.map((ev) => (
              <TouchableOpacity
                key={ev.plan_id}
                style={styles.eventRow}
                onPress={() => router.push({ pathname: '/analytics/event/[planId]', params: { planId: ev.plan_id } } as any)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                  <Text style={styles.eventMeta}>
                    {ev.registered_count} registered · {ev.showup_rate_percent.toFixed(0)}% showup · ₹{ev.revenue.toFixed(0)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 8, fontSize: 14, color: '#8E8E93' },
  emptyText: { fontSize: 16, color: '#8E8E93' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  period: { fontSize: 14, color: '#8E8E93', marginBottom: 12 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 15, color: '#3A3A3C' },
  value: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  eventMeta: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
});
