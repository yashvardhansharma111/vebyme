import React, { useState } from 'react';
import { Image, ImageStyle, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Default avatar image when user has no profile image (visible placeholder) */
export const DEFAULT_AVATAR_URI = 'https://ui-avatars.com/api/?name=User&background=E5E5E5&color=8E8E93&size=256';

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
  borderColor = 'rgba(255,255,255,0.5)',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [defaultImageError, setDefaultImageError] = useState(false);

  const hasValidUri = uri && uri.trim() !== '' && !imageError;
  const useDefaultImage = !hasValidUri && !defaultImageError;

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
      {hasValidUri ? (
        <Image
          source={{ uri: uri! }}
          style={[avatarStyle, { position: 'absolute' }]}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      ) : useDefaultImage ? (
        <Image
          source={{ uri: DEFAULT_AVATAR_URI }}
          style={[avatarStyle, { position: 'absolute' }]}
          onError={() => setDefaultImageError(true)}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name="person" size={size * 0.6} color="#8E8E93" />
      )}
    </View>
  );
}

