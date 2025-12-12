import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SavedPlan {
  post_id: string;
  user_id: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type: string }>;
  tags?: string[];
  timestamp: string;
  location?: any;
}

export default function SavedPlansScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    if (!user?.user_id) return;
    
    try {
      setLoading(true);
      const response = await apiService.getSavedPosts(user.user_id);
      if (response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error loading saved plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Plans</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No saved plans</Text>
            <Text style={styles.emptySubtext}>Save plans you're interested in!</Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View key={plan.post_id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.userInfo}>
                  <Image
                    source={{ uri: `https://via.placeholder.com/40?text=${plan.user_id?.charAt(0) || 'U'}` }}
                    style={styles.avatar}
                  />
                  <View>
                    <Text style={styles.userName}>User {plan.user_id?.slice(-4) || ''}</Text>
                    <Text style={styles.timestamp}>
                      {formatDate(plan.timestamp)}, {formatTime(plan.timestamp)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planDescription} numberOfLines={3}>
                {plan.description}
              </Text>

              {plan.tags && plan.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {plan.tags.slice(0, 3).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {plan.media && plan.media.length > 0 && (
                <Image
                  source={{ uri: plan.media[0].url }}
                  style={styles.planImage}
                  resizeMode="cover"
                />
              )}

              <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>

              <View style={styles.interactionRow}>
                <TouchableOpacity style={styles.interactionButton}>
                  <Ionicons name="heart-outline" size={20} color={Colors.light.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.interactionButton}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.light.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.interactionButton}>
                  <Ionicons name="share-outline" size={20} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  planCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  planHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: Colors.light.primary,
  },
  planImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  joinButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.md,
    padding: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  interactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  interactionButton: {
    padding: 8,
  },
});

