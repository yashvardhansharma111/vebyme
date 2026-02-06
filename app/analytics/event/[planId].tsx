import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

interface EventAnalyticsData {
  plan_id: string;
  title: string;
  registered_count: number;
  checked_in_count: number;
  showup_rate: number;
  showup_rate_percent: number;
  first_timers_count: number;
  returning_count: number;
  first_timers_percent: number;
  returning_percent: number;
  revenue: number;
  gender_distribution: { male: number; female: number; other: number };
  gender_distribution_percent: { male: number; female: number; other: number };
}

export default function EventAnalyticsScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [data, setData] = useState<EventAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const res = await apiService.getEventAnalytics(planId);
      if (res.success && res.data) setData(res.data as EventAnalyticsData);
      else setData(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load analytics');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [planId, router]);

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
          <Text style={styles.headerTitle}>Event analytics</Text>
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
          <Text style={styles.headerTitle}>Event analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>No data for this event</Text>
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
        <Text style={styles.headerTitle}>Event analytics</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eventName} numberOfLines={2}>{data.title}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Metrics</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Showup rate</Text>
            <Text style={styles.value}>{data.showup_rate_percent.toFixed(1)}%</Text>
          </View>
          <Text style={styles.hint}># checked in / # registered</Text>
          <View style={styles.row}>
            <Text style={styles.label}>% First timers</Text>
            <Text style={styles.value}>{data.first_timers_percent.toFixed(1)}%</Text>
          </View>
          <Text style={styles.hint}>First time on your events / total registered</Text>
          <View style={styles.row}>
            <Text style={styles.label}>% Returning</Text>
            <Text style={styles.value}>{data.returning_percent.toFixed(1)}%</Text>
          </View>
          <Text style={styles.hint}>Registered &gt;1 time on your events / total registered</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Revenue</Text>
            <Text style={styles.value}>₹{data.revenue.toFixed(0)}</Text>
          </View>
          <Text style={styles.hint}>Total from registrations</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Registered</Text>
            <Text style={styles.value}>{data.registered_count}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Checked in</Text>
            <Text style={styles.value}>{data.checked_in_count}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
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
  eventName: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 15, color: '#3A3A3C' },
  value: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  hint: { fontSize: 12, color: '#8E8E93', marginTop: -4, marginBottom: 4 },
});
