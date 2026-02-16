import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { store } from '@/store/store';
import { sendOTP, verifyOTP, resendOTP, clearError } from '@/store/slices/authSlice';
import { useSnackbar } from '@/context/SnackbarContext';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [resendLoading, setResendLoading] = useState(false);
  
  // Create refs to manage input focus
  const inputRefs = useRef<Array<TextInput | null>>([]);
  
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showSnackbar } = useSnackbar();
  const { isLoading, error, isAuthenticated, isNewUser } = useAppSelector((state) => state.auth);

  // Navigate based on authentication and new user status
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        const currentState = store.getState().auth;
        if (currentState.isNewUser === true) {
          router.replace('/signup/profile');
        } else {
          router.replace('/(tabs)');
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isNewUser, router]);

  // Show errors in snackbar at top, 3 seconds
  useEffect(() => {
    if (error) {
      showSnackbar(error, { position: 'top', duration: 3000 });
      dispatch(clearError());
    }
  }, [error, dispatch, showSnackbar]);

  // Auto-focus first OTP input when on OTP step so keyboard opens
  useEffect(() => {
    if (step === 'otp') {
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [step]);

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
      const payloadIsNewUser = result.payload.isNewUser === true;
      setTimeout(() => {
        if (payloadIsNewUser) {
          router.replace('/signup/profile');
        } else {
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
      }
    }
    setResendLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.contentContainer}>
            {step === 'otp' && (
              <TouchableOpacity style={styles.backButton} onPress={() => setStep('phone')}>
                <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            )}
            {/* --- TOP SECTION --- */}
            <View style={styles.topSection}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {step === 'phone' ? 'Found the Vybe?' : 'One Time Peek'}
                </Text>
                <Text style={styles.subtitle}>
                  {step === 'phone'
                    ? "Don't worry, we'll hold it while you singup!"
                    : `We sent ${phone} a code via SMS`}
                </Text>
              </View>

              {step === 'phone' ? (
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                  <Text style={styles.fieldNote}>Message % data rates may apply</Text>
                </View>
              ) : (
                <View style={styles.otpSection}>
                  <View style={styles.otpContainer}>
                    {[0, 1, 2, 3].map((index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        style={styles.otpInput}
                        value={otp[index] || ''}
                        keyboardType="number-pad"
                        maxLength={index === 0 ? 4 : 1}
                        selectTextOnFocus
                        onChangeText={(text) => {
                          const digits = text.replace(/\D/g, '');
                          if (digits.length > 1) {
                            const pasted = digits.slice(0, 4);
                            setOtp(pasted);
                            if (pasted.length === 4) {
                              inputRefs.current[3]?.focus();
                            } else {
                              inputRefs.current[pasted.length]?.focus();
                            }
                            return;
                          }
                          const newOtp = otp.split('');
                          newOtp[index] = digits;
                          setOtp(newOtp.join(''));

                          if (digits && index < 3) {
                            inputRefs.current[index + 1]?.focus();
                          }
                        }}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace') {
                            if (!otp[index] && index > 0) {
                              inputRefs.current[index - 1]?.focus();
                            }
                          }
                        }}
                      />
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    style={styles.resendContainer}
                    onPress={handleResendOTP}
                    disabled={resendLoading || isLoading}
                  >
                    <Text style={styles.resendText}>
                      {resendLoading 
                        ? 'Resending...' 
                        : "Didn't receive your code? "}
                      {!resendLoading && <Text style={styles.resendBold}>Resend it</Text>}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* --- BOTTOM SECTION --- */}
            <View style={styles.bottomSection}>
              {step === 'phone' && (
                <Text style={styles.termsText}>
                  By tapping SEND CODE, you consent to receive text messages
                  from us or event hosts. Text HELP for help and STOP to cancel.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, (isLoading || (step === 'phone' ? !canSendOtp : !canVerifyOtp)) && styles.buttonDisabled]}
                onPress={step === 'phone' ? handleSendOTP : handleVerifyOTP}
                disabled={isLoading || (step === 'phone' ? !canSendOtp : !canVerifyOtp)}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {step === 'phone' ? 'Send OTP' : 'Submit'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
  },
  bottomSection: {
    width: '100%',
    paddingBottom: 10,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  fieldNote: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
    marginLeft: 4,
  },
  otpSection: {
    width: '100%',
    alignItems: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  otpInput: {
    width: 55,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    color: '#4B5563',
    fontSize: 14,
  },
  resendBold: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  termsText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});