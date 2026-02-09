import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { apiService } from '@/services/api';

export type Guest = {
  user_id: string;
  name: string;
  profile_image: string | null;
  bio: string;
};

interface GuestListModalProps {
  visible: boolean;
  onClose: () => void;
  planId: string;
  onRegisterPress?: () => void;
}

export default function GuestListModal({
  visible,
  onClose,
  planId,
  onRegisterPress,
}: GuestListModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuestPress = (userId: string) => {
    onClose();
    router.push({ pathname: '/profile/[userId]', params: { userId } } as any);
  };

  useEffect(() => {
    if (visible && planId) {
      setError(null);
      setLoading(true);
      apiService
        .getGuestList(planId)
        .then((res) => {
          const data = res?.data ?? res;
          const list = data?.guests ?? [];
          setGuests(Array.isArray(list) ? list : []);
        })
        .catch((e: any) => {
          setError(e?.message || 'Failed to load guest list');
          setGuests([]);
        })
        .finally(() => setLoading(false));
    }
  }, [visible, planId]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 24,
            },
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity
            style={styles.grabHandle}
            onPress={onClose}
            activeOpacity={1}
          />
          <Text style={styles.title}>Guest List</Text>
          <View style={styles.separator} />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#1C1C1E" />
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {guests.length === 0 ? (
                <Text style={styles.emptyText}>No one has joined yet.</Text>
              ) : (
                guests.map((guest) => (
                  <TouchableOpacity
                    key={guest.user_id}
                    style={styles.guestRow}
                    onPress={() => handleGuestPress(guest.user_id)}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={guest.profile_image} size={44} />
                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName} numberOfLines={1}>
                        {guest.name || 'Unknown'}
                      </Text>
                      {guest.bio ? (
                        <Text
                          style={styles.guestBio}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {guest.bio}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {onRegisterPress && (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                onClose();
                onRegisterPress();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '80%',
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginBottom: 16,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#666',
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 24,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  guestInfo: {
    marginLeft: 14,
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  guestBio: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  registerButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
