import SwipeableEventCard from '@/components/SwipeableEventCard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';

function ProfileAvatar() {
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (user?.session_id && !currentUser) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [user, currentUser, dispatch]);

  return (
    <Image
      source={{
        uri: currentUser?.profile_image || 'https://via.placeholder.com/44',
      }}
      style={styles.headerAvatar}
    />
  );
}

// ... Mock Data (EVENTS, FILTERS) same as before ... 
const EVENTS = [
  { id: 1, user: { id: '1', name: 'Shreya Aggarwal', avatar: 'https://i.pravatar.cc/150?u=shreya', time: 'Thursday, 2:37pm' }, event: { title: 'Spontaneous ooty trip?', description: 'Leaving to Ooty tomorrow...', tags: ['Weekend', 'Evening', 'Hitchhiking'], image: 'https://picsum.photos/id/1011/200/300' }},
  { id: 2, user: { id: '2', name: 'Aman Mehra', avatar: 'https://i.pravatar.cc/150?u=aman', time: 'Thursday, 4:00pm' }, event: { title: "Let's go for cycling today!", description: 'Leaving to Ooty tomorrow...', tags: ['Weekend', 'Evening', 'Cycling'], image: 'https://picsum.photos/id/1025/200/300' }}
];
const FILTERS = ['Clubs', 'Today', 'Music', 'Cafe', 'Comedy', 'Sports'];

export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState('Clubs');
  const router = useRouter();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        
        {/* 1. TOP GRADIENT (Purple -> Transparent) */}
        <LinearGradient
          colors={['#4A3B69', '#6B5B8E', '#F2F2F7']} 
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }} // Stops earlier so it doesn't cover whole screen
          style={styles.topGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.locationContainer}>
                <View style={styles.locationIconBg}>
                  <Ionicons name="location-sharp" size={18} color="#FFF" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.locationTitle}>Indiranagar</Text>
                    <Ionicons name="chevron-down" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                  <Text style={styles.locationSubtitle}>Bengaluru</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/profile')}>
                <ProfileAvatar />
              </TouchableOpacity>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {FILTERS.map((filter, index) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity key={index} style={isActive ? styles.activeFilterChip : styles.filterChip} onPress={() => setActiveFilter(filter)}>
                    <Text style={isActive ? styles.activeFilterText : styles.filterText}>{filter}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
               {/* ... (Same summary card code as before) ... */}
               <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>vybeme.weekly</Text>
                <TouchableOpacity><Ionicons name="close" size={20} color="#888" /></TouchableOpacity>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}><Text style={styles.statNumber}>67</Text><Text style={styles.statLabel}>#plans</Text></View>
                <View style={styles.statBox}><Text style={styles.statNumber}>120</Text><Text style={styles.statLabel}>#interactions</Text></View>
              </View>
              <Text style={styles.avatarsLabel}>Top 10 Most Interacted Plans</Text>
              <View style={styles.avatarRow}>
                {[1, 2, 3, 4, 5].map((_, i) => (
                  <Image key={i} source={{ uri: `https://i.pravatar.cc/150?u=${i + 10}` }} style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -12, zIndex: 10-i }]} />
                ))}
              </View>
              <TouchableOpacity style={styles.createBtn}>
                <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.createBtnText}>Create your own plan</Text>
              </TouchableOpacity>
            </View>

            {/* Feed */}
            <View style={styles.feed}>
              {EVENTS.map(item => (
                <SwipeableEventCard 
                  key={item.id} 
                  user={item.user} 
                  event={item.event}
                  onUserPress={(userId: string) => router.push({ pathname: '/otherProfile/[id]', params: { id: userId } } as any)}
                />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* 2. BOTTOM GRADIENT (Transparent -> Dark Fade) */}
        {/* This sits absolutely at the bottom to create the vignette behind tabs */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.2)']} 
          style={styles.bottomGradient}
          pointerEvents="none" // Allows touching through the gradient
        />
        
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', 
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 400,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150, // Height of the fade at the bottom
    zIndex: 1, // Above content, below tabs (Tabs are zIndex 100)
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingBottom: 130, // Ensure content isn't hidden by bottom tabs
    paddingTop: 10,
  },
  // ... Header, Filter, and Card Styles remain exactly as previously defined ...
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24 },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  locationIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  locationTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  locationSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  filterScroll: { marginBottom: 24 },
  filterContent: { paddingHorizontal: 20, gap: 12 },
  activeFilterChip: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  activeFilterText: { color: '#FFF', fontWeight: '600' },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  filterText: { color: '#333', fontWeight: '600' },
  summaryCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 32, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  summaryTitle: { fontSize: 20, fontWeight: '900', color: '#1C1C1E' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#1C1C1E' },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  avatarsLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#333' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#FFF' },
  createBtn: { backgroundColor: '#1C1C1E', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 30 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  feed: { paddingBottom: 20 },
});