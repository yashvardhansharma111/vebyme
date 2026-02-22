import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CONFIGURATION: Backend URL
// ============================================
// Priority order:
// 1. Environment variable (EXPO_PUBLIC_API_URL) - for production
// 2. app.json extra.apiUrl - for development
// 3. Fallback to IP-based URLs
// ============================================
const PHYSICAL_DEVICE_IP = '10.75.201.7'; // Fallback IP (only used if env vars not set)

// Get the correct base URL based on platform
const getBaseURL = () => {
  // Priority 1: Check environment variable (EXPO_PUBLIC_API_URL)
  // Example: EXPO_PUBLIC_API_URL=https://api.example.com/api
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

/**
 * Base URL for the hosted website (used when sharing post links from the app).
 * When someone opens the link, they see the single post on the web — app can run locally.
 * Set EXPO_PUBLIC_WEB_URL or extra.webUrl in app.json to your hosted site (e.g. https://vybeme.vercel.app).
 */
export function getWebBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_WEB_URL;
  if (env && env.trim()) return env.replace(/\/$/, '');
  const extra = Constants.expoConfig?.extra as { webUrl?: string } | undefined;
  if (extra?.webUrl?.trim()) return extra.webUrl.replace(/\/$/, '');
  return 'https://app.vybeme.in';
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

class ApiService {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE_URL;
    console.log('🔗 API Base URL:', this.baseUrl);
    console.log('🔗 Environment API URL:', process.env.EXPO_PUBLIC_API_URL || 'Not set');
    console.log('🔗 app.json API URL:', Constants.expoConfig?.extra?.apiUrl || 'Not set');

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

  private async getRefreshToken(): Promise<string | null> {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.refresh_token || null;
      }
    } catch (error) {
      console.error('Error getting refresh token:', error);
    }
    return null;
  }

  private async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();
        if (!refreshToken) {
          console.warn('⚠️ No refresh token available');
          await this.clearAuthData();
          return null;
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Token refresh failed:', response.status, errorData);
          await this.clearAuthData();
          return null;
        }

        const data = await response.json();
        if (data.success && data.data?.access_token) {
          // Update stored access token
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            user.access_token = data.data.access_token;
            await AsyncStorage.setItem('user', JSON.stringify(user));
            console.log('✅ Access token refreshed successfully');
            return data.data.access_token;
          }
        }

        await this.clearAuthData();
        return null;
      } catch (error: any) {
        console.error('❌ Error refreshing token:', error);
        await this.clearAuthData();
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user');
      console.log('🔓 Cleared authentication data - user should re-login');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401 = true
  ): Promise<ApiResponse<T>> {
    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();
    
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 Making request to:', url);
      console.log('📱 Platform:', Platform.OS, '| Is Device:', Constants.isDevice);
      
      // Get access token for authenticated requests
      const accessToken = await this.getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };
      
      // Add authorization header if token exists and endpoint requires auth
      // Skip auth for public endpoints
      const publicEndpoints = ['/auth/send-otp', '/auth/verify-otp', '/auth/resend-otp', '/auth/refresh-token'];
      const requiresAuth = !publicEndpoints.some(ep => endpoint.includes(ep));
      
      if (accessToken && requiresAuth) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Create abort controller for timeout
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000) as any; // 30 second timeout
      
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
        
        // Check if HTML response (unexpected)
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
          console.error('❌ Received HTML instead of JSON. This usually means:');
          console.error('1. The server returned an error page');
          console.error('2. The endpoint does not exist');
          console.error('3. Check your backend is running and the URL is correct');
          throw new Error('Invalid response from server. Check backend logs.');
        }
        
        console.error('❌ Invalid response type:', text.substring(0, 200));
        throw new Error(`Invalid response: ${text.substring(0, 100)}...`);
      }
      
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOn401 && requiresAuth && !endpoint.includes('/auth/refresh-token')) {
        const errorMessage = data.message || 'Invalid or expired access token';
        
        // Check if it's a token expiration error
        if (errorMessage.includes('token') || errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
          console.warn('⚠️ Access token expired or invalid. Attempting to refresh...');
          
          const newAccessToken = await this.refreshAccessToken();
          
          if (newAccessToken) {
            console.log('🔄 Retrying request with refreshed token...');
            // Retry the request with new token (only once)
            return this.request<T>(endpoint, options, false);
          } else {
            // Refresh failed - clear auth and throw error
            const authError = new Error('Session expired. Please log in again.');
            (authError as any).isAuthError = true;
            (authError as any).statusCode = 401;
            throw authError;
          }
        } else {
          // Other 401 errors (not token-related)
          const error = new Error(errorMessage);
          (error as any).statusCode = 401;
          throw error;
        }
      }
      
      if (!response.ok) {
        // Don't log 404 errors for user profiles (expected for missing users)
        if (response.status === 404 && endpoint.includes('/user/profile/')) {
          const error = new Error('User not found');
          (error as any).isExpected = true;
          (error as any).statusCode = 404;
          throw error;
        }
        // Don't log 404 for business event analytics (event may be deleted)
        if (response.status === 404 && endpoint.includes('/analytics/business/event/')) {
          const error = new Error(data.message || 'Event not found');
          (error as any).isExpected = true;
          (error as any).statusCode = 404;
          throw error;
        }
        // Don't log 404 for ticket guest-list (event may be deleted)
        if (response.status === 404 && endpoint.includes('/ticket/guest-list/')) {
          const error = new Error(data.message || 'Event not found');
          (error as any).isExpected = true;
          (error as any).statusCode = 404;
          throw error;
        }
        // Don't log 404 for getUserTicket(plan_id, user_id) - user may not have a ticket yet
        if (response.status === 404 && endpoint.match(/^\/ticket\/[^/]+\/[^/]+$/) && !endpoint.includes('by-id')) {
          const error = new Error(data.message || 'Ticket not found');
          (error as any).isExpected = true;
          (error as any).statusCode = 404;
          throw error;
        }
        // 404 on /user/me = session/user no longer exists (e.g. account deleted); caller should clear auth and show login
        if (response.status === 404 && endpoint.includes('/user/me')) {
          const error = new Error(data.message || 'User not found');
          (error as any).isExpected = true;
          (error as any).isSessionInvalid = true;
          (error as any).statusCode = 404;
          throw error;
        }

        // Categorize errors by status code
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        (error as any).statusCode = response.status;

        // Only log 404 for endpoints we don't treat as expected
        const isExpectedTicket404 = endpoint.match(/^\/ticket\/[^/]+\/[^/]+$/) && !endpoint.includes('by-id');
        if (response.status !== 404 || (!endpoint.includes('/user/profile/') && !endpoint.includes('/analytics/business/event/') && !endpoint.includes('/ticket/guest-list/') && !endpoint.includes('/user/me') && !isExpectedTicket404)) {
          if (response.status >= 500) {
            console.error('❌ Server Error:', response.status, data);
          } else if (response.status >= 400) {
            console.warn('⚠️ Client Error:', response.status, data);
          }
        }
        
        throw error;
      }

      console.log('✅ Request successful:', endpoint);
      return data;
    } catch (error: any) {
      // Don't log expected 404s (user profile, analytics event not found, etc.)
      const isExpected404 = (error as any).isExpected === true;
      
      // Handle network errors
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('Network request failed') ||
          error.message?.includes('NetworkError') ||
          error.name === 'TypeError') {
        
        if (!isExpected404) {
          console.error('❌ Network Error:', error.message);
        }
        
        const isPhysicalDevice = Constants.isDevice !== false;
        let errorMsg = 'Network connection error or server is unreachable.\n\n';
        errorMsg += `Current API URL: ${this.baseUrl}\n`;
        errorMsg += 'Please ensure:\n';
        errorMsg += '1. Your backend server is running and accessible.\n';
        errorMsg += '2. Your device has a stable internet connection.\n';
        errorMsg += '3. If using a local IP, it is correct and accessible from your device.';
        
        const networkError = new Error(errorMsg);
        (networkError as any).isNetworkError = true;
        throw networkError;
      }
      
      // Handle timeout errors
      if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Aborted')) {
        if (!isExpected404) {
          console.error('❌ Timeout Error:', error.message);
        }
        
        let timeoutMsg = 'Request timed out. The server took too long to respond.\n\n';
        timeoutMsg += 'Possible causes:\n';
        timeoutMsg += '1. Backend server is slow or overloaded.\n';
        timeoutMsg += '2. Network connection is unstable.\n';
        timeoutMsg += `3. Verify backend is accessible at: ${this.baseUrl}\n`;
        
        const timeoutError = new Error(timeoutMsg);
        (timeoutError as any).isTimeoutError = true;
        throw timeoutError;
      }
      
      // Log other errors (except expected ones)
      if (!isExpected404 && !(error as any).isAuthError) {
        console.error('❌ API Request Error:', error);
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          statusCode: (error as any).statusCode,
          url: `${this.baseUrl}${endpoint}`,
        });
      }
      
      // Re-throw the error so calling code can handle it
      throw error;
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

  async updateProfile(session_id: string, data: {
    name?: string;
    bio?: string;
    profile_image?: string;
    interests?: string[];
    gender?: string;
    social_media?: { instagram?: string; twitter?: string; x?: string; facebook?: string; snapchat?: string };
  }) {
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
    const headers: Record<string, string> = {};
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // IMPORTANT: Do NOT set Content-Type for FormData in React Native
    // The fetch API will automatically set it with the correct multipart boundary
    
    // Construct URL - baseUrl already includes /api, endpoint should start with /
    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 Uploading file to:', url);
    
    // Log FormData contents if available (React Native FormData has _parts)
    // React Native FormData has an internal _parts property that TypeScript doesn't know about
    if ((formData as any)._parts) {
      console.log('📤 FormData parts count:', (formData as any)._parts.length);
    }
    
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
      
      // Check if HTML response (unexpected)
      if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
        console.error('❌ Received HTML instead of JSON during upload');
        throw new Error('Invalid response from server. Check backend logs.');
      }
      
      throw new Error(`Invalid response: ${text.substring(0, 100)}...`);
    }
    
    if (!response.ok) {
      const error = new Error(data.message || 'Upload failed');
      (error as any).statusCode = response.status;
      console.error('❌ Upload failed:', response.status, data);
      throw error;
    }
    
    return data;
  }

  // Upload/create timeout (ms) – prevents infinite loading when request never reaches server (e.g. iOS FormData hang)
  private static readonly CREATE_POST_TIMEOUT_MS = 90000;

  // Post APIs
  async createPost(accessToken: string, postData: FormData | any) {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
    };

    // If FormData, don't set Content-Type (browser will set it with boundary)
    if (!(postData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ApiService.CREATE_POST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/post/create`, {
        method: 'POST',
        headers,
        body: postData instanceof FormData ? postData : JSON.stringify(postData),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.message || 'Failed to create post');
        (error as any).statusCode = response.status;
        throw error;
      }
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.');
      }
      throw err;
    }
  }

  // Business Plan APIs – always use /business-post/create (with FormData or JSON)
  async createBusinessPlan(accessToken: string, planData: any, formData?: FormData) {
    const url = `${this.baseUrl}/business-post/create`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
    };

    if (formData) {
      // Don't set Content-Type – let runtime set boundary for FormData
      console.log('[API] POST business-post/create (FormData)', url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ApiService.CREATE_POST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log('[API] business-post/create response status', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to create business plan';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        const json = await response.json();
        console.log('[API] business-post/create success', !!json?.success, 'post_id:', json?.data?.post_id ?? json?.post_id);
        return json;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err?.name === 'AbortError') {
          throw new Error('Request timed out. Check your connection and try again.');
        }
        throw err;
      }
    }

    // No files: send JSON to same endpoint so backend uses full business-post logic
    headers['Content-Type'] = 'application/json';
    console.log('[API] POST business-post/create (JSON)', url);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(planData),
    });
    console.log('[API] business-post/create response status', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to create business plan';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    const json = await response.json();
    console.log('[API] business-post/create success', !!json?.success, 'post_id:', json?.data?.post_id ?? json?.post_id);
    return json;
  }

  async getBusinessPlan(planId: string) {
    return this.request<any>(`/plan/${planId}`, {
      method: 'GET',
    });
  }

  async updatePost(accessToken: string, post_id: string, postData: FormData | any) {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
    };

    // If FormData, don't set Content-Type (browser will set it with boundary)
    if (!(postData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ApiService.CREATE_POST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/post/update/${post_id}`, {
        method: 'PUT',
        headers,
        body: postData instanceof FormData ? postData : JSON.stringify(postData),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.message || 'Failed to update post');
        (error as any).statusCode = response.status;
        throw error;
      }
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.');
      }
      throw err;
    }
  }

  async updateBusinessPlan(accessToken: string, post_id: string, planData: any, formData?: FormData) {
    // If FormData is provided, use it (for file uploads)
    if (formData) {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
      };
      const url = `${this.baseUrl}/business-post/update/${post_id}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ApiService.CREATE_POST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers,
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to update business plan';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return await response.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err?.name === 'AbortError') {
          throw new Error('Request timed out. Check your connection and try again.');
        }
        throw err;
      }
    }
    
    // Otherwise use JSON
    return this.request<any>(`/business-post/update/${post_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(planData),
    });
  }

  /** Cancel or delete plan. For business: refundPaidTickets true = cancel event (refund), false = delete only (no refund). */
  async cancelPlan(accessToken: string, plan_id: string, planType: 'regular' | 'business', refundPaidTickets: boolean = true) {
    const endpoint = planType === 'business'
      ? `/business-post/update/${plan_id}`
      : `/post/update/${plan_id}`;
    const body: { post_status: string; refund_paid_tickets?: boolean } = { post_status: 'deleted' };
    if (planType === 'business') {
      body.refund_paid_tickets = refundPaidTickets;
    }
    return this.request<any>(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
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
  async createRepost(
    original_plan_id: string,
    repost_author_id: string,
    options?: { added_content?: string; repost_title?: string; repost_description?: string }
  ) {
    return this.request<{ repost_id: string }>('/repost/create', {
      method: 'POST',
      body: JSON.stringify({
        original_plan_id,
        repost_author_id,
        added_content: options?.added_content,
        repost_title: options?.repost_title,
        repost_description: options?.repost_description,
      }),
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

  async getChatUnreadCount(user_id: string) {
    return this.request<{ unread_count: number }>(`/chat/unread-counter?user_id=${user_id}`, {
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
    const res = await this.request<{
      their_plans: any[];
      my_plans: any[];
      groups: any[];
    }>(`/chat/lists?user_id=${user_id}`, {
      method: 'GET',
    });
    const groups = res?.data?.groups ?? [];
    console.log('[API] getChatLists:', { user_id, groupsCount: groups.length, groupIds: groups.map((g: any) => g?.group_id) });
    return res;
  }

  async getGroupDetails(group_id: string) {
    return this.request<any>(`/chat/group/details/${group_id}`, {
      method: 'GET',
    });
  }

  async setGroupDriveLink(group_id: string, user_id: string, drive_link: string | null) {
    return this.request<any>('/chat/group/drive-link', {
      method: 'POST',
      body: JSON.stringify({ group_id, user_id, drive_link }),
    });
  }

  async sendMessage(group_id: string, user_id: string, type: 'text' | 'image' | 'poll' | 'plan', content: any) {
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

  /** Notify the group that the current user is typing. Backend can expose this to others via getMessages or a typing endpoint. */
  async sendTyping(group_id: string, user_id: string) {
    return this.request<void>('/chat/typing', {
      method: 'POST',
      body: JSON.stringify({ group_id, user_id }),
    });
  }

  async addMessageReaction(message_id: string, user_id: string, emoji_type: string) {
    return this.request<any>('/chat/message/reaction', {
      method: 'POST',
      body: JSON.stringify({ message_id, user_id, emoji_type }),
    });
  }

  async removeMessageReaction(message_id: string, user_id: string, emoji_type: string) {
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

  async getPlanGroups(plan_id: string, user_id: string) {
    return this.request<{
      has_active_group: boolean;
      latest_group: {
        group_id: string;
        group_name: string | null;
        members: string[];
        created_at: string;
      } | null;
      total_active_groups: number;
    }>(`/chat/plan/groups?plan_id=${plan_id}&user_id=${user_id}`, {
      method: 'GET',
    });
  }

  /** Get or create the current (business) user's announcement group. Returns { group_id }. */
  async getOrCreateAnnouncementGroup() {
    const res = await this.request<{ group_id: string }>('/chat/announcement-group/get-or-create', {
      method: 'GET',
    });
    console.log('[API] getOrCreateAnnouncementGroup:', res?.data ? { group_id: res.data.group_id } : res);
    return res;
  }

  // Ticket APIs
  async registerForEvent(plan_id: string, user_id: string, pass_id?: string, message?: string) {
    return this.request<any>('/ticket/register', {
      method: 'POST',
      body: JSON.stringify({ plan_id, user_id, pass_id, message }),
    });
  }

  async getUserTicket(plan_id: string, user_id: string) {
    return this.request<any>(`/ticket/${plan_id}/${user_id}`, {
      method: 'GET',
    });
  }

  /** Returns true if the user already has a ticket (any type) for this plan; false if not registered. */
  async hasTicketForPlan(plan_id: string, user_id: string): Promise<boolean> {
    try {
      await this.getUserTicket(plan_id, user_id);
      return true;
    } catch (e: any) {
      if (e?.statusCode === 404) return false;
      throw e;
    }
  }

  async getTicketsByUser(user_id: string) {
    return this.request<{ tickets: Array<{
      ticket_id: string;
      ticket_number: string;
      status: string;
      price_paid: number;
      created_at: string;
      registration_status: string | null;
      plan: { plan_id: string; title: string; date?: string; time?: string; location_text?: string; media?: any[]; ticket_image?: string } | null;
    }> }>(`/ticket/user/${user_id}`, {
      method: 'GET',
    });
  }

  async getTicketById(ticket_id: string) {
    return this.request<any>(`/ticket/by-id/${ticket_id}`, {
      method: 'GET',
    });
  }

  async scanQRCode(qr_code_hash: string, scanner_user_id: string) {
    return this.request<any>('/ticket/scan', {
      method: 'POST',
      body: JSON.stringify({ qr_code_hash, scanner_user_id }),
    });
  }

  async getAttendeeList(plan_id: string, user_id: string) {
    return this.request<any>(`/ticket/attendees/${plan_id}?user_id=${user_id}`, {
      method: 'GET',
    });
  }

  async getGuestList(plan_id: string) {
    return this.request<{
      guests: Array<{ user_id: string; name: string; profile_image: string | null; bio?: string; is_returning?: boolean }>;
      total: number;
    }>(`/ticket/guest-list/${plan_id}`, { method: 'GET' });
  }

  async manualCheckIn(registration_id: string, user_id: string, action: 'checkin' | 'checkout') {
    return this.request<any>('/ticket/checkin', {
      method: 'POST',
      body: JSON.stringify({ registration_id, user_id, action }),
    });
  }

  async getEventAnalytics(plan_id: string) {
    return this.request<any>(`/analytics/business/event/${plan_id}`, { method: 'GET' });
  }

  async getBusinessOverallAnalytics(months: number = 1) {
    return this.request<any>(`/analytics/business/overall?months=${months}`, { method: 'GET' });
  }

  // Form APIs
  async getForm(formId: string) {
    return this.request<any>(`/form/${formId}`, { method: 'GET' });
  }

  async submitFormResponse(body: Record<string, unknown>) {
    return this.request<any>('/form/response/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getFormResponse(registrationId: string) {
    return this.request<any>(`/form/response/by-registration/${registrationId}`, {
      method: 'GET',
    });
  }

  async getPlanFormResponses(planId: string, formId?: string) {
    const query = formId ? `?formId=${formId}` : '';
    return this.request<any>(`/form/responses/by-plan/${planId}${query}`, {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();

