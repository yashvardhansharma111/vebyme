import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * For physical devices, you need to use your computer's IP address instead of localhost.
 * To find your IP address:
 * - Windows: Run `ipconfig` in CMD and look for IPv4 Address
 * - Mac/Linux: Run `ifconfig` or `ip addr` and look for your local network IP
 * 
 * Example: If your computer's IP is 192.168.1.100, change PHYSICAL_DEVICE_IP below
 */

// Change this to your computer's IP address when testing on physical devices
const PHYSICAL_DEVICE_IP = '192.168.1.100'; // Update this with your actual IP

// Set to true if testing on a physical device
const USE_PHYSICAL_DEVICE_IP = false;

export const getApiBaseURL = (): string => {
  // For web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api';
  }
  
  // For physical devices, use the computer's IP address
  if (USE_PHYSICAL_DEVICE_IP) {
    return `http://${PHYSICAL_DEVICE_IP}:8000/api`;
  }
  
  // For Android emulator, use 10.0.2.2 (special IP that maps to host machine's localhost)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api';
  }
  
  // For iOS simulator, localhost works
  if (Platform.OS === 'ios') {
    return 'http://localhost:8000/api';
  }
  
  // Default fallback
  return 'http://localhost:8000/api';
};

