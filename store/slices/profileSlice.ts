import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { RootState } from '../store';

interface UserProfile {
  user_id: string;
  name: string;
  profile_image: string | null;
  bio: string;
  interests: string[];
  gender?: string;
  phone_number?: string;
}

interface ProfileState {
  currentUser: UserProfile | null;
  viewedUser: UserProfile | null;
  stats: {
    plans_count: number;
    interactions_count: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  currentUser: null,
  viewedUser: null,
  stats: null,
  isLoading: false,
  error: null,
};

// Get current user profile
export const fetchCurrentUser = createAsyncThunk(
  'profile/fetchCurrentUser',
  async (session_id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getCurrentUser(session_id);
      if (response.data) {
        return {
          ...response.data,
          interests: response.data.interests || [],
        };
      }
      throw new Error('Failed to fetch user');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Get user profile by ID
export const fetchUserProfile = createAsyncThunk(
  'profile/fetchUserProfile',
  async (user_id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserProfile(user_id);
      if (response.data) {
        return {
          ...response.data,
          interests: response.data.interests || [],
        };
      }
      throw new Error('Failed to fetch user profile');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Get user stats
export const fetchUserStats = createAsyncThunk(
  'profile/fetchUserStats',
  async (user_id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserStats(user_id);
      if (response.data) {
        return response.data;
      }
      throw new Error('Failed to fetch stats');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update profile
export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (
    { session_id, data }: { session_id: string; data: { name?: string; bio?: string; profile_image?: string; interests?: string[]; gender?: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.updateProfile(session_id, data);
      if (response.data) {
        return {
          ...response.data,
          interests: response.data.interests || [],
        };
      }
      throw new Error('Failed to update profile');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearViewedUser: (state) => {
      state.viewedUser = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch current user
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.viewedUser = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch stats
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      });
  },
});

export const { clearViewedUser, clearError } = profileSlice.actions;
export default profileSlice.reducer;

