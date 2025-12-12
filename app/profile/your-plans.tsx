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
import { useRouter } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Plan {
  plan_id: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type: string }>;
  category_sub?: string[];
  location_text?: string;
  created_at: string;
  is_repost?: boolean;
}

export default function YourPlansScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    if (!user?.user_id) return;
    
    try {
      setLoading(true);
      const response = await apiService.getUserPlans(user.user_id);
      if (response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
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
        <Text style={styles.headerTitle}>Your Plans</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No plans yet</Text>
            <Text style={styles.emptySubtext}>Create your first plan to get started!</Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View key={plan.plan_id} style={styles.planCard}>
              {plan.is_repost && (
                <View style={styles.repostLabel}>
                  <Text style={styles.repostText}>You Reposted</Text>
                </View>
              )}
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planDescription} numberOfLines={3}>
                {plan.description}
              </Text>
              {plan.location_text && (
                <Text style={styles.planLocation}>{plan.location_text}</Text>
              )}
              {plan.category_sub && plan.category_sub.length > 0 && (
                <View style={styles.tagsContainer}>
                  {plan.category_sub.slice(0, 3).map((tag, index) => (
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
  repostLabel: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.secondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  repostText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
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
    marginBottom: 8,
    lineHeight: 20,
  },
  planLocation: {
    fontSize: 12,
    color: Colors.light.primary,
    marginBottom: 12,
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
    marginTop: 8,
  },
});

