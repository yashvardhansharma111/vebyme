import React, { useState } from 'react';
import { Image, ImageStyle, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  style?: ImageStyle | ImageStyle[];
  showBorder?: boolean;
  borderColor?: string;
}

export default function Avatar({ 
  uri, 
  size = 44, 
  style, 
  showBorder = false,
  borderColor = 'rgba(255,255,255,0.5)'
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const hasValidUri = uri && uri.trim() !== '' && !imageError;

  const avatarStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#E5E5E5',
    ...(showBorder && {
      borderWidth: 2,
      borderColor: borderColor,
    }),
  };

  return (
    <View style={[avatarStyle, { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, style]}>
      {!hasValidUri ? (
        <Ionicons 
          name="person" 
          size={size * 0.6} 
          color="#999" 
        />
      ) : (
        <Image
          source={{ uri: uri! }}
          style={[avatarStyle, { position: 'absolute' }]}
          onError={() => {
            setImageError(true);
          }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

