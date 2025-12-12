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
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { sendOTP, verifyOTP, resendOTP, clearError } from '@/store/slices/authSlice';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
  
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  // Navigate to tabs when authenticated
  React.useEffect(() => {
    if (isAuthenticated && visible) {
      onLoginSuccess?.();
      handleClose();
    }
  }, [isAuthenticated, visible]);

  // Show error alerts
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleClose = () => {
    setPhone('');
    setOtp('');
    setOtpId(null);
    setStep('phone');
    onClose();
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const result = await dispatch(sendOTP(phone.trim()));
    if (sendOTP.fulfilled.match(result)) {
      if (result.payload) {
        setOtpId(result.payload.otp_id);
        setStep('otp');
        Alert.alert('Success', 'OTP sent successfully! Check console for OTP.');
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || !otpId) {
      Alert.alert('Error', 'Please enter the OTP code');
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
      // Navigation will happen via useEffect when isAuthenticated changes
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    const result = await dispatch(resendOTP(phone.trim()));
    if (resendOTP.fulfilled.match(result)) {
      if (result.payload) {
        setOtpId(result.payload.otp_id);
        Alert.alert('Success', 'OTP resent successfully!');
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
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <IconSymbol name="xmark" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {step === 'phone' ? 'Login to continue' : 'Enter OTP'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'phone' ? (
              <View style={styles.form}>
                <Text style={styles.subtitle}>
                  Enter your phone number to login or sign up
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.subtitle}>
                  Enter the OTP code sent to your phone
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#9CA3AF"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendOTP}
                  disabled={resendLoading || isLoading}
                >
                  <Text style={styles.resendText}>
                    {resendLoading ? 'Resending...' : "Didn't receive? Resend OTP"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setStep('phone');
                    setOtp('');
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.backText}>Change Phone Number</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  scrollContent: {
    padding: 24,
  },
  form: {
    width: '100%',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.lg,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  backText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

