import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

type TicketItem = {
  ticket_id: string;
  ticket_number: string;
  status: string;
  price_paid: number;
  created_at: string;
  registration_status: string | null;
  plan: {
    plan_id: string;
    title: string;
    date?: string;
    time?: string;
    location_text?: string;
    media?: Array<{ url: string; type: string }>;
    ticket_image?: string;
  } | null;
};

export default function TicketsPassesScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async (isRefresh = false) => {
    if (!user?.user_id) {
      setTickets([]);
      setLoading(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTicketsByUser(user.user_id);
      const list = (res?.data?.tickets ?? res?.tickets ?? []) as TicketItem[];
      setTickets(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user?.user_id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const eventImage = (t: TicketItem) => {
    const plan = t.plan;
    if (!plan) return null;
    if (plan.ticket_image) return plan.ticket_image;
    if (plan.media && plan.media.length > 0) {
      const first = plan.media[0];
      return typeof first === 'object' && first?.url ? first.url : (plan.media[0] as string);
    }
    return null;
  };

  if (!user?.user_id) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.title}>Tickets and Passes</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.placeholder}>Please log in to view your tickets.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.title}>Tickets and Passes</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTickets()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="ticket-outline" size={64} color="#C7C7CC" />
          <Text style={styles.placeholder}>Your tickets and passes will appear here.</Text>
          <Text style={styles.subPlaceholder}>When you register for an event, your ticket will show up here.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {tickets.map((t) => (
            <TouchableOpacity
              key={t.ticket_id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/ticket/[ticketId]', params: { ticketId: t.ticket_id } } as any)}
              activeOpacity={0.8}
            >
              <View style={styles.cardImageWrap}>
                {eventImage(t) ? (
                  <Image source={{ uri: eventImage(t)! }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                    <Ionicons name="calendar-outline" size={32} color="#8E8E93" />
                  </View>
                )}
                <View style={styles.cardOverlay} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{t.plan?.title || 'Event'}</Text>
                {t.plan?.date ? (
                  <Text style={styles.cardDate}>{formatDate(t.plan.date)}{t.plan?.time ? ` · ${t.plan.time}` : ''}</Text>
                ) : null}
                <View style={styles.cardMeta}>
                  <Text style={styles.ticketNumber}>#{t.ticket_number}</Text>
                  <View style={[styles.statusBadge, t.status === 'active' ? styles.statusActive : styles.statusOther]}>
                    <Text style={styles.statusText}>{t.status}</Text>
                  </View>
                </View>
                <View style={styles.viewTicketRow}>
                  <Text style={styles.viewTicketText}>View ticket</Text>
                  <Ionicons name="chevron-forward" size={18} color="#1C1C1E" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  subPlaceholder: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageWrap: {
    height: 120,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusOther: {
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  viewTicketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  viewTicketText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 4,
  },
});
