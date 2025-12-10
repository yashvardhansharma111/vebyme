import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [resendLoading, setResendLoading] = useState(false);
  
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  // Navigate to tabs when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Vybeme</Text>
            <Text style={styles.subtitle}>
              {step === 'phone' ? 'Enter your phone number to get started' : 'Enter the OTP code sent to your phone'}
            </Text>
          </View>

          {step === 'phone' ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
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
              <View style={styles.inputContainer}>
                <Text style={styles.label}>OTP Code</Text>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
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
    shadowColor: Colors.light.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
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

