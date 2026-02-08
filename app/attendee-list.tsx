import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '@/store/hooks';
import Avatar from '@/components/Avatar';

interface Attendee {
  registration_id: string;
  user_id: string;
  user: {
    user_id: string;
    name: string;
    profile_image?: string;
  } | null;
  ticket_id: string | null;
  ticket_number: string | null;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  price_paid: number;
  created_at: string;
}

export default function AttendeeListScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { user } = useAppSelector((state) => state.auth);
  
  // If no planId in params, try to get from navigation state or use a default
  // For now, we'll require planId - in production, this could come from context
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState({ total: 0, checked_in: 0, pending: 0 });

  useEffect(() => {
    // If planId provided, load attendees
    // Otherwise, show message to select event
    if (!user?.user_id) {
      setLoading(false);
      return;
    }

    const initialPlanId = planId && planId !== 'current' ? planId : null;
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
      loadAttendees(initialPlanId);
    } else {
      setLoading(false);
      loadPlans();
    }
  }, [planId, user]);

  const loadPlans = async () => {
    if (!user?.user_id) return;
    try {
      setPlansLoading(true);
      const res = await apiService.getUserPlans(user.user_id, 50, 0);
      const raw = res.data && Array.isArray(res.data) ? res.data : [];
      const businessPlans = raw.filter((p: any) => p?.type === 'business' || p?.plan_type === 'BusinessPlan');
      setPlans(businessPlans);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load plans');
    } finally {
      setPlansLoading(false);
    }
  };

  const loadAttendees = async (targetPlanId?: string) => {
    const effectivePlanId = targetPlanId ?? selectedPlanId;
    if (!effectivePlanId || !user?.user_id) return;
    
    try {
      setLoading(true);
      const response = await apiService.getAttendeeList(effectivePlanId, user.user_id);
      if (response.data) {
        setAttendees(response.data.attendees || []);
        setStatistics(response.data.statistics || { total: 0, checked_in: 0, pending: 0 });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load attendees');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (registrationId: string, currentStatus: boolean) => {
    if (!user?.user_id) return;

    try {
      const action = currentStatus ? 'checkout' : 'checkin';
      const response = await apiService.manualCheckIn(registrationId, user.user_id, action);
      
      if (response.success) {
        // Reload attendees
        await loadAttendees();
        Alert.alert(
          'Success',
          `User ${action === 'checkin' ? 'checked in' : 'checked out'} successfully`
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update check-in status');
    }
  };

  const filteredAttendees = attendees.filter(attendee => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      attendee.user?.name?.toLowerCase().includes(query) ||
      attendee.ticket_number?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Loading attendees...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedPlanId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendee List</Text>
          <View style={{ width: 24 }} />
        </View>
        {plansLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1C1C1E" />
            <Text style={styles.loadingText}>Loading your plans...</Text>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No business plans found</Text>
            <Text style={styles.emptySubtext}>Create a business plan to see registrations.</Text>
          </View>
        ) : (
          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
            {plans.map((p: any) => (
              <TouchableOpacity
                key={p.plan_id}
                style={styles.attendeeItem}
                onPress={async () => {
                  const id = p.plan_id as string;
                  setSelectedPlanId(id);
                  await loadAttendees(id);
                }}
              >
                <View style={styles.attendeeInfo}>
                  <Text style={styles.attendeeName}>{p.title || 'Untitled Plan'}</Text>
                  <Text style={styles.attendeeTicket}>{p.location_text || ''}</Text>
                </View>
                <View style={styles.attendeeActions}>
                  <Ionicons name="chevron-forward" size={18} color="#1C1C1E" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4A3B69', '#6B5B8E', '#F2F2F7']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.2 }}
        style={styles.topGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendee List</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Checked In: {statistics.checked_in}/{statistics.total}
        </Text>
      </View>

      {/* Attendee List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {filteredAttendees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No attendees found' : 'No attendees yet'}
            </Text>
          </View>
        ) : (
          filteredAttendees.map((attendee) => (
            <View key={attendee.registration_id} style={styles.attendeeItem}>
              <Avatar uri={attendee.user?.profile_image} size={48} />
              <View style={styles.attendeeInfo}>
                <Text style={styles.attendeeName}>{attendee.user?.name || 'Unknown User'}</Text>
                {attendee.ticket_number && (
                  <Text style={styles.attendeeTicket}>Ticket: {attendee.ticket_number}</Text>
                )}
              </View>
              <View style={styles.attendeeActions}>
                {attendee.checked_in ? (
                  <>
                    <View style={styles.checkedInBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    </View>
                    <TouchableOpacity
                      style={styles.uncheckButton}
                      onPress={() => handleCheckIn(attendee.registration_id, true)}
                    >
                      <Text style={styles.uncheckButtonText}>Uncheck</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.checkInButton}
                    onPress={() => handleCheckIn(attendee.registration_id, false)}
                  >
                    <Text style={styles.checkInButtonText}>Check In</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
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
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 150,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  attendeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  attendeeTicket: {
    fontSize: 12,
    color: '#666',
  },
  attendeeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkedInBadge: {
    marginRight: 8,
  },
  checkInButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  checkInButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uncheckButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  uncheckButtonText: {
    color: '#1C1C1E',
    fontSize: 14,
    fontWeight: '600',
  },
});
