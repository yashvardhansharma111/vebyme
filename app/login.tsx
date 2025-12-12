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
import { store } from '@/store/store';
import { sendOTP, verifyOTP, resendOTP, clearError } from '@/store/slices/authSlice';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [resendLoading, setResendLoading] = useState(false);
  
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, isNewUser } = useAppSelector((state) => state.auth);

  // Navigate based on authentication and new user status
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔍 Login useEffect - isAuthenticated:', isAuthenticated, 'isNewUser:', isNewUser, 'type:', typeof isNewUser);
      // Use a small delay to ensure state is fully propagated
      const timer = setTimeout(() => {
        const currentState = store.getState().auth;
        console.log('🔍 Login useEffect (after delay) - currentState.isNewUser:', currentState.isNewUser, 'currentState.isAuthenticated:', currentState.isAuthenticated);
        if (currentState.isNewUser === true) {
          console.log('✅ Navigating to signup profile');
          router.replace('/signup/profile');
        } else {
          console.log('✅ Navigating to homepage');
          router.replace('/(tabs)');
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isNewUser, router]);

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
      // Navigate immediately based on the payload
      const payloadIsNewUser = result.payload.isNewUser === true;
      console.log('🔍 handleVerifyOTP - result.payload:', result.payload);
      console.log('🔍 handleVerifyOTP - payloadIsNewUser:', payloadIsNewUser);
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        if (payloadIsNewUser) {
          console.log('✅ Immediately navigating to signup profile');
          router.replace('/signup/profile');
        } else {
          console.log('✅ Immediately navigating to homepage');
          router.replace('/(tabs)');
        }
      }, 200);
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
            <Text style={styles.title}>
              {step === 'phone' ? 'Found the Vybe?' : 'One Time Peek'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? "Don't worry, we'll help you signup!"
                : `We sent a 6-digit OTP to ${phone}`}
            </Text>
          </View>

          {step === 'phone' ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <Text style={styles.disclaimer}>Message & data rates may apply.</Text>
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

              <Text style={styles.consentText}>
                By tapping Send OTP, you consent to receive automated messages from Vybeme at the
                number provided above. Message and data rates may apply.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <TextInput
                    key={index}
                    style={styles.otpInput}
                    value={otp[index] || ''}
                    onChangeText={(text) => {
                      if (text.length <= 1) {
                        const newOtp = otp.split('');
                        newOtp[index] = text;
                        setOtp(newOtp.join(''));
                        // Auto-focus next input
                        if (text && index < 5) {
                          // Focus next input (handled by refs would be better, but this works)
                        }
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    autoFocus={index === 0 && otp.length === 0}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOTP}
                disabled={resendLoading || isLoading}
              >
                <Text style={styles.resendText}>
                  {resendLoading ? 'Resending...' : "Didn't receive your code? Resend OTP"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Submit</Text>
                )}
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
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    marginTop: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  consentText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    textAlign: 'center',
    minWidth: 50,
    aspectRatio: 1,
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

