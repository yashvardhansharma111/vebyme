import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TagProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  active?: boolean;
  style?: any;
}

export default function Tag({ label, icon, onPress, active = false, style }: TagProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const TagContent = (
    <View style={[styles.tag, active && styles.tagActive, style]}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={12} 
          color={active ? '#333333' : '#9A9A9A'} 
          style={styles.icon}
        />
      )}
      <Text style={[styles.tagText, active && styles.tagTextActive]}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {TagContent}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return TagContent;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 999,
    height: 27,
    paddingHorizontal: 12,
    // Subtle inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 0.5,
  },
  tagActive: {
    backgroundColor: '#E6E6E6',
  },
  icon: {
    marginRight: 6,
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#6B6B6B',
    letterSpacing: 0.2,
  },
  tagTextActive: {
    color: '#333333',
  },
});
