import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CONFIGURATION: Backend URL
// ============================================
// Priority order:
// 1. Environment variable (EXPO_PUBLIC_API_URL) - for ngrok or production
// 2. app.json extra.apiUrl - for development
// 3. Fallback to IP-based URLs
// ============================================
const PHYSICAL_DEVICE_IP = '10.75.201.7'; // Fallback IP (only used if env vars not set)

// Get the correct base URL based on platform
const getBaseURL = () => {
  // Priority 1: Check environment variable (EXPO_PUBLIC_API_URL)
  // This works with ngrok: EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io/api
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl) {
    console.log('📡 Using API URL from environment variable:', envApiUrl);
    return envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`;
  }
  
  // Priority 2: Check app.json extra config
  const customUrl = Constants.expoConfig?.extra?.apiUrl;
  if (customUrl) {
    console.log('📡 Using API URL from app.json:', customUrl);
    return customUrl.endsWith('/api') ? customUrl : `${customUrl}/api`;
  }
  
  // Priority 3: Fallback to IP-based URLs (for local development)
  console.log('📡 Using fallback IP-based URL');

  // For web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api';
  }
  
  // For Android
  if (Platform.OS === 'android') {
    // Check if running on emulator or physical device
    // In Expo Go, Constants.isDevice might be undefined, so we check deviceName
    const deviceName = Constants.deviceName || '';
    const isEmulator = deviceName.includes('emulator') || 
                       deviceName.includes('sdk') ||
                       deviceName.includes('Android SDK');
    
    // If Constants.isDevice is explicitly false, it's an emulator
    // If it's true or undefined (Expo Go), assume physical device
    const isPhysicalDevice = Constants.isDevice !== false;
    
    if (isEmulator || !isPhysicalDevice) {
      // Android Emulator - use special IP
      return 'http://10.0.2.2:8000/api';
    } else {
      // Physical Android device (Expo Go) - use computer's IP
      return `http://${PHYSICAL_DEVICE_IP}:8000/api`;
    }
  }
  
  // For iOS
  if (Platform.OS === 'ios') {
    // Check if running on simulator or physical device
    const isSimulator = Constants.isDevice === false;
    
    if (isSimulator) {
      // iOS Simulator - localhost works
      return 'http://localhost:8000/api';
    } else {
      // Physical iOS device (Expo Go) - use computer's IP
      return `http://${PHYSICAL_DEVICE_IP}:8000/api`;
    }
  }
  
  // Default fallback
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getBaseURL();

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE_URL;
    console.log('API Base URL:', this.baseUrl);
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.access_token || null;
      }
    } catch (error) {
      console.error('Error getting access token:', error);
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();
    
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 Making request to:', url);
      console.log('📱 Platform:', Platform.OS, '| Is Device:', Constants.isDevice);
      
      // Get access token for authenticated requests
      const accessToken = await this.getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        // ngrok bypass headers (for free tier)
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      };
      
      // Add authorization header if token exists and endpoint requires auth
      // Skip auth for public endpoints
      const publicEndpoints = ['/auth/send-otp', '/auth/verify-otp', '/auth/resend-otp'];
      const requiresAuth = !publicEndpoints.some(ep => endpoint.includes(ep));
      
      if (accessToken && requiresAuth) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Create abort controller for timeout
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Check if response is ok before parsing JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        
        // Check if ngrok warning page
        if (text.includes('ngrok') || text.includes('ERR_NGROK') || text.includes('<!DOCTYPE html>')) {
          console.error('❌ ngrok warning page detected. This usually means:');
          console.error('1. The ngrok URL requires browser verification');
          console.error('2. Add "ngrok-skip-browser-warning: true" header (already added)');
          console.error('3. Or visit the ngrok URL in a browser first to verify');
          throw new Error('ngrok verification required. Please visit the ngrok URL in a browser first, or check your backend is running.');
        }
        
        console.error('❌ Invalid response type:', text.substring(0, 200));
        throw new Error(`Invalid response: ${text.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        // Don't log 404 errors for user profiles (expected for missing users)
        if (response.status === 404 && endpoint.includes('/user/profile/')) {
          // Silently return error without logging - this is expected behavior
          // Return a clean error that won't spam the console
          const error = new Error('User not found');
          (error as any).isExpected = true;
          throw error;
        }
        // Only log non-404 errors or 404s for non-profile endpoints
        if (response.status !== 404 || !endpoint.includes('/user/profile/')) {
          console.error('❌ Request failed:', response.status, data);
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      console.log('✅ Request successful:', endpoint);
      return data;
    } catch (error: any) {
      // Don't log expected 404 errors for user profiles (missing users are expected)
      const isExpectedUserNotFound = 
        ((error as any).isExpected || 
         error.message?.includes('User not found') || 
         error.message?.includes('404')) && 
        endpoint.includes('/user/profile/');
      
      if (!isExpectedUserNotFound) {
        console.error('❌ API Request Error:', error);
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          url: `${this.baseUrl}${endpoint}`,
        });
      }
      
      // Re-throw the error so calling code can handle it
      throw error;
      
      // Provide more helpful error messages
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.name === 'TypeError') {
        
        // Use same detection logic as getBaseURL
        const isPhysicalDevice = Constants.isDevice !== false;
        let errorMsg = 'Cannot connect to server.\n\n';
        errorMsg += '1. Make sure the backend is running: cd vybeme_backend && npm start\n';
        errorMsg += '2. Check the server is on port 8000\n';
        errorMsg += `3. Current API URL: ${this.baseUrl}\n`;
        
        if (isPhysicalDevice && Platform.OS !== 'web') {
          errorMsg += '\n⚠️ You are on a PHYSICAL DEVICE.\n';
          errorMsg += 'Make sure PHYSICAL_DEVICE_IP is set correctly in services/api.ts\n';
          errorMsg += `Current IP setting: ${PHYSICAL_DEVICE_IP}\n`;
          errorMsg += 'Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)\n';
          errorMsg += 'Update PHYSICAL_DEVICE_IP at the top of services/api.ts';
        } else {
          errorMsg += '\n💡 If using emulator/simulator, make sure:\n';
          errorMsg += '- Android: Use 10.0.2.2 (already configured)\n';
          errorMsg += '- iOS: Use localhost (already configured)';
        }
        
        throw new Error(errorMsg);
      }
      
      if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Aborted')) {
        let timeoutMsg = 'Request timeout. The server is taking too long to respond.\n\n';
        timeoutMsg += 'Possible causes:\n';
        timeoutMsg += '1. Backend server is not running\n';
        timeoutMsg += '2. Backend server is slow or overloaded\n';
        timeoutMsg += '3. Network connection is slow\n';
        timeoutMsg += `4. Check if backend is accessible at: ${this.baseUrl}\n`;
        timeoutMsg += '\nTry:\n';
        timeoutMsg += '- Restart the backend server\n';
        timeoutMsg += '- Check backend logs for errors\n';
        timeoutMsg += '- Verify the IP address is correct';
        throw new Error(timeoutMsg);
      }
      
      throw new Error(error.message || 'Network error');
    } finally {
      // Always clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // Auth APIs
  async sendOTP(phone_number: string) {
    return this.request<{ otp_id: string; expires_at: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number }),
    });
  }

  async verifyOTP(phone_number: string, otp_code: string, otp_id: string) {
    const response = await this.request<{
      user_id: string;
      session_id: string;
      is_new_user: boolean;
      access_token: string;
      refresh_token: string;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number, otp_code, otp_id }),
    });
    console.log('🔍 verifyOTP API Response:', JSON.stringify(response, null, 2));
    console.log('🔍 is_new_user value:', response.data?.is_new_user, 'type:', typeof response.data?.is_new_user);
    return response;
  }

  async resendOTP(phone_number: string) {
    return this.request<{ otp_id: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number }),
    });
  }

  // User Profile APIs
  async getCurrentUser(session_id: string) {
    return this.request<any>(`/user/me?session_id=${session_id}`, {
      method: 'GET',
    });
  }

  async getUserProfile(user_id: string) {
    return this.request<any>(`/user/profile/${user_id}`, {
      method: 'GET',
    });
  }

  async updateProfile(session_id: string, data: { name?: string; bio?: string; profile_image?: string; interests?: string[]; gender?: string }) {
    return this.request<any>('/user/update', {
      method: 'POST',
      body: JSON.stringify({ session_id, ...data }),
    });
  }

  async getUserStats(user_id: string) {
    return this.request<{ plans_count: number; interactions_count: number }>(`/user/stats?user_id=${user_id}`, {
      method: 'GET',
    });
  }

  async getUserPlans(user_id: string, limit = 20, offset = 0) {
    return this.request<any[]>(`/user/plans?user_id=${user_id}&limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  }

  async getSavedPosts(user_id: string) {
    return this.request<any[]>(`/user/saved-posts?user_id=${user_id}`, {
      method: 'GET',
    });
  }

  async savePost(accessToken: string, user_id: string, post_id: string) {
    return this.request<{ save_id: string; saved_at: string }>('/post/save', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ user_id, post_id }),
    });
  }

  async unsavePost(accessToken: string, user_id: string, post_id: string) {
    return this.request<any>('/post/unsave', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ user_id, post_id }),
    });
  }

  async deleteUser(session_id: string) {
    return this.request<any>('/user/delete', {
      method: 'DELETE',
      body: JSON.stringify({ session_id }),
    });
  }

  // Upload API
  async uploadImage(formData: FormData, accessToken?: string) {
    return this.uploadFile(formData, accessToken, '/upload/image');
  }

  // Upload multiple images (uses uploadMultiple which works in createPost)
  async uploadImages(formData: FormData, accessToken?: string) {
    return this.uploadFile(formData, accessToken, '/upload/images');
  }

  // Upload profile image (uses Cloudinary's profile folder)
  async uploadProfileImage(formData: FormData, accessToken?: string) {
    return this.uploadFile(formData, accessToken, '/upload/profile-image');
  }

  // Generic file upload method
  private async uploadFile(formData: FormData, accessToken: string | undefined, endpoint: string) {
    // For React Native FormData, we must NOT set Content-Type header
    // The runtime will automatically set it with the correct boundary
    const headers: HeadersInit = {
      'ngrok-skip-browser-warning': 'true',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // IMPORTANT: Do NOT set Content-Type for FormData in React Native
    // The fetch API will automatically set it with the correct multipart boundary
    
    // Construct URL - baseUrl already includes /api, endpoint should start with /
    // Example: baseUrl = "https://xxx.ngrok.io/api", endpoint = "/upload/image"
    // Result: "https://xxx.ngrok.io/api/upload/image"
    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 Uploading file to:', url);
    console.log('📤 Base URL:', this.baseUrl);
    console.log('📤 Endpoint:', endpoint);
    console.log('📤 Full URL:', url);
    console.log('📤 Headers:', JSON.stringify(headers, null, 2));
    
    // Log FormData contents if available (React Native FormData has _parts)
    // @ts-ignore - React Native FormData internal structure
    if (formData._parts) {
      console.log('📤 FormData _parts:', JSON.stringify(formData._parts, null, 2));
    }
    
    // Use the EXACT same fetch approach as createPost
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    });
    
    // Check if response is ok before parsing JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Check if ngrok warning page
      if (text.includes('ngrok') || text.includes('ERR_NGROK') || text.includes('<!DOCTYPE html>')) {
        throw new Error('ngrok verification required. Please check your backend connection.');
      }
      throw new Error(`Invalid response: ${text.substring(0, 100)}...`);
    }
    
    if (!response.ok) {
      console.error('❌ Upload failed:', response.status, data);
      throw new Error(data.message || 'Upload failed');
    }
    
    return data;
  }

  // Post APIs
  async createPost(accessToken: string, postData: FormData | any) {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
      'ngrok-skip-browser-warning': 'true',
    };

    // If FormData, don't set Content-Type (browser will set it with boundary)
    if (!(postData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}/post/create`, {
      method: 'POST',
      headers,
      body: postData instanceof FormData ? postData : JSON.stringify(postData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create post');
    }
    return data;
  }

  // Business Plan APIs
  async createBusinessPlan(accessToken: string, planData: any) {
    return this.request<any>('/plan/business', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(planData),
    });
  }

  async getBusinessPlan(planId: string) {
    return this.request<any>(`/plan/${planId}`, {
      method: 'GET',
    });
  }

  async getBusinessPlans(filters?: { category_main?: string; user_id?: string }, pagination?: { limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (filters?.category_main) queryParams.append('category_main', filters.category_main);
    if (filters?.user_id) queryParams.append('user_id', filters.user_id);
    if (pagination?.limit) queryParams.append('limit', pagination.limit.toString());
    if (pagination?.offset) queryParams.append('offset', pagination.offset.toString());
    
    const query = queryParams.toString();
    return this.request<any[]>(`/plan${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  // Feed APIs
  async getHomeFeed(user_id?: string, filters?: { category_main?: string; category_sub?: string[]; location?: any }, pagination?: { limit?: number; offset?: number }) {
    return this.request<any[]>('/feed/home', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user_id || null,
        filters: filters || {},
        pagination: pagination || { limit: 10, offset: 0 },
      }),
    });
  }

  async refreshFeed(user_id: string) {
    return this.request<any[]>(`/feed/refresh?user_id=${user_id}`, {
      method: 'GET',
    });
  }

  async getPost(post_id: string) {
    return this.request<any>(`/feed/post/${post_id}`, {
      method: 'GET',
    });
  }

  // Interaction APIs
  async addComment(post_id: string, user_id: string, text: string) {
    return this.request<{ comment_id: string }>('/post/comment', {
      method: 'POST',
      body: JSON.stringify({ post_id, user_id, text }),
    });
  }

  async getComments(post_id: string) {
    return this.request<any[]>(`/post/comments/${post_id}`, {
      method: 'GET',
    });
  }

  async addReaction(post_id: string, user_id: string, emoji_type: string) {
    return this.request<any>('/post/react', {
      method: 'POST',
      body: JSON.stringify({ post_id, user_id, emoji_type }),
    });
  }

  async getReactions(post_id: string) {
    return this.request<any[]>(`/post/reactions/${post_id}`, {
      method: 'GET',
    });
  }

  async createJoinRequest(post_id: string, user_id: string, message?: string) {
    return this.request<{ request_id: string }>('/post/join', {
      method: 'POST',
      body: JSON.stringify({ post_id, user_id, message }),
    });
  }

  async createJoinRequestWithReaction(post_id: string, user_id: string, emoji_type: string) {
    return this.request<{ request_id: string }>('/post/join-with-reaction', {
      method: 'POST',
      body: JSON.stringify({ post_id, user_id, emoji_type }),
    });
  }

  async createJoinRequestWithComment(post_id: string, user_id: string, text: string) {
    return this.request<{ request_id: string }>('/post/join-with-comment', {
      method: 'POST',
      body: JSON.stringify({ post_id, user_id, text }),
    });
  }

  async getJoinRequests(post_id: string) {
    return this.request<any[]>(`/post/join/requests/${post_id}`, {
      method: 'GET',
    });
  }

  async approveJoinRequest(request_id: string) {
    return this.request<any>('/post/join/approve', {
      method: 'POST',
      body: JSON.stringify({ request_id }),
    });
  }

  async rejectJoinRequest(request_id: string) {
    return this.request<any>('/post/join/reject', {
      method: 'POST',
      body: JSON.stringify({ request_id }),
    });
  }

  // Repost APIs
  async createRepost(original_plan_id: string, repost_author_id: string, added_content?: string) {
    return this.request<{ repost_id: string }>('/repost/create', {
      method: 'POST',
      body: JSON.stringify({ original_plan_id, repost_author_id, added_content }),
    });
  }

  // Notification APIs
  async getNotifications(user_id: string) {
    return this.request<any[]>(`/notifications/list?user_id=${user_id}`, {
      method: 'GET',
    });
  }

  async markNotificationAsRead(notification_id: string) {
    return this.request<any>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_id }),
    });
  }

  async getUnreadCount(user_id: string) {
    return this.request<{ unread_count: number }>(`/notifications/counter?user_id=${user_id}`, {
      method: 'GET',
    });
  }

  // Chat/Group APIs
  async createGroup(post_id: string, created_by: string, member_ids: string[], group_name?: string) {
    return this.request<{ group_id: string }>('/chat/group/create', {
      method: 'POST',
      body: JSON.stringify({ post_id, created_by, member_ids, group_name }),
    });
  }

  async createIndividualChat(post_id: string, user_id: string, other_user_id: string) {
    return this.request<{ group_id: string }>('/chat/individual/create', {
      method: 'POST',
      body: JSON.stringify({ post_id, user_id, other_user_id }),
    });
  }

  async addMembersToGroup(group_id: string, member_ids: string[]) {
    return this.request<any>('/chat/group/add-members', {
      method: 'POST',
      body: JSON.stringify({ group_id, member_ids }),
    });
  }

  async getChatLists(user_id: string) {
    return this.request<{
      their_plans: any[];
      my_plans: any[];
      groups: any[];
    }>(`/chat/lists?user_id=${user_id}`, {
      method: 'GET',
    });
  }

  async getGroupDetails(group_id: string) {
    return this.request<any>(`/chat/group/details/${group_id}`, {
      method: 'GET',
    });
  }

  async sendMessage(group_id: string, user_id: string, type: 'text' | 'image' | 'poll', content: any) {
    return this.request<{ message_id: string }>('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ group_id, user_id, type, content }),
    });
  }

  async getMessages(group_id: string) {
    return this.request<any[]>(`/chat/messages/${group_id}`, {
      method: 'GET',
    });
  }

  async addReaction(message_id: string, user_id: string, emoji_type: string) {
    return this.request<any>('/chat/message/reaction', {
      method: 'POST',
      body: JSON.stringify({ message_id, user_id, emoji_type }),
    });
  }

  async removeReaction(message_id: string, user_id: string, emoji_type: string) {
    return this.request<any>('/chat/message/reaction', {
      method: 'DELETE',
      body: JSON.stringify({ message_id, user_id, emoji_type }),
    });
  }

  async createPoll(group_id: string, user_id: string, question: string, options: string[], media?: any) {
    return this.request<{ poll_id: string }>('/chat/poll/create', {
      method: 'POST',
      body: JSON.stringify({ group_id, user_id, question, options, media }),
    });
  }

  async votePoll(poll_id: string, user_id: string, option_id: string) {
    return this.request<any>('/chat/poll/vote', {
      method: 'POST',
      body: JSON.stringify({ poll_id, user_id, option_id }),
    });
  }

  async getPollResults(poll_id: string) {
    return this.request<any>(`/chat/poll/results/${poll_id}`, {
      method: 'GET',
    });
  }

  async closeGroup(group_id: string, user_id: string) {
    return this.request<any>('/chat/group/close', {
      method: 'POST',
      body: JSON.stringify({ group_id, user_id }),
    });
  }

  async reopenGroup(group_id: string, user_id: string) {
    return this.request<any>('/chat/group/reopen', {
      method: 'POST',
      body: JSON.stringify({ group_id, user_id }),
    });
  }
}

export const apiService = new ApiService();

