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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { store } from '@/store/store';
import { sendOTP, verifyOTP, resendOTP, clearError } from '@/store/slices/authSlice';
import { useSnackbar } from '@/context/SnackbarContext';

const DARK_BG = '#252525';
const DARK_TEXT = '#f3f3f3';
const LIGHT_BUTTON_BG = '#f3f3f3';
const INPUT_BG = '#3a3a3c';
const MUTED = '#8E8E93';

export default function LoginScreen() {
  const [step, setStep] = useState<'splash' | 'phone' | 'otp'>('splash');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showSnackbar } = useSnackbar();
  const { isLoading, error, isAuthenticated, isNewUser } = useAppSelector((state) => state.auth);

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

  useEffect(() => {
    if (error) {
      showSnackbar(error, { position: 'top', duration: 3000 });
      dispatch(clearError());
    }
  }, [error, dispatch, showSnackbar]);

  useEffect(() => {
    if (step === 'otp') {
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [step]);

  const phoneDigits = (phone || '').replace(/\D/g, '');
  const canSendOtp = phoneDigits.length >= 10;
  const OTP_LENGTH = 6;
  const canVerifyOtp = (otp || '').trim().length >= OTP_LENGTH && !!otpId;

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
    if (sendOTP.fulfilled.match(result) && result.payload) {
      setOtpId(result.payload.otp_id);
      setOtp('');
      setStep('otp');
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
        if (payloadIsNewUser) router.replace('/signup/profile');
        else router.replace('/(tabs)');
      }, 200);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    const result = await dispatch(resendOTP(phone.trim()));
    if (resendOTP.fulfilled.match(result) && result.payload) {
      setOtpId(result.payload.otp_id);
      setOtp('');
    }
    setResendLoading(false);
  };

  // —— Splash: vybeme. + Login or Signup button ——
  if (step === 'splash') {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.splashContent}>
          <View style={styles.vybemeWrapper}>
            <Text style={styles.vybemeLogo}>vybeme.</Text>
          </View>
          <TouchableOpacity
            style={styles.splashButton}
            onPress={() => setStep('phone')}
            activeOpacity={0.8}
          >
            <Text style={styles.splashButtonText}>Login or Signup</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.homeIndicator} />
      </View>
    );
  }

  // —— Phone & OTP: dark theme, vybeme in header ——
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header: back + vybeme. */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => (step === 'otp' ? setStep('phone') : setStep('splash'))}
            >
              <Ionicons name="chevron-back" size={28} color={DARK_TEXT} />
            </TouchableOpacity>
            <Text style={styles.headerVybe}>vybeme.</Text>
          </View>

          {step === 'phone' ? (
            <>
              <View style={styles.formBlock}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Phone number"
                  placeholderTextColor={MUTED}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <Text style={styles.fieldNote}>Message & data rates may apply</Text>
              </View>
              <View style={styles.bottomBlock}>
                <TouchableOpacity
                  style={[styles.primaryBtn, (!canSendOtp || isLoading) && styles.primaryBtnDisabled]}
                  onPress={handleSendOTP}
                  disabled={!canSendOtp || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#1C1C1E" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.formBlock}>
                <View style={styles.otpRow}>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <TextInput
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      style={styles.otpCircle}
                      value={otp[i] || ''}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      onChangeText={(text) => {
                        const digits = text.replace(/\D/g, '');
                        if (digits.length > 1) {
                          const pasted = digits.slice(0, OTP_LENGTH);
                          setOtp(pasted);
                          if (pasted.length < OTP_LENGTH) inputRefs.current[pasted.length]?.focus();
                          else inputRefs.current[OTP_LENGTH - 1]?.focus();
                          return;
                        }
                        const arr = otp.split('');
                        arr[i] = digits;
                        const next = arr.join('').slice(0, OTP_LENGTH);
                        setOtp(next);
                        if (digits && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
                          inputRefs.current[i - 1]?.focus();
                        }
                      }}
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.resendWrap}
                  onPress={handleResendOTP}
                  disabled={resendLoading || isLoading}
                >
                  <Text style={styles.resendText}>
                    {resendLoading ? 'Resending...' : "Didn't receive your code? "}
                    {!resendLoading && <Text style={styles.resendBold}>Resend Code</Text>}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.bottomBlock}>
                <TouchableOpacity
                  style={[styles.primaryBtn, (!canVerifyOtp || isLoading) && styles.primaryBtnDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={!canVerifyOtp || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#1C1C1E" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      <View style={styles.homeIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  vybemeWrapper: {
    marginBottom: 48,
  },
  vybemeLogo: {
    fontSize: 56,
    letterSpacing: -2.8,
    lineHeight: 62,
    fontWeight: '800',
    color: DARK_TEXT,
    textAlign: 'center',
  },
  splashButton: {
    backgroundColor: LIGHT_BUTTON_BG,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    minWidth: 200,
    alignItems: 'center',
  },
  splashButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  homeIndicator: {
    height: 1,
    width: 353,
    alignSelf: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  keyboardView: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerVybe: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_TEXT,
  },
  formBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInput: {
    width: '100%',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 18,
    color: DARK_TEXT,
  },
  fieldNote: {
    fontSize: 13,
    color: MUTED,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: 22,
    fontWeight: '600',
    color: DARK_TEXT,
    textAlign: 'center',
  },
  resendWrap: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: DARK_TEXT,
  },
  resendBold: {
    fontWeight: '700',
    color: DARK_TEXT,
  },
  bottomBlock: {
    paddingBottom: 24,
  },
  primaryBtn: {
    backgroundColor: LIGHT_BUTTON_BG,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
