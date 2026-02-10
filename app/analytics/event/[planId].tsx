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

interface TicketDistributionItem {
  pass_id: string;
  name: string;
  count: number;
  percent: number;
}

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
  ticket_distribution?: TicketDistributionItem[];
}

const TICKET_COLORS = ['#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B'];

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
      if ((e as any)?.statusCode !== 404) {
        Alert.alert('Error', e.message || 'Failed to load analytics');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [planId]);

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
          <Text style={styles.headerTitle} numberOfLines={1}>Event analytics</Text>
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
          <Text style={styles.headerTitle} numberOfLines={1}>Event analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>No data for this event</Text>
        </View>
      </SafeAreaView>
    );
  }

  const g = data.gender_distribution_percent;
  const ticketDist = data.ticket_distribution || [];
  const totalAttendees = data.registered_count;
  const showupRatePercent = Math.round(Number(data.showup_rate_percent) || 0);
  const revenueDisplay = Number(data.revenue) || 0;
  const revenueGrowthPercent = 23; // TODO: from API when available

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{data.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Revenue Generated */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Revenue Generated</Text>
          <View style={styles.revenueBox}>
            <Text style={styles.revenueAmount}>₹ {revenueDisplay.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.revenueGrowthRow}>
            <Text style={styles.revenueHint}>{revenueGrowthPercent}% from last month</Text>
            <Text style={styles.revenueArrow}>↑</Text>
          </View>
        </View>

        {/* Total Attendees: first box dark (Showup Rate), other two white */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Total Attendees: {totalAttendees}</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.statBoxDark]}>
              <Text style={styles.statValueDark}>{showupRatePercent} %</Text>
              <Text style={styles.statLabelDark}>Showup Rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(data.returning_percent || 0)} %</Text>
              <Text style={styles.statLabel}>Returning</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(data.first_timers_percent || 0)} %</Text>
              <Text style={styles.statLabel}>First Timers</Text>
            </View>
          </View>
        </View>

        {/* Ticket Distribution */}
        {ticketDist.length > 0 && (
          <View style={[styles.card, styles.cardGray]}>
            <Text style={styles.cardHeading}>Ticket Distribution</Text>
            <View style={styles.ticketDistributionRow}>
              {ticketDist.map((item, index) => {
                const totalPct = ticketDist.reduce((s, i) => s + i.percent, 0) || 1;
                const flex = item.percent / totalPct;
                return (
                  <View
                    key={item.pass_id}
                    style={[
                      styles.ticketBlock,
                      {
                        backgroundColor: TICKET_COLORS[index % TICKET_COLORS.length],
                        flex,
                      },
                    ]}
                  >
                    <Text style={styles.ticketBlockName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.ticketBlockPercent}>{item.percent.toFixed(0)} %</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Gender Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Gender Distribution</Text>
          <View style={styles.genderBarWrap}>
            {g.male > 0 && (
              <View style={[styles.genderSegment, { backgroundColor: '#22C55E', width: `${g.male}%` }]}>
                <Text style={styles.genderLabel}>Men</Text>
                <Text style={styles.genderPercent}>{g.male.toFixed(0)} %</Text>
              </View>
            )}
            {g.female > 0 && (
              <View style={[styles.genderSegment, { backgroundColor: '#14B8A6', width: `${g.female}%` }]}>
                <Text style={styles.genderLabel}>Women</Text>
                <Text style={styles.genderPercent}>{g.female.toFixed(0)} %</Text>
              </View>
            )}
            {g.other > 0 && (
              <View style={[styles.genderSegment, { backgroundColor: '#3B82F6', width: `${g.other}%` }]}>
                <Text style={styles.genderLabel}>Others</Text>
                <Text style={styles.genderPercent}>{g.other.toFixed(0)} %</Text>
              </View>
            )}
            {g.male === 0 && g.female === 0 && g.other === 0 && (
              <Text style={styles.noDataText}>No gender data</Text>
            )}
          </View>
        </View>

        {/* Audience Feedback */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Audience Feedback</Text>
          <Text style={styles.feedbackTagline}>Your runners are loving your experience</Text>
          <Text style={styles.feedbackVotes}>74 votes</Text>
          <View style={styles.feedbackRow}>
            <View style={[styles.feedbackPill, styles.feedbackPillDark]}>
              <Text style={styles.feedbackEmoji}>😊</Text>
              <Text style={styles.feedbackPillLabel}>Amazing</Text>
            </View>
            <View style={styles.feedbackAvatars}>
              <Text style={styles.feedbackPercent}>64%</Text>
            </View>
          </View>
          <View style={styles.feedbackRow}>
            <View style={[styles.feedbackPill, styles.feedbackPillLight]}>
              <Text style={styles.feedbackEmoji}>🙂</Text>
              <Text style={styles.feedbackPillLabel}>Good</Text>
            </View>
            <View style={styles.feedbackAvatars}>
              <Text style={styles.feedbackPercent}>29%</Text>
            </View>
          </View>
          <View style={styles.feedbackRow}>
            <View style={[styles.feedbackPill, styles.feedbackPillLight]}>
              <Text style={styles.feedbackEmoji}>😐</Text>
              <Text style={styles.feedbackPillLabel}>Average</Text>
            </View>
            <View style={styles.feedbackAvatars}>
              <Text style={styles.feedbackPercent}>7%</Text>
            </View>
          </View>
          <View style={styles.feedbackRow}>
            <View style={[styles.feedbackPill, styles.feedbackPillLight]}>
              <Text style={styles.feedbackEmoji}>😞</Text>
              <Text style={styles.feedbackPillLabel}>Bad</Text>
            </View>
            <View style={styles.feedbackAvatars}>
              <Text style={styles.feedbackPercent}>0%</Text>
            </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginLeft: 8 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 8, fontSize: 14, color: '#8E8E93' },
  emptyText: { fontSize: 16, color: '#8E8E93' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardGray: {
    backgroundColor: '#E5E5EA',
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 12,
  },
  revenueBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  revenueAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  revenueGrowthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revenueHint: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
  },
  revenueArrow: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statBoxDark: {
    backgroundColor: '#1C1C1E',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  statValueDark: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  statLabelDark: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '600',
  },
  ticketDistributionRow: {
    flexDirection: 'row',
    gap: 4,
    height: 72,
  },
  ticketBlock: {
    borderRadius: 12,
    padding: 10,
    justifyContent: 'flex-end',
  },
  ticketBlockName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  ticketBlockPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 4,
  },
  genderBarWrap: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
  },
  genderSegment: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    minWidth: 2,
  },
  genderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  genderPercent: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    color: '#8E8E93',
    alignSelf: 'center',
    paddingVertical: 12,
  },
  feedbackTagline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  feedbackVotes: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  feedbackPillDark: {
    backgroundColor: '#1C1C1E',
  },
  feedbackPillLight: {
    backgroundColor: '#E5E5EA',
  },
  feedbackEmoji: {
    fontSize: 18,
  },
  feedbackPillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  feedbackAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackPercent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
});
