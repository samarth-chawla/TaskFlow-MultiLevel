
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

interface UserState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
}

const initialState: UserState = {
  currentUser: null,
  users: [],
  loading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearUserData: (state) => {
      state.currentUser = null;
      state.users = [];
      state.loading = false;
    },
  },
});

export const { setCurrentUser, setUsers, setLoading, clearUserData } = userSlice.actions;
export default userSlice.reducer;
