import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUnreadCount } from '@/store/slices/notificationsSlice';
import { fetchChatUnreadCount } from '@/store/slices/chatSlice';

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { currentUser } = useAppSelector((state) => state.profile);
  const isBusinessUser = currentUser?.is_business === true;
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);
  const chatUnreadCount = useAppSelector((state) => state.chat.unreadCount);

  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      dispatch(fetchUnreadCount(user.user_id));
      dispatch(fetchChatUnreadCount(user.user_id));
    }
  }, [dispatch, isAuthenticated, user?.user_id]);

  // Hide tab bar when on createPost or createBusinessPost screen
  const currentRoute = state.routes[state.index];
  if (currentRoute.name === 'createPost' || currentRoute.name === 'createBusinessPost') {
    return null;
  }

  return (
    <View style={styles.tabBarContainer}>
      
      {/* 1. The White Pill Navigation (Matches Image 1) */}
      <BlurView intensity={80} tint="light" style={styles.pillContainer}>
        {state.routes
          .filter((route: any) => route.name !== 'createPost' && route.name !== 'createBusinessPost') // Filter out create screens from pill
          .map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            // Find the actual index in the full routes array
            const actualIndex = state.routes.findIndex((r: any) => r.key === route.key);
            const isFocused = state.index === actualIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

          // Define Icons based on your image
          let iconName: any = 'compass-outline';
          if (route.name === 'index') iconName = isFocused ? 'compass' : 'compass-outline'; // Home/Compass
          if (route.name === 'notifications') iconName = isFocused ? 'heart' : 'heart-outline';   // Notifications/Heart
          if (route.name === 'chat') iconName = isFocused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'; // Chat

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isFocused ? styles.tabItemFocused : null]}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={iconName}
                  size={26}
                  color={isFocused ? '#FFF' : '#222'}
                />
                {route.name === 'notifications' && unreadCount > 0 && (
                  <View style={styles.notificationsBadge}>
                    <Text style={styles.notificationsBadgeText} numberOfLines={1}>
                      {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
                {route.name === 'chat' && chatUnreadCount > 0 && (
                  <View style={styles.notificationsBadge}>
                    <Text style={styles.notificationsBadgeText} numberOfLines={1}>
                      {chatUnreadCount > 99 ? '99+' : String(chatUnreadCount)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
          })}
      </BlurView>

      {/* 2. The Separate "+" Button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => {
          // Business users go to createBusinessPost, regular users go to createPost
          if (isBusinessUser) {
            navigation.navigate('createBusinessPost');
          } else {
            navigation.navigate('createPost');
          }
        }}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="createPost" options={{ title: 'Create Post', href: null }} />
      <Tabs.Screen name="createBusinessPost" options={{ title: 'Create Business Post', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Translucent white for frosted glass effect
    borderRadius: 40,
    height: 70,
    alignItems: 'center',
    flex: 1,
    marginRight: 15,
    justifyContent: 'space-evenly', // Even spacing
    overflow: 'hidden',
    // Strong shadow for the "floating" look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsBadge: {
    position: 'absolute',
    top: -10,
    right: -14,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabItemFocused: {
    backgroundColor: '#1C1C1E', // Black circle for active state
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1C1C1E', // Dark/Black button
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  }
});