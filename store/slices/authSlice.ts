import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@/services/api';

interface User {
  user_id: string;
  session_id: string;
  access_token: string;
  refresh_token: string;
  is_new_user?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isNewUser: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isNewUser: false,
};

// Load user from storage
export const loadUser = createAsyncThunk('auth/loadUser', async () => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    return null;
  } catch (error) {
    console.error('Error loading user:', error);
    return null;
  }
});

// Send OTP
export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async (phone_number: string, { rejectWithValue }) => {
    try {
      const response = await apiService.sendOTP(phone_number);
      if (response.data) {
        return response.data;
      }
      throw new Error('Failed to send OTP');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send OTP');
    }
  }
);

// Verify OTP
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (
    { phone_number, otp_code, otp_id }: { phone_number: string; otp_code: string; otp_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.verifyOTP(phone_number, otp_code, otp_id);
      if (response.data) {
        const isNewUser = response.data.is_new_user === true;
        console.log('OTP Verification - is_new_user:', response.data.is_new_user, 'isNewUser:', isNewUser);
        const userData: User = {
          user_id: response.data.user_id,
          session_id: response.data.session_id,
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          is_new_user: isNewUser,
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        return { userData, isNewUser };
      }
      throw new Error('Failed to verify OTP');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to verify OTP');
    }
  }
);

// Resend OTP
export const resendOTP = createAsyncThunk(
  'auth/resendOTP',
  async (phone_number: string, { rejectWithValue }) => {
    try {
      const response = await apiService.resendOTP(phone_number);
      if (response.data) {
        return response.data;
      }
      throw new Error('Failed to resend OTP');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to resend OTP');
    }
  }
);

// Logout
export const logout = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.removeItem('user');
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearNewUserFlag: (state) => {
      state.isNewUser = false;
      if (state.user) {
        state.user.is_new_user = false;
        // Update AsyncStorage
        AsyncStorage.setItem('user', JSON.stringify(state.user)).catch(console.error);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        // Explicitly check for true, not just truthy
        state.isNewUser = action.payload?.is_new_user === true;
        console.log('🔍 loadUser - Restored user:', action.payload?.user_id, 'isNewUser:', state.isNewUser);
      })
      .addCase(loadUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      })
      // Send OTP
      .addCase(sendOTP.pending, (state) => {
        state.error = null;
      })
      .addCase(sendOTP.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Verify OTP
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        console.log('🔍 verifyOTP.fulfilled - Full payload:', JSON.stringify(action.payload, null, 2));
        console.log('🔍 verifyOTP.fulfilled - action.payload.isNewUser:', action.payload.isNewUser, 'type:', typeof action.payload.isNewUser);
        state.isLoading = false;
        state.user = action.payload.userData;
        state.isAuthenticated = true;
        // Explicitly check for true boolean
        const isNewUserValue = action.payload.isNewUser === true || String(action.payload.isNewUser) === 'true';
        state.isNewUser = Boolean(isNewUserValue);
        state.error = null;
        console.log('✅ Auth State Updated - state.isNewUser:', state.isNewUser, 'state.isAuthenticated:', state.isAuthenticated);
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Resend OTP
      .addCase(resendOTP.pending, (state) => {
        state.error = null;
      })
      .addCase(resendOTP.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(resendOTP.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, clearNewUserFlag } = authSlice.actions;
export default authSlice.reducer;

