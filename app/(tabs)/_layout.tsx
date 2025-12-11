import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarContainer}>
      
      {/* 1. The White Pill Navigation (Matches Image 1) */}
      <BlurView intensity={80} tint="light" style={styles.pillContainer}>
        {state.routes
          .filter((route: any) => route.name !== 'createPost') // Filter out createPost from pill navigation
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
              <Ionicons 
                name={iconName} 
                size={26} 
                color={isFocused ? '#FFF' : '#222'} 
              />
            </TouchableOpacity>
          );
          })}
      </BlurView>

      {/* 2. The Separate "+" Button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => navigation.navigate('createPost')}
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 30, // Floats above bottom
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    zIndex: 100, // Ensure it sits on top of the gradient
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