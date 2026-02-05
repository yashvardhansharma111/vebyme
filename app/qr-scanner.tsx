import { apiService } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';

/** Scan API response – adjust to match your backend */
interface ScanResultData {
  plan?: {
    plan_id: string;
    title?: string;
    date?: string;
    time?: string;
    location_text?: string;
  };
  attendee?: {
    user_id: string;
    name?: string;
    profile_image?: string;
  };
  checked_in_count?: number;
  total?: number;
  already_checked_in?: boolean;
}

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAppSelector((state) => state.auth);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScannedHash, setLastScannedHash] = useState<string | null>(null);

  const handleClose = useCallback(() => router.back(), [router]);

  const handleAttendeeList = useCallback(() => {
    const planId = scanResult?.plan?.plan_id;
    if (planId) {
      router.push({ pathname: '/attendee-list', params: { planId } } as any);
    } else {
      router.push('/attendee-list' as any);
    }
  }, [router, scanResult?.plan?.plan_id]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!user?.user_id || scanning) return;
      const hash = data?.trim();
      if (!hash) return;

      setScanning(true);
      setLastScannedHash(hash);
      setScanResult(null);

      try {
        const response = await apiService.scanQRCode(hash, user.user_id);
        const result = response?.data ?? response;
        setScanResult({
          plan: result?.plan ?? result?.event,
          attendee: result?.attendee ?? result?.user,
          checked_in_count: result?.checked_in_count ?? result?.checked_in,
          total: result?.total ?? result?.attendees_count,
          already_checked_in: result?.already_checked_in,
        });
      } catch (error: any) {
        Alert.alert('Scan failed', error?.message ?? 'Invalid or already used ticket.');
        setScanResult(null);
      } finally {
        setScanning(false);
      }
    },
    [user?.user_id, scanning]
  );

  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate();
    const ord = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `${day}${ord} ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  const scanAgain = () => {
    setScanResult(null);
    setLastScannedHash(null);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={handleClose} style={styles.navBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scanner</Text>
          <View style={styles.navBtn} />
        </View>
        <View style={styles.center}>
          <Text style={styles.permissionText}>Camera access is required to scan tickets.</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const confirmed = !!scanResult && (scanResult.plan || scanResult.attendee);
  const plan = scanResult?.plan;
  const attendee = scanResult?.attendee;
  const checkedIn = scanResult?.checked_in_count ?? 0;
  const total = scanResult?.total ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={handleClose} style={styles.navBtn}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{confirmed ? 'Scanner - Confirmed' : 'Scanner'}</Text>
        <TouchableOpacity style={styles.attendeeListBtn} onPress={handleAttendeeList}>
          <Ionicons name="person" size={18} color="#FFF" />
          <Text style={styles.attendeeListText}>Attendee List</Text>
        </TouchableOpacity>
      </View>

      {confirmed && (
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>Checked In: {checkedIn}/{total}</Text>
        </View>
      )}

      <View style={styles.cameraWrap}>
        {!confirmed ? (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanning ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          >
            <View style={styles.scanFrame} />
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
              </View>
            )}
          </CameraView>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <View style={styles.scanFrame} />
          </View>
        )}
      </View>

      {confirmed && (
        <View style={styles.details}>
          {plan?.title && <Text style={styles.eventTitle}>{plan.title}</Text>}
          {(plan?.date || plan?.time) && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.detailText}>
                {formatDate(plan?.date)}
                {plan?.time ? ` | ${plan.time} onwards` : ''}
              </Text>
            </View>
          )}
          {plan?.location_text && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color="#666" />
              <Text style={styles.detailText}>{plan.location_text}</Text>
            </View>
          )}

          {attendee && (
            <View style={styles.attendeeRow}>
              <View style={styles.attendeePill}>
                <Avatar uri={attendee.profile_image} size={44} />
                <View style={styles.attendeeInfo}>
                  <Text style={styles.attendeeName}>{attendee.name || 'Attendee'}</Text>
                  <Text style={styles.approvedLabel}>Approved</Text>
                </View>
              </View>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={36} color="#FFF" />
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.scanAgainBtn} onPress={scanAgain}>
            <Text style={styles.scanAgainText}>Scan another</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  attendeeListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  attendeeListText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  statsRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    bottom: '15%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
  },
  details: {
    padding: 20,
    paddingBottom: 32,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#E5E5EA',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 16,
  },
  attendeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 12,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  approvedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 2,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  scanAgainBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A84FF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: '#E5E5EA',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
