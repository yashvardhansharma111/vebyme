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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
// QR Code generation - install react-native-qrcode-svg or use alternative
// import QRCode from 'react-native-qrcode-svg';

interface TicketData {
  ticket_id: string;
  ticket_number: string;
  qr_code: string;
  qr_code_hash: string;
  status: string;
  price_paid: number;
  plan: {
    plan_id: string;
    title: string;
    description: string;
    location_text?: string;
    date?: string;
    time?: string;
    media?: Array<{ url: string; type: string }>;
  };
  user: {
    user_id: string;
    name: string;
    profile_image?: string;
  };
}

export default function TicketScreen() {
  const router = useRouter();
  const { ticketId, planId, ticketData } = useLocalSearchParams<{ 
    ticketId: string; 
    planId: string;
    ticketData?: string; // JSON stringified ticket data
  }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketId, planId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      
      // First, try to use ticket data passed from registration (if available)
      if (ticketData) {
        try {
          const parsedTicket = JSON.parse(decodeURIComponent(ticketData));
          if (parsedTicket) {
            setTicket(parsedTicket);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log('Failed to parse ticket data from params, fetching from API');
        }
      }
      
      // Otherwise, fetch from API
      if (ticketId) {
        const response = await apiService.getTicketById(ticketId);
        if (response.success && response.data?.ticket) {
          setTicket(response.data.ticket);
        } else if (response.data?.ticket) {
          // Some APIs might not have success field
          setTicket(response.data.ticket);
        } else {
          throw new Error(response.message || 'Ticket not found in response');
        }
      } else {
        throw new Error('Ticket ID is required');
      }
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      Alert.alert('Error', error.message || 'Failed to load ticket');
      // Don't go back - let user see error
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my ticket for ${ticket?.plan.title || 'this event'}`,
      });
    } catch (error: any) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToWallet = () => {
    Alert.alert('Add to Wallet', 'This feature will be implemented');
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'Jan 29, 2022';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string | undefined): string => {
    if (!time) return '10:00 PM';
    return time;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Loading ticket...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ticket not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const mainImage = ticket.plan.media && ticket.plan.media.length > 0 
    ? ticket.plan.media[0].url 
    : 'https://picsum.photos/id/1011/400/500';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#6366F1', '#10B981', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Confirmed</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Ticket Card */}
        <View style={styles.ticketCard}>
          {/* Action Buttons (Top Right) */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddToWallet}>
              <Ionicons name="add-outline" size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Event Title */}
          <Text style={styles.eventTitle}>{ticket.plan.title}</Text>

          {/* QR Code Section */}
          <View style={styles.qrCodeSection}>
            <View style={styles.qrCodeContainer}>
              {/* QR Code - Install react-native-qrcode-svg: npm install react-native-qrcode-svg react-native-svg */}
              {/* For now, showing QR code data */}
              <View style={styles.qrCodePlaceholder}>
                <Ionicons name="qr-code-outline" size={120} color="#1C1C1E" />
                <Text style={styles.qrCodeData} numberOfLines={3}>
                  {ticket.qr_code.substring(0, 50)}...
                </Text>
              </View>
              {/* Uncomment when QR library is installed:
              <QRCode
                value={ticket.qr_code}
                size={200}
                color="#1C1C1E"
                backgroundColor="#FFF"
              />
              */}
            </View>
            <Text style={styles.ticketType}>Early Bird Pass</Text>
            <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
          </View>

          {/* Event Details Section (Gradient Bottom) */}
          <LinearGradient
            colors={['#E0F2FE', '#D1FAE5', '#FEF3C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.detailsSection}
          >
            <View style={styles.detailsRow}>
              <Text style={styles.detailDate}>{formatDate(ticket.plan.date)}</Text>
              <Text style={styles.detailTime}>{formatTime(ticket.plan.time)}</Text>
            </View>
            {ticket.plan.location_text && (
              <Text style={styles.detailLocation}>{ticket.plan.location_text}</Text>
            )}

            {/* Info Pills */}
            <View style={styles.infoPillsContainer}>
              <View style={styles.infoPillRow}>
                <View style={styles.infoPill}>
                  <View style={styles.infoPillIcon}>
                    <Ionicons name="location" size={12} color="#FFF" />
                  </View>
                  <Text style={styles.infoPillText}>3km</Text>
                </View>
                {ticket.plan.location_text && (
                  <View style={styles.infoPill}>
                    <View style={styles.infoPillIcon}>
                      <Ionicons name="train" size={12} color="#FFF" />
                    </View>
                    <Text style={styles.infoPillText}>{ticket.plan.location_text}</Text>
                  </View>
                )}
              </View>
              <View style={styles.infoPillRow}>
                <View style={styles.infoPill}>
                  <View style={styles.infoPillIcon}>
                    <Ionicons name="add" size={12} color="#FFF" />
                  </View>
                  <Text style={styles.infoPillText}>Macha Rave</Text>
                </View>
                <View style={styles.infoPill}>
                  <View style={styles.infoPillIcon}>
                    <Ionicons name="add" size={12} color="#FFF" />
                  </View>
                  <Text style={styles.infoPillText}>Macha Rave</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
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
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 20,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 30,
    textTransform: 'uppercase',
  },
  qrCodeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrCodeContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeData: {
    marginTop: 12,
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 1,
  },
  detailsSection: {
    padding: 20,
    borderRadius: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  detailTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  detailLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  infoPillsContainer: {
    gap: 8,
  },
  infoPillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  infoPillIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  backButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
