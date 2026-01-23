import { apiService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '@/store/hooks';
import Avatar from '@/components/Avatar';

export default function QRScannerScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [checkedInUser, setCheckedInUser] = useState<any>(null);
  const [checkInStats, setCheckInStats] = useState({ checkedIn: 0, total: 0 });
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  useEffect(() => {
    // Load check-in stats - in production, this would load from current event context
    // For now, using placeholder
    loadStats();
  }, []);

  const loadStats = async () => {
    // This would be loaded from the current event context
    // For now, using placeholder
    setCheckInStats({ checkedIn: 24, total: 70 });
  };

  const handleBarCodeScanned = async ({ data, type }: { data: string; type: string }) => {
    if (scanned || !user?.user_id) return;
    
    setScanned(true);
    setScanning(false);

    try {
      // Parse QR code data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch {
        // If not JSON, treat as hash
        qrData = { qr_code_hash: data };
      }

      const qrHash = qrData.qr_code_hash || data;
      
      // Extract plan_id from QR data if available
      if (qrData.plan_id) {
        setCurrentPlanId(qrData.plan_id);
      }

      // Scan QR code
      const response = await apiService.scanQRCode(qrHash, user.user_id);
      
      if (response.success && response.data) {
        setCheckedInUser(response.data.user);
        
        // Extract plan_id from ticket if available
        if (response.data.ticket?.plan_id) {
          setCurrentPlanId(response.data.ticket.plan_id);
        }
        
        if (response.data.already_checked_in) {
          Alert.alert('Already Checked In', `${response.data.user?.name || 'User'} is already checked in`);
        } else {
          Alert.alert('Check-in Successful', `${response.data.user?.name || 'User'} has been checked in`);
          // Update stats
          setCheckInStats(prev => ({ ...prev, checkedIn: prev.checkedIn + 1 }));
          // Reload stats if we have planId
          if (currentPlanId || response.data.ticket?.plan_id) {
            // In production, reload actual stats from API
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Scan Failed', error.message || 'Invalid QR code');
    } finally {
      // Reset after 2 seconds
      setTimeout(() => {
        setScanned(false);
        setScanning(true);
        setCheckedInUser(null);
      }, 2000);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="camera-outline" size={64} color="#999" />
          <Text style={styles.errorText}>Camera permission is required</Text>
          <Text style={styles.errorSubtext}>Please enable camera access in settings</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4A3B69', '#6B5B8E', '#F2F2F7']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
        style={styles.topGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Scanner</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Check-in Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Checked In: {checkInStats.checkedIn}/{checkInStats.total}
        </Text>
      </View>

      {/* Scanner View */}
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        
        {/* Scanner Frame Overlay */}
        <View style={styles.scannerFrame}>
          <View style={styles.scannerCorner} />
          <View style={[styles.scannerCorner, styles.topRight]} />
          <View style={[styles.scannerCorner, styles.bottomLeft]} />
          <View style={[styles.scannerCorner, styles.bottomRight]} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Position the QR code within the frame
          </Text>
        </View>
      </View>

      {/* Event Info */}
      <View style={styles.eventInfoContainer}>
        <Text style={styles.eventTitle}>Another Run Rave</Text>
        <View style={styles.eventDetails}>
          <View style={styles.eventDetail}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.eventDetailText}>4th Jan, 2026 | 7:00 AM onwards</Text>
          </View>
          <View style={styles.eventDetail}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.eventDetailText}>Indiranagar, Bengaluru</Text>
          </View>
        </View>
      </View>

      {/* Checked In User Display */}
      {checkedInUser && (
        <View style={styles.checkedInContainer}>
          <View style={styles.checkedInPill}>
            <Avatar uri={checkedInUser.profile_image} size={40} />
            <View style={styles.checkedInInfo}>
              <Text style={styles.checkedInName}>{checkedInUser.name}</Text>
              <Text style={styles.checkedInStatus}>Approved</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.checkInButton}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
          </TouchableOpacity>
        </View>
      )}

      {/* View Attendee List Button */}
      <TouchableOpacity
        style={styles.attendeeListButton}
        onPress={() => {
          if (currentPlanId) {
            router.push({ pathname: '/attendee-list', params: { planId: currentPlanId } } as any);
          } else {
            // In production, show event selector or get from context
            router.push({ pathname: '/attendee-list' } as any);
          }
        }}
      >
        <Ionicons name="people-outline" size={20} color="#FFF" />
        <Text style={styles.attendeeListButtonText}>View Attendee List</Text>
      </TouchableOpacity>
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
    height: 200,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 12,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  scannerContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 400,
  },
  scannerFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -150 }],
    width: 300,
    height: 300,
    borderWidth: 2,
    borderColor: '#FFF',
    borderStyle: 'dashed',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10B981',
    top: -2,
    left: -2,
  },
  topRight: {
    top: -2,
    right: -2,
    left: 'auto',
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: -2,
    top: 'auto',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: '#FFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  eventInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
  },
  checkedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  checkedInPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 12,
    flex: 1,
  },
  checkedInInfo: {
    flex: 1,
  },
  checkedInName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  checkedInStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  checkInButton: {
    marginLeft: 12,
  },
  attendeeListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  attendeeListButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
