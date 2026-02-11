import { apiService } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CAMERA_SQUARE_SIZE = Math.min(Dimensions.get('window').width - 32, 320);

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
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAppSelector((state) => state.auth);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScannedHash, setLastScannedHash] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const handleClose = useCallback(() => router.back(), [router]);

  const loadPlans = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setPlansLoading(true);
      const res = await apiService.getUserPlans(user.user_id, 50, 0);
      const raw = res.data && Array.isArray(res.data) ? res.data : [];
      const businessPlans = raw.filter(
        (p: any) => (p?.type === 'business' || p?.plan_type === 'BusinessPlan') && p?.post_status !== 'deleted'
      );
      setPlans(businessPlans);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load plans');
    } finally {
      setPlansLoading(false);
    }
  }, [user?.user_id]);

  React.useEffect(() => {
    if (!user?.user_id) return;
    if (!selectedPlanId) {
      loadPlans();
    }
  }, [loadPlans, selectedPlanId, user?.user_id]);

  const handleAttendeeList = useCallback(() => {
    // Use selected plan so organiser always goes to attendee list for that plan (shows guest list), not plan picker again
    const planId = selectedPlanId || scanResult?.plan?.plan_id;
    if (planId) {
      router.push({ pathname: '/attendee-list', params: { planId } } as any);
    } else {
      router.push('/attendee-list' as any);
    }
  }, [router, selectedPlanId, scanResult?.plan?.plan_id]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!user?.user_id || scanning || !selectedPlanId) return;
      const hash = data?.trim();
      if (!hash) return;

      setScanning(true);
      setLastScannedHash(hash);
      setScanResult(null);

      try {
        const response = await apiService.scanQRCode(hash, user.user_id);
        const result = response?.data ?? response;
        const scannedPlanId = (result?.plan ?? result?.event)?.plan_id as string | undefined;
        if (scannedPlanId && scannedPlanId !== selectedPlanId) {
          setScanErrorMessage('Wrong event – select the correct plan.');
          setTimeout(() => setScanErrorMessage(null), 2000);
          return;
        }
        const attendee = result?.attendee ?? result?.user;
        const name = attendee?.name || 'User';
        const planData = result?.plan ?? result?.event;
        setCheckedInCount(result?.checked_in_count ?? result?.checked_in ?? null);
        setTotalCount(result?.total ?? result?.attendees_count ?? null);
        setSnackbarMessage(`${name} checked in`);
        setTimeout(() => setSnackbarMessage(null), 2500);
        setScanResult({ plan: planData, attendee: attendee ?? { user_id: '', name: 'User' } });
      } catch (error: any) {
        setScanErrorMessage(error?.message ?? 'Invalid or already used ticket.');
        setTimeout(() => setScanErrorMessage(null), 2000);
      } finally {
        setTimeout(() => setScanning(false), 1500);
      }
    },
    [user?.user_id, scanning, selectedPlanId]
  );

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

  if (!selectedPlanId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={handleClose} style={styles.navBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Plan</Text>
          <View style={styles.navBtn} />
        </View>
        <View style={styles.planPickerWrap}>
          {plansLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.loadingPlansText}>Loading your plans...</Text>
            </View>
          ) : plans.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.loadingPlansText}>No business plans found</Text>
            </View>
          ) : (
            <View style={styles.planList}>
              {plans.map((p: any) => (
                <TouchableOpacity
                  key={p.plan_id}
                  style={styles.planItem}
                  onPress={() => {
                    setSelectedPlanId(p.plan_id as string);
                  }}
                >
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{p.title || 'Untitled Plan'}</Text>
                    {!!p.location_text && <Text style={styles.planSubTitle}>{p.location_text}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const checkedIn = checkedInCount ?? 0;
  const total = totalCount ?? 0;
  const selectedPlan = plans.find((p: any) => p.plan_id === selectedPlanId);
  const formatPlanDate = (d: string | Date | undefined) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={handleClose} style={styles.navBtn}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Scanner</Text>
        <TouchableOpacity style={styles.attendeeListBtn} onPress={handleAttendeeList}>
          <Ionicons name="person" size={18} color="#FFF" />
          <Text style={styles.attendeeListText}>Attendee List</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {total > 0 && (
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>Checked In: {checkedIn}/{total}</Text>
          </View>
        )}

        {/* Camera – square at center */}
        <View style={[styles.cameraWrap, { width: CAMERA_SQUARE_SIZE, height: CAMERA_SQUARE_SIZE, alignSelf: 'center' }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
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
        </View>

        {/* Selected plan details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>Selected plan</Text>
          {selectedPlan ? (
            <>
              <Text style={styles.detailsCardName}>{selectedPlan.title || 'Untitled Plan'}</Text>
              <Text style={styles.detailsCardDate}>
                {formatPlanDate(selectedPlan.date ?? selectedPlan.event_date)} 
                {selectedPlan.time ? ` · ${selectedPlan.time}` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.detailsCardMuted}>No plan selected</Text>
          )}
        </View>

        {/* Last checked-in user */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>Last check-in</Text>
          {scanResult?.attendee ? (
            <>
              <Text style={styles.detailsCardName}>{scanResult.attendee.name || 'Guest'}</Text>
              {scanResult.plan?.title && (
                <Text style={styles.detailsCardDate}>{scanResult.plan.title}</Text>
              )}
            </>
          ) : (
            <Text style={styles.detailsCardMuted}>Scan a ticket to see check-in details</Text>
          )}
        </View>
      </ScrollView>

      {snackbarMessage && (
        <View style={styles.snackbar}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </View>
      )}
      {scanErrorMessage && (
        <View style={[styles.snackbarTop, { top: insets.top + 12 }]}>
          <Ionicons name="warning" size={18} color="#FFF" />
          <Text style={styles.snackbarTopText} numberOfLines={2}>{scanErrorMessage}</Text>
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
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
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scanFrame: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    right: '12%',
    bottom: '12%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
  },
  detailsCard: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  detailsCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailsCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  detailsCardDate: {
    fontSize: 14,
    color: '#E5E5EA',
    marginTop: 4,
  },
  detailsCardMuted: {
    fontSize: 15,
    color: '#8E8E93',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snackbar: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  snackbarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  snackbarTop: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(44, 44, 46, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    zIndex: 100,
  },
  snackbarTopText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
    flex: 1,
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
  planPickerWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingPlansText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E5EA',
    textAlign: 'center',
  },
  planList: {
    paddingTop: 12,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  planInfo: {
    flex: 1,
    marginRight: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  planSubTitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#E5E5EA',
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
