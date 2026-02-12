import SwipeableEventCard from '@/components/SwipeableEventCard';
import { apiService } from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tag options based on the screenshot
const DAY_TAGS = ['Today', 'Tomorrow', 'Weekend'];
const TIME_TAGS = ['Morning', 'Evening', 'Night'];
const CATEGORY_TAGS = ['Music', 'Cafe', 'Clubs'];
const SUB_CATEGORY_TAGS: { [key: string]: string[] } = {
  Music: ['Rave', 'Concert', 'DJ', 'Karaoke', 'Rooftop'],
  Cafe: ['Coffee', 'Brunch', 'Dessert', 'Work', 'Study'],
  Clubs: ['Nightclub', 'Bar', 'Pub', 'Lounge', 'Dance'],
};

export default function CreatePostScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

  // Form state
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [isWomenOnly, setIsWomenOnly] = useState(false);
  const [postType, setPostType] = useState<'individual' | 'group'>('individual');
  const [numPeople, setNumPeople] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.session_id && !currentUser) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [user, currentUser, dispatch]);

  // Redirect business users to business post creation
  useEffect(() => {
    if (currentUser?.is_business) {
      router.replace('/(tabs)/createBusinessPost');
    }
  }, [currentUser, router]);

  // Load plan data from AsyncStorage if available (for duplicate/edit)
  useEffect(() => {
    const loadPlanData = async () => {
      try {
        const planDataStr = await AsyncStorage.getItem('planForCreation');
        if (planDataStr) {
          const planData = JSON.parse(planDataStr);
          const isEdit = planData.mode === 'edit';
          
          setEditMode(isEdit);
          if (isEdit) {
            setPlanId(planData.plan_id);
          }

          // Pre-fill form fields
          if (planData.title) setTitle(planData.title);
          if (planData.description) setDescription(planData.description);
          if (planData.external_link) setExternalLink(planData.external_link);
          if (planData.is_women_only) setIsWomenOnly(planData.is_women_only);
          if (planData.post_type) setPostType(planData.post_type);
          if (planData.num_people) setNumPeople(planData.num_people.toString());
          if (planData.category_main) setSelectedCategory(planData.category_main);
          if (planData.category_sub && planData.category_sub.length > 0) {
            setSelectedSubCategory(planData.category_sub[0]);
          }
          
          // Handle temporal tags
          if (planData.temporal_tags && planData.temporal_tags.length > 0) {
            planData.temporal_tags.forEach((tag: string) => {
              if (DAY_TAGS.includes(tag)) setSelectedDay(tag);
              if (TIME_TAGS.includes(tag)) setSelectedTime(tag);
            });
          }

          // Handle media
          if (planData.media && planData.media.length > 0) {
            const mediaItems = planData.media.map((item: any) => ({
              uri: item.url,
              type: item.type === 'video' ? ('video' as const) : ('image' as const),
            }));
            setMedia(mediaItems);
          }

          // Clear AsyncStorage after loading
          await AsyncStorage.removeItem('planForCreation');
        }
      } catch (error) {
        console.error('Error loading plan data:', error);
      }
    };

    loadPlanData();
  }, []);

  const handleAddMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 2 - media.length,
      });

      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? ('video' as const) : ('image' as const),
        }));
        setMedia([...media, ...newMedia]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const formatPreviewData = () => {
    const tags: string[] = [];
    if (selectedDay) tags.push(selectedDay);
    if (selectedTime) tags.push(selectedTime);
    if (selectedSubCategory) tags.push(selectedSubCategory);
    else if (selectedCategory) tags.push(selectedCategory);

    return {
      user: {
        id: currentUser?.user_id || user?.user_id || '',
        name: currentUser?.name || 'You',
        avatar: currentUser?.profile_image || 'https://via.placeholder.com/44',
        time: new Date().toLocaleDateString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
      },
      event: {
        title: title || 'Untitled Post',
        description: description || 'No description',
        tags: tags.length > 0 ? tags : ['General'],
        image: media.length > 0 ? media[0].uri : 'https://picsum.photos/id/1011/200/300',
      },
    };
  };

  const handlePreview = () => {
    if (!description.trim()) {
      Alert.alert('Validation', 'Please enter a description');
      return;
    }
    setShowPreview(true);
  };

  const handlePost = async () => {
    if (!description.trim()) {
      Alert.alert('Validation', 'Please enter a description');
      return;
    }

    if (!user?.access_token || !user?.user_id) {
      Alert.alert('Error', 'Please login to create a post');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Add text fields
      formData.append('user_id', user.user_id);
      formData.append('description', description);
      // Title is required by backend, use description as fallback if not provided
      formData.append('title', title || description.substring(0, 30) || 'New Post');
      if (externalLink) formData.append('external_link', externalLink);
      formData.append('is_women_only', isWomenOnly.toString());
      formData.append('post_type', postType);
      if (postType === 'group' && numPeople) {
        formData.append('num_people', numPeople);
      }

      // Add tags - temporal_tags as array
      const temporalTags: string[] = [];
      if (selectedDay) temporalTags.push(selectedDay);
      if (selectedTime) temporalTags.push(selectedTime);
      if (temporalTags.length > 0) {
        temporalTags.forEach((tag) => {
          formData.append('temporal_tags', tag);
        });
      }

      // Add category
      if (selectedCategory) {
        formData.append('category_main', selectedCategory.toLowerCase());
        
        // category_sub as array
        const categorySubs: string[] = [];
        if (selectedSubCategory) {
          categorySubs.push(selectedSubCategory.toLowerCase());
        } else {
          categorySubs.push(selectedCategory.toLowerCase());
        }
        categorySubs.forEach((sub) => {
          formData.append('category_sub', sub);
        });
      }

      // Add media files
      media.forEach((item, index) => {
        const fileUri = item.uri;
        const fileName = fileUri.split('/').pop() || `media_${index}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
        const fileType = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
        
        // React Native FormData format
        // @ts-ignore - FormData type issue for React Native
        formData.append('files', {
          uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
          name: fileName,
          type: fileType,
        } as any);
      });

      let response;
      if (editMode && planId) {
        // Update existing post
        response = await apiService.updatePost(user.access_token, planId, formData);
        if (response.success) {
          Alert.alert('Success', 'Post updated successfully!', [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setDescription('');
                setTitle('');
                setExternalLink('');
                setIsWomenOnly(false);
                setPostType('individual');
                setNumPeople('');
                setSelectedDay('');
                setSelectedTime('');
                setSelectedCategory('');
                setSelectedSubCategory('');
                setMedia([]);
                setShowPreview(false);
                setEditMode(false);
                setPlanId(null);
                // Navigate back
                router.back();
              },
            },
          ]);
        }
      } else {
        // Create new post
        response = await apiService.createPost(user.access_token, formData);
        if (response.success) {
          Alert.alert('Success', 'Post created successfully!', [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setDescription('');
                setTitle('');
                setExternalLink('');
                setIsWomenOnly(false);
                setPostType('individual');
                setNumPeople('');
                setSelectedDay('');
                setSelectedTime('');
                setSelectedCategory('');
                setSelectedSubCategory('');
                setMedia([]);
                setShowPreview(false);
                // Navigate back or to home
                router.back();
              },
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Error creating/updating post:', error);
      Alert.alert('Error', error.message || `Failed to ${editMode ? 'update' : 'create'} post`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showPreview) {
    const previewData = formatPreviewData();
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Post</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.previewContainer}>
            <Text style={styles.previewText}>User will see your post like this!</Text>
            <View style={styles.previewCardWrapper}>
              <SwipeableEventCard
                user={previewData.user}
                event={previewData.event}
                onUserPress={() => {}}
              />
            </View>
          </ScrollView>

          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.postButton]}
              onPress={handlePost}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.postButtonText}>{editMode ? 'Update' : 'Post'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editMode ? 'Edit Post' : 'New Post'}</Text>
            <View style={{ width: 24 }} />
          </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title – top */}
          <View style={styles.section}>
            <Text style={styles.label}>Title (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a title..."
              value={title}
              onChangeText={setTitle}
              maxLength={30}
            />
            <Text style={styles.charCount}>{title.length}/30</Text>
          </View>

          {/* Description – below title */}
          <View style={styles.section}>
            <Text style={styles.label}>What are you up to?</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Share your plan..."
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* Media */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.addMediaButton} onPress={handleAddMedia}>
              <Ionicons name="add" size={24} color="#666" />
              <Text style={styles.addMediaText}>Add Media</Text>
            </TouchableOpacity>
            {media.length > 0 && (
              <View style={styles.mediaContainer}>
                {media.map((item, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => removeMedia(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
                {media.length < 2 && (
                  <TouchableOpacity style={styles.addMoreMedia} onPress={handleAddMedia}>
                    <Ionicons name="add" size={20} color="#666" />
                  </TouchableOpacity>
                )}
                <Text style={styles.mediaCount}>{media.length}/2</Text>
              </View>
            )}
          </View>

          {/* Post Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Post Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  postType === 'individual' && styles.radioButtonSelected,
                ]}
                onPress={() => setPostType('individual')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    postType === 'individual' && styles.radioCircleSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.radioText,
                    postType === 'individual' && styles.radioTextSelected,
                  ]}
                >
                  Individual Post
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, postType === 'group' && styles.radioButtonSelected]}
                onPress={() => setPostType('group')}
              >
                <View
                  style={[styles.radioCircle, postType === 'group' && styles.radioCircleSelected]}
                />
                <Text
                  style={[styles.radioText, postType === 'group' && styles.radioTextSelected]}
                >
                  Group Post
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Number of People (for group posts) */}
          {postType === 'group' && (
            <View style={styles.section}>
              <Text style={styles.label}>Number of People</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number of people"
                value={numPeople}
                onChangeText={setNumPeople}
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* External Link */}
          <View style={styles.section}>
            <Text style={styles.label}>External Plan Link</Text>
            <TextInput
              style={styles.input}
              placeholder="https://externalink.com/saddled"
              value={externalLink}
              onChangeText={setExternalLink}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Women Only Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={styles.label}>Women Only Post</Text>
                {isWomenOnly && (
                  <Text style={styles.toggleDescription}>
                    Everyone would see and show your plan, but only women will be able to join and
                    repost.
                  </Text>
                )}
              </View>
              <Switch
                value={isWomenOnly}
                onValueChange={setIsWomenOnly}
                trackColor={{ false: '#E5E5EA', true: '#A855F7' }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Tags Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Tags</Text>

            {/* DAY Tags */}
            <View style={styles.tagSection}>
              <Text style={styles.tagLabel}>DAY</Text>
              <View style={styles.tagRow}>
                {DAY_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagButton,
                      selectedDay === tag && styles.tagButtonSelected,
                    ]}
                    onPress={() => setSelectedDay(selectedDay === tag ? '' : tag)}
                  >
                    <Text
                      style={[
                        styles.tagButtonText,
                        selectedDay === tag && styles.tagButtonTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* TIME Tags */}
            <View style={styles.tagSection}>
              <Text style={styles.tagLabel}>TIME</Text>
              <View style={styles.tagRow}>
                {TIME_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagButton,
                      selectedTime === tag && styles.tagButtonSelected,
                    ]}
                    onPress={() => setSelectedTime(selectedTime === tag ? '' : tag)}
                  >
                    <Text
                      style={[
                        styles.tagButtonText,
                        selectedTime === tag && styles.tagButtonTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CATEGORY Tags */}
            <View style={styles.tagSection}>
              <Text style={styles.tagLabel}>CATEGORY</Text>
              <View style={styles.tagRow}>
                {CATEGORY_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagButton,
                      selectedCategory === tag && styles.tagButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(selectedCategory === tag ? '' : tag);
                      setSelectedSubCategory('');
                    }}
                  >
                    <Text
                      style={[
                        styles.tagButtonText,
                        selectedCategory === tag && styles.tagButtonTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* SUB-CATEGORY Tags (shown when category is selected) */}
            {selectedCategory && SUB_CATEGORY_TAGS[selectedCategory] && (
              <View style={styles.tagSection}>
                <Text style={styles.tagLabel}>SUB-CATEGORY</Text>
                <View style={styles.tagRow}>
                  {SUB_CATEGORY_TAGS[selectedCategory].map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagButton,
                        selectedSubCategory === tag && styles.tagButtonSelected,
                      ]}
                      onPress={() => setSelectedSubCategory(selectedSubCategory === tag ? '' : tag)}
                    >
                      <Text
                        style={[
                          styles.tagButtonText,
                          selectedSubCategory === tag && styles.tagButtonTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.button, styles.previewButton]}
            onPress={handlePreview}
          >
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.postButton]}
              onPress={handlePost}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.postButtonText}>{editMode ? 'Update' : 'Post'}</Text>
              )}
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'right',
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  addMediaText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  mediaItem: {
    position: 'relative',
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  addMoreMedia: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  mediaCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 'auto',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  radioButtonSelected: {
    backgroundColor: '#E5E5EA',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8E8E93',
    marginRight: 8,
  },
  radioCircleSelected: {
    borderColor: '#1C1C1E',
    backgroundColor: '#1C1C1E',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextSelected: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  tagSection: {
    marginBottom: 20,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagButtonSelected: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  tagButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tagButtonTextSelected: {
    color: '#FFF',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#E5E5EA',
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  postButton: {
    backgroundColor: '#1C1C1E',
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  editButton: {
    backgroundColor: '#E5E5EA',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  previewContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  previewText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  previewCardWrapper: {
    marginBottom: 20,
  },
});
