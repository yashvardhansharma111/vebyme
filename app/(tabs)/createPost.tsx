import SwipeableEventCard from '@/components/SwipeableEventCard';
import { apiService } from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ShareToChatModal from '@/components/ShareToChatModal';

// Tag options – categories same as business post; Day/Time with icons
const DAY_TAGS = ['Today', 'Tomorrow', 'Weekend'];
const TIME_TAGS = ['Morning', 'Evening', 'Night'];
const CATEGORY_TAGS = ['Running', 'Sports', 'Fitness/Training', 'Social/Community'];
const DAY_ICONS: Record<string, string> = {
  Today: 'today-outline',
  Tomorrow: 'calendar-outline',
  Weekend: 'calendar-outline',
};
const TIME_ICONS: Record<string, string> = {
  Morning: 'sunny-outline',
  Evening: 'partly-sunny-outline',
  Night: 'moon-outline',
};
const CATEGORY_ICONS: Record<string, string> = {
  Running: 'walk-outline',
  Sports: 'basketball-outline',
  'Fitness/Training': 'barbell-outline',
  'Social/Community': 'people-outline',
};

const DESCRIPTION_MAX_WORDS = 250;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

  // Redirect to login when not authenticated (Create Post → Login Screen)
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Form state
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
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
  const [descriptionHeight, setDescriptionHeight] = useState(100);
  const [showPostSuccessModal, setShowPostSuccessModal] = useState(false);
  const [createdPlanIdForSuccess, setCreatedPlanIdForSuccess] = useState<string | null>(null);
  const [showShareToChatModal, setShowShareToChatModal] = useState(false);
  const openedFromMyPlansRef = useRef(false);
  const insets = useSafeAreaInsets();

  const descriptionWordCount = wordCount(description);
  const descriptionAtLimit = descriptionWordCount >= DESCRIPTION_MAX_WORDS;

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
          openedFromMyPlansRef.current = true;
          const planData = JSON.parse(planDataStr);
          const isEdit = planData.mode === 'edit';
          
          setEditMode(isEdit);
          if (isEdit) {
            setPlanId(planData.plan_id);
          }

          // Pre-fill form fields
          if (planData.title) setTitle(planData.title);
          if (planData.description) setDescription(planData.description);
          if (planData.is_women_only) setIsWomenOnly(planData.is_women_only);
          if (planData.post_type) setPostType(planData.post_type);
          if (planData.num_people) setNumPeople(planData.num_people.toString());
          if (planData.category_main) setSelectedCategory(planData.category_main);
          if (planData.category_sub && planData.category_sub.length > 0) {
            setSelectedSubCategory(planData.category_sub[0]);
          }
          // Subcategory UI removed; state kept for edit load compat
          
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

  const handleDescriptionChange = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length > DESCRIPTION_MAX_WORDS) {
      setDescription(words.slice(0, DESCRIPTION_MAX_WORDS).join(' '));
      return;
    }
    setDescription(text);
  };

  const handleAddMedia = () => {
    Alert.alert('Add Image', 'Choose source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: () => handleAddMediaFromSource('camera'),
      },
      {
        text: 'Gallery',
        onPress: () => handleAddMediaFromSource('gallery'),
      },
    ]);
  };

  const handleAddMediaFromSource = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera permission to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant photo library permission.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsMultipleSelection: true,
          allowsEditing: false,
          quality: 0.8,
          selectionLimit: 2 - media.length,
        });
      }

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
    if (selectedCategory) tags.push(selectedCategory);

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

  const resetFormAndNavigate = () => {
    setDescription('');
    setTitle('');
    setIsWomenOnly(false);
    setPostType('individual');
    setNumPeople('');
    setSelectedDay('');
    setSelectedTime('');
    setSelectedCategory('');
    setSelectedSubCategory('');
    setMedia([]);
    setShowPostSuccessModal(false);
    setCreatedPlanIdForSuccess(null);
    if (openedFromMyPlansRef.current) {
      router.replace('/profile/your-plans');
    } else {
      router.back();
    }
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
      formData.append('is_women_only', isWomenOnly.toString());
      formData.append('post_type', postType);
      if (numPeople) {
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

      // Add category (no subcategory for regular post)
      if (selectedCategory) {
        formData.append('category_main', selectedCategory.toLowerCase());
        formData.append('category_sub', selectedCategory.toLowerCase());
      }

      // Add media files (use uri as-is on iOS to avoid upload getting stuck)
      media.forEach((item, index) => {
        const fileUri = item.uri;
        const fileName = (typeof fileUri === 'string' ? fileUri.split('/').pop() : null) || `media_${index}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
        const fileType = item.type === 'video' ? 'video/mp4' : 'image/jpeg';

        // React Native FormData format - do not strip file:// on iOS
        // @ts-ignore - FormData type issue for React Native
        formData.append('files', {
          uri: fileUri,
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
                if (openedFromMyPlansRef.current) {
                  router.replace('/profile/your-plans');
                } else {
                  router.back();
                }
              },
            },
          ]);
        }
      } else {
        // Create new post – show success modal (same as business post: preview + Edit / Share)
        response = await apiService.createPost(user.access_token, formData);
        if (response.success) {
          const postId = (response as any)?.data?.post_id ?? (response as any)?.post_id ?? (response as any)?.data?.plan_id ?? null;
          setCreatedPlanIdForSuccess(postId);
          setShowPreview(false);
          setShowPostSuccessModal(true);
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
            <TouchableOpacity
              onPress={() => {
                if (editMode || openedFromMyPlansRef.current) {
                  router.replace('/profile/your-plans');
                } else {
                  router.back();
                }
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editMode ? 'Edit Post' : 'New Post'}</Text>
            <View style={{ width: 24 }} />
          </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Description – top, 250 words */}
          <View style={styles.section}>
            <TextInput
              style={[styles.textArea, styles.inputGray, { minHeight: Math.max(100, descriptionHeight) }]}
              multiline
              placeholder="Description"
              placeholderTextColor="#8E8E93"
              value={description}
              onChangeText={handleDescriptionChange}
              onContentSizeChange={(e) => setDescriptionHeight(e.nativeEvent.contentSize.height)}
              textAlignVertical="top"
            />
            <Text style={styles.wordCount}>{descriptionWordCount}/{DESCRIPTION_MAX_WORDS} words</Text>
          </View>

          {/* Title (optional) */}
          <View style={styles.section}>
            <TextInput
              style={[styles.input, styles.inputGray]}
              placeholder="Title (optional)"
              placeholderTextColor="#8E8E93"
              value={title}
              onChangeText={setTitle}
              maxLength={30}
            />
            <Text style={styles.charCount}>{title.length}/30</Text>
          </View>

          {/* Add Media – white button */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.addMediaButton} onPress={handleAddMedia}>
              <Ionicons name="add" size={20} color="#1C1C1E" />
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

          {/* Number of people */}
          <View style={styles.section}>
            <TextInput
              style={[styles.input, styles.inputGray]}
              placeholder="Number of people"
              placeholderTextColor="#8E8E93"
              value={numPeople}
              onChangeText={setNumPeople}
              keyboardType="number-pad"
            />
          </View>

          {/* Women only – toggle */}
          <View style={[styles.section, styles.toggleRow]}>
            <Text style={styles.label}>Women only post</Text>
            <Switch
              value={isWomenOnly}
              onValueChange={setIsWomenOnly}
              trackColor={{ false: '#E5E5EA', true: '#A855F7' }}
              thumbColor="#FFF"
            />
          </View>

          {/* Tags – Day, Time, Category with icons; no subcategory */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsGrayBox}>
              <View style={styles.tagSection}>
                <Text style={styles.tagLabel}>DAY</Text>
                <View style={styles.tagRow}>
                  {DAY_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPillWhite,
                        selectedDay === tag && styles.tagPillSelected,
                      ]}
                      onPress={() => setSelectedDay(selectedDay === tag ? '' : tag)}
                    >
                      <Ionicons
                        name={(DAY_ICONS[tag] || 'calendar-outline') as any}
                        size={16}
                        color={selectedDay === tag ? '#FFF' : '#1C1C1E'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.tagPillTextWhite,
                          selectedDay === tag && styles.tagPillTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.tagSection}>
                <Text style={styles.tagLabel}>TIME</Text>
                <View style={styles.tagRow}>
                  {TIME_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPillWhite,
                        selectedTime === tag && styles.tagPillSelected,
                      ]}
                      onPress={() => setSelectedTime(selectedTime === tag ? '' : tag)}
                    >
                      <Ionicons
                        name={(TIME_ICONS[tag] || 'time-outline') as any}
                        size={16}
                        color={selectedTime === tag ? '#FFF' : '#1C1C1E'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.tagPillTextWhite,
                          selectedTime === tag && styles.tagPillTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.tagSection}>
                <Text style={styles.tagLabel}>CATEGORY</Text>
                <View style={styles.tagRow}>
                  {CATEGORY_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPillWhite,
                        selectedCategory === tag && styles.tagPillSelected,
                      ]}
                      onPress={() => {
                        setSelectedCategory(selectedCategory === tag ? '' : tag);
                        setSelectedSubCategory('');
                      }}
                    >
                      <Ionicons
                        name={(CATEGORY_ICONS[tag] || 'pricetag-outline') as any}
                        size={16}
                        color={selectedCategory === tag ? '#FFF' : '#1C1C1E'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.tagPillTextWhite,
                          selectedCategory === tag && styles.tagPillTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
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

      {/* Post success modal: centered card + Edit & Share just below, close button visible */}
      <Modal visible={showPostSuccessModal} animationType="slide" statusBarTranslucent>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={styles.successModalContainer} edges={['top', 'bottom']}>
            <ScrollView
              contentContainerStyle={[styles.previewContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.previewText}>Your post is live! Share it or view it.</Text>
              <View style={styles.previewCardWrapper}>
                {(() => {
                  const previewData = formatPreviewData();
                  return (
                    <SwipeableEventCard
                      user={previewData.user}
                      event={previewData.event}
                      onUserPress={() => {}}
                      hideFooterActions
                    />
                  );
                })()}
              </View>
              <View style={[styles.successBottomBar, { paddingTop: 12, paddingBottom: 0 }]}>
                <TouchableOpacity
                  style={[styles.button, styles.editButton]}
                  onPress={() => {
                    if (createdPlanIdForSuccess) {
                      setShowPostSuccessModal(false);
                      setCreatedPlanIdForSuccess(null);
                      router.push({ pathname: '/business-plan/[planId]', params: { planId: createdPlanIdForSuccess } } as any);
                    }
                  }}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.postButton]}
                  onPress={() => {
                    setShowPostSuccessModal(false);
                    setShowShareToChatModal(true);
                  }}
                >
                  <Text style={styles.postButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.successModalClose, { top: (insets?.top ?? 0) + 52 }]} onPress={resetFormAndNavigate}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>

      <ShareToChatModal
        visible={showShareToChatModal}
        onClose={() => {
          const wasFromSuccess = !!createdPlanIdForSuccess;
          setShowShareToChatModal(false);
          if (wasFromSuccess) {
            setCreatedPlanIdForSuccess(null);
            router.replace('/(tabs)' as any);
          }
        }}
        postId={createdPlanIdForSuccess ?? ''}
        postTitle={title}
        postDescription={description}
        postMedia={media.map((m) => ({ url: m.uri, type: m.type }))}
        postTags={[selectedDay, selectedTime, selectedCategory].filter(Boolean)}
        postCategorySub={selectedCategory ? [selectedCategory] : []}
        postCategoryMain={selectedCategory}
        postIsBusiness={false}
        userId={user?.user_id ?? ''}
        currentUserAvatar={currentUser?.profile_image ?? undefined}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputGray: {
    backgroundColor: '#F2F2F7',
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
  },
  wordCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'right',
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
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  addMediaText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 6,
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
    alignItems: 'center',
  },
  tagsGrayBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
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
  tagPillWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
  },
  tagPillSelected: {
    backgroundColor: '#1C1C1E',
  },
  tagPillTextWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  tagPillTextSelected: {
    color: '#FFF',
  },
  additionalSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  additionalSettingsContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  previewText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  previewCardWrapper: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  successModalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  successBottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  successModalClose: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
