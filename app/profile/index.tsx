import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser, fetchUserStats } from '@/store/slices/profileSlice';
import { logout } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/services/api';
import { BlurView } from 'expo-blur';
import Avatar from '@/components/Avatar';

export default function MyProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser, isLoading } = useAppSelector((state) => state.profile);

  // State for Custom Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (user?.session_id) {
      dispatch(fetchCurrentUser(user.session_id));
      if (user.user_id) {
        dispatch(fetchUserStats(user.user_id));
      }
    }
  }, [dispatch, user]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await dispatch(logout());
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    if (!user?.session_id) return;
    try {
      await apiService.deleteUser(user.session_id);
      setShowDeleteModal(false);
      await dispatch(logout());
      router.replace('/login');
    } catch (error: any) {
      console.error(error); 
    }
  };

  if (isLoading && !currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1C1C1E" />
      </View>
    );
  }

  if (!user?.session_id) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to view your profile.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.retryButtonText}>Log in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isLoading && !currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Could not load profile.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => user?.session_id && dispatch(fetchCurrentUser(user.session_id))}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* --- HEADER IMAGE SECTION --- */}
        <ImageBackground
          source={currentUser?.profile_image ? { uri: currentUser.profile_image } : { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }}
          style={[styles.headerBackground, { paddingTop: insets.top, backgroundColor: '#E5E5E5' }]}
          resizeMode="cover"
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* --- PROFILE CARD --- */}
        <View style={styles.profileCardWrapper}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Avatar
                uri={currentUser?.profile_image}
                size={100}
                style={styles.avatar}
              />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{currentUser?.name || 'User'}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#1C1C1E" />
              </View>
              <Text style={styles.bio}>{currentUser?.bio || 'No bio yet'}</Text>
            </View>

            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={() => currentUser?.user_id && router.push((`/profile/${currentUser.user_id}`) as any)}
              disabled={!currentUser?.user_id}
            >
              <Ionicons name="person-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.viewProfileText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- MENU SECTIONS --- */}
        <View style={styles.menuContainer}>
          
          {/* Group 1: Plans, Saved, Tickets & Passes */}
          <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/tickets-passes')}>
              <Ionicons name="ticket-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Tickets and Passes</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/your-plans')}>
              <Ionicons name="calendar-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Your Plans</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/saved-plans')}>
              <Ionicons name="bookmark-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Saved Plans</Text>
            </TouchableOpacity>
            {currentUser?.is_business && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => router.push('/analytics/overall')}
                >
                  <Ionicons name="stats-chart-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Analytics</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => router.push('/(tabs)/createBusinessPost')}
                >
                  <Ionicons name="business-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Create Business Post</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Group 2: Preferences */}
          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/location-preference')}>
              <Ionicons name="location-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Location Preferences</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/manage-socials')}>
              <Ionicons name="logo-instagram" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Manage Socials</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/manage-interests')}>
              <Ionicons name="options-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Manage Interests</Text>
            </TouchableOpacity>
          </View>

          {/* Group 3: Contact */}
          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="headset-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Contact Us</Text>
            </TouchableOpacity>
          </View>

           {/* Group 4: Actions */}
           <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowDeleteModal(true)}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete account</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowLogoutModal(true)}>
              <Ionicons name="log-out-outline" size={22} color="#1C1C1E" style={styles.menuIcon} />
              <Text style={styles.menuText}>Log out</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* --- DELETE ACCOUNT MODAL WITH BLUR --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        {/* Blur View acts as the overlay background */}
        <BlurView intensity={25} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>You're about to delete your account !</Text>
            <Text style={styles.modalDescription}>
              Deleting your account will permanently remove all your data.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.deleteActionButton} 
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteActionText}>Delete Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* --- LOGOUT MODAL WITH BLUR --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        {/* Blur View acts as the overlay background */}
        <BlurView intensity={25} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>You're about to Logout !</Text>
            <Text style={styles.modalDescription}>
              You can log back in anytime using your email or phone number.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.logoutActionButton} 
                onPress={handleLogout}
              >
                <Text style={styles.logoutActionText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Header
  headerBackground: {
    width: '100%',
    height: 240,
    justifyContent: 'flex-start',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(242,242,242,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  // Profile Card
  profileCardWrapper: {
    paddingHorizontal: 16,
    marginTop: -60,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    marginTop: -50,
    marginBottom: 12,
    borderRadius: 50,
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
  },
  viewProfileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Menu
  menuContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    width: '100%',
  },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // No backgroundColor here because BlurView handles the tint
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'left',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'left',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  // Delete Specific
  deleteActionButton: {
    flex: 1,
    backgroundColor: '#FFEEEE', // Light red
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: '#FF3B30', // Red Text
    fontWeight: '700',
    fontSize: 14,
  },
  // Logout Specific
  logoutActionButton: {
    flex: 1,
    backgroundColor: '#FFEEEE', // Light red
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutActionText: {
    color: '#FF3B30', // Red Text
    fontWeight: '700',
    fontSize: 14,
  },
  // Common Cancel
  cancelButton: {
    flex: 1,
    backgroundColor: '#333333', // Dark Grey
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});