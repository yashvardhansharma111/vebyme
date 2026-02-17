import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { sendOTP, verifyOTP, resendOTP, clearError } from '@/store/slices/authSlice';
import { useSnackbar } from '@/context/SnackbarContext';
import { Ionicons } from '@expo/vector-icons';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export default function LoginModal({ visible, onClose, onLoginSuccess }: LoginModalProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [resendLoading, setResendLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { showSnackbar } = useSnackbar();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  React.useEffect(() => {
    if (isAuthenticated && visible) {
      onLoginSuccess?.();
      handleClose();
    }
  }, [isAuthenticated, visible]);

  React.useEffect(() => {
    if (error) {
      showSnackbar(error, { position: 'top', duration: 3000 });
      dispatch(clearError());
    }
  }, [error, dispatch, showSnackbar]);

  const handleClose = () => {
    setPhone('');
    setOtp('');
    setOtpId(null);
    setStep('phone');
    onClose();
  };

  const phoneDigits = (phone || '').replace(/\D/g, '');
  const canSendOtp = phoneDigits.length >= 10;
  const canVerifyOtp = (otp || '').trim().length >= 4 && !!otpId;

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      showSnackbar('Please enter your phone number', { position: 'top', duration: 3000 });
      return;
    }
    if (phoneDigits.length < 10) {
      showSnackbar('Please enter a valid 10-digit phone number', { position: 'top', duration: 3000 });
      return;
    }

    const result = await dispatch(sendOTP(phone.trim()));
    if (sendOTP.fulfilled.match(result)) {
      if (result.payload) {
        setOtpId(result.payload.otp_id);
        setStep('otp');
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || !otpId) {
      showSnackbar('Please enter the OTP code', { position: 'top', duration: 3000 });
      return;
    }

    const result = await dispatch(
      verifyOTP({
        phone_number: phone.trim(),
        otp_code: otp.trim(),
        otp_id: otpId,
      })
    );

    if (verifyOTP.fulfilled.match(result)) {
      // Navigation via useEffect when isAuthenticated changes
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    const result = await dispatch(resendOTP(phone.trim()));
    if (resendOTP.fulfilled.match(result)) {
      if (result.payload) {
        setOtpId(result.payload.otp_id);
      }
    }
    setResendLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
          {/* Header - matches profile/edit and other app pages */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {step === 'phone' ? 'Login' : 'Enter OTP'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 'phone' ? (
              <View style={styles.form}>
                <Text style={styles.subtitle}>
                  Enter your phone number to login or sign up
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.primaryButton, (isLoading || !canSendOtp) && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isLoading || !canSendOtp}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.subtitle}>
                  Enter the code sent to your phone
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="4-digit OTP"
                  placeholderTextColor="#9CA3AF"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.primaryButton, (isLoading || !canVerifyOtp) && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading || !canVerifyOtp}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendOTP}
                  disabled={resendLoading || isLoading}
                >
                  <Text style={styles.resendText}>
                    {resendLoading ? 'Resending…' : "Didn't get it? Resend OTP"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => { setStep('phone'); setOtp(''); }}
                  disabled={isLoading}
                >
                  <Text style={styles.backText}>Change number</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F2F2F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#F2F2F2',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  form: {
    width: '100%',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 17,
    color: '#1C1C1E',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  backText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
