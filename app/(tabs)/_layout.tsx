import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarContainer}>
      
      {/* 1. The White Pill Navigation (Matches Image 1) */}
      <View style={styles.pillContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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
          if (route.name === 'explore') iconName = isFocused ? 'heart' : 'heart-outline';   // Saved/Heart
          if (route.name === 'messages') iconName = isFocused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'; // Chat

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
      </View>

      {/* 2. The Separate "+" Button */}
      <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Add')}>
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
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
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
    backgroundColor: '#FFF', // Solid White as per image
    borderRadius: 40,
    height: 70,
    alignItems: 'center',
    flex: 1,
    marginRight: 15,
    justifyContent: 'space-evenly', // Even spacing
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