import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';

interface NotificationsState {
  unreadCount: number;
  isLoading: boolean;
}

const initialState: NotificationsState = {
  unreadCount: 0,
  isLoading: false,
};

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (user_id: string | null | undefined) => {
    if (!user_id) return 0;
    const res: any = await apiService.getUnreadCount(user_id);
    const count =
      res?.data?.unread_count ??
      res?.data?.unreadCount ??
      res?.unread_count ??
      res?.unreadCount ??
      0;
    return typeof count === 'number' ? count : Number(count) || 0;
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnreadCount.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.unreadCount = action.payload;
      })
      .addCase(fetchUnreadCount.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setUnreadCount } = notificationsSlice.actions;
export default notificationsSlice.reducer;
