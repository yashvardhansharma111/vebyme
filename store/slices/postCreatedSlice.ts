import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PostCreatedPayload {
  planId: string;
  title: string;
  description?: string;
  media?: Array<{ url: string; type?: string }>;
  tags?: string[];
  category_main?: string;
}

interface PostCreatedState {
  value: PostCreatedPayload | null;
}

const initialState: PostCreatedState = {
  value: null,
};

const postCreatedSlice = createSlice({
  name: 'postCreated',
  initialState,
  reducers: {
    setPostCreated(state, action: PayloadAction<PostCreatedPayload>) {
      state.value = action.payload;
    },
    clearPostCreated(state) {
      state.value = null;
    },
  },
});

export const { setPostCreated, clearPostCreated } = postCreatedSlice.actions;
export default postCreatedSlice.reducer;
