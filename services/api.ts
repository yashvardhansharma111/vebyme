import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ============================================
// CONFIGURATION: Set your computer's IP address here
// ============================================
// For physical devices (Expo Go), you need your computer's local IP
// Find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
// Look for "IPv4 Address" - usually starts with 192.168.x.x
// ============================================
const PHYSICAL_DEVICE_IP = '10.75.201.7'; // 👈 UPDATE THIS with your computer's IP
// ============================================

// Get the correct base URL based on platform
const getBaseURL = () => {
  // Check if there's a custom API URL in environment variables
  const customUrl = Constants.expoConfig?.extra?.apiUrl;
  if (customUrl) {
    return customUrl;
  }

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 Making request to:', url);
      console.log('📱 Platform:', Platform.OS, '| Is Device:', Constants.isDevice);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Check if response is ok before parsing JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('❌ Invalid response type:', text);
        throw new Error(`Invalid response: ${text}`);
      }
      
      if (!response.ok) {
        console.error('❌ Request failed:', response.status, data);
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      console.log('✅ Request successful:', endpoint);
      return data;
    } catch (error: any) {
      console.error('❌ API Request Error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        url: `${this.baseUrl}${endpoint}`,
      });
      
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
      
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        throw new Error('Request timeout. The server is taking too long to respond.');
      }
      
      throw new Error(error.message || 'Network error');
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

  async deleteUser(session_id: string) {
    return this.request<any>('/user/delete', {
      method: 'DELETE',
      body: JSON.stringify({ session_id }),
    });
  }

  // Upload API
  async uploadImage(formData: FormData, accessToken?: string) {
    const headers: HeadersInit = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${this.baseUrl.replace('/api', '')}/api/upload/image`, {
      method: 'POST',
      body: formData,
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data;
  }

  // Post APIs
  async createPost(accessToken: string, postData: FormData | any) {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
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

  // Feed APIs
  async getHomeFeed(user_id: string, filters?: { category_main?: string; category_sub?: string[]; location?: any }, pagination?: { limit?: number; offset?: number }) {
    return this.request<any[]>('/feed/home', {
      method: 'POST',
      body: JSON.stringify({
        user_id,
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
}

export const apiService = new ApiService();

