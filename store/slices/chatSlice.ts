import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';

interface ChatState {
  unreadCount: number;
  isLoading: boolean;
}

const initialState: ChatState = {
  unreadCount: 0,
  isLoading: false,
};

export const fetchChatUnreadCount = createAsyncThunk(
  'chat/fetchChatUnreadCount',
  async (user_id: string | null | undefined) => {
    if (!user_id) return 0;
    const res: any = await apiService.getChatUnreadCount(user_id);
    const count =
      res?.data?.unread_count ??
      res?.data?.unreadCount ??
      res?.unread_count ??
      res?.unreadCount ??
      0;
    return typeof count === 'number' ? count : Number(count) || 0;
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChatUnreadCount(state, action) {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const { setChatUnreadCount } = chatSlice.actions;
export default chatSlice.reducer;
