import { apiService } from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCurrentUser } from '@/store/slices/profileSlice';
import { setPostCreated } from '@/store/slices/postCreatedSlice';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BusinessCard from '@/components/BusinessCard';
import CalendarPicker from '@/components/CalendarPicker';
import ShareToChatModal from '@/components/ShareToChatModal';

const CATEGORY_TAGS = ['Music', 'Cafe', 'Clubs', 'Sports', 'Comedy', 'Travel'];

const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  Music: ['Rave', 'Live Music', 'DJ', 'Concert', 'Karaoke'],
  Cafe: ['Coffee', 'Brunch', 'Work'],
  Clubs: ['Nightlife', 'Lounge'],
  Sports: ['Running', 'Cycling', 'Football', 'Yoga', 'Weekend'],
  Comedy: ['Standup', 'Open Mic'],
  Travel: ['Road Trip', 'Hitchhiking', 'Weekend', 'Evening'],
};

const ADDITIONAL_SETTINGS = [
  { id: 'distance', label: 'Distance', icon: 'location', placeholder: 'e.g. 5k' },
  { id: 'starting_point', label: 'Starting Point', icon: 'navigate', placeholder: 'e.g. Alienkind Indiranagar' },
  { id: 'dress_code', label: 'Dress Code', icon: 'shirt', placeholder: 'e.g. Cafe Joggers' },
  { id: 'music_type', label: 'Music Type', icon: 'musical-notes', placeholder: 'e.g. Electronic' },
  { id: 'parking', label: 'Parking', icon: 'car', placeholder: 'e.g. Available' },
  { id: 'f&b', label: 'F&B', icon: 'restaurant', placeholder: 'e.g. Post Run Coffee' },
  { id: 'links', label: 'Links', icon: 'link', placeholder: 'https://...' },
  { id: 'google_drive_link', label: 'Link for photos', icon: 'cloud-download-outline', placeholder: 'https://drive.google.com/recent_run' },
  { id: 'additional_info', label: 'Additional Info', icon: 'information-circle', placeholder: 'Heading and description' },
];

interface Pass {
  pass_id: string;
  name: string;
  price: number;
  description: string;
  capacity?: number;
  media?: { uri: string; type: 'image' }[];
  isExisting?: boolean; // true when loaded from plan (edit mode) – not removable/editable
}

export default function CreateBusinessPostScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

  // Check if user is business user
  const isBusinessUser = currentUser?.is_business === true;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [location, setLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [startTimeText, setStartTimeText] = useState('');
  const [endTimeText, setEndTimeText] = useState('');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [selectedAdditionalSettings, setSelectedAdditionalSettings] = useState<string[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState<{ [key: string]: { title: string; description: string } }>({});
  const [womenOnly, setWomenOnly] = useState(false);
  const [hideGuestListFromViewers, setHideGuestListFromViewers] = useState(false);
  const [shareToAnnouncementGroup, setShareToAnnouncementGroup] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [previewPassIndex, setPreviewPassIndex] = useState<number>(0);
  const [showPostSuccessModal, setShowPostSuccessModal] = useState(false);
  const [createdPlanIdForSuccess, setCreatedPlanIdForSuccess] = useState<string | null>(null);
  const [showShareToChatModal, setShowShareToChatModal] = useState(false);
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM');
  const isEditFlowRef = useRef(false);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setMedia([]);
    setLocation('');
    setSelectedDate(null);
    setShowDatePicker(false);
    setTimeEnabled(false);
    setStartTime(null);
    setEndTime(null);
    setStartTimeText('');
    setEndTimeText('');
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setSelectedCategory('');
    setSelectedSubcategories([]);
    setTicketsEnabled(false);
    setPasses([]);
    setSelectedAdditionalSettings([]);
    setAdditionalDetails({});
    setWomenOnly(false);
    setHideGuestListFromViewers(false);
    setShareToAnnouncementGroup(false);
    setShowPreview(false);
    setEditMode(false);
    setPlanId(null);
    setShowTicketPreview(false);
    setPreviewPassIndex(0);
    isEditFlowRef.current = false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      AsyncStorage.getItem('planForCreation').then((planDataStr) => {
        if (cancelled) return;
        if (planDataStr) return;
        if (isEditFlowRef.current) return;
        resetForm();
      });
      return () => { cancelled = true; };
    }, [resetForm])
  );

  useEffect(() => {
    if (user?.session_id && !currentUser) {
      dispatch(fetchCurrentUser(user.session_id));
    }
  }, [user, currentUser, dispatch]);

  useEffect(() => {
    if (!isBusinessUser && currentUser) {
      Alert.alert('Access Denied', 'Only business users can create business plans', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isBusinessUser, currentUser, router]);

  // Load plan data from AsyncStorage if available (for duplicate/edit)
  useEffect(() => {
    const loadPlanData = async () => {
      try {
        const planDataStr = await AsyncStorage.getItem('planForCreation');
        if (planDataStr) {
          const planData = JSON.parse(planDataStr);
          const isEdit = planData.mode === 'edit';
          if (isEdit) isEditFlowRef.current = true;
          setEditMode(isEdit);
          if (isEdit) {
            setPlanId(planData.plan_id);
          }

          // Pre-fill form fields
          if (planData.title) setTitle(planData.title);
          if (planData.description) setDescription(planData.description);
          if (planData.location_text) setLocation(planData.location_text);
          if (planData.category_main) setSelectedCategory(planData.category_main);
          if (planData.category_sub && Array.isArray(planData.category_sub)) {
            setSelectedSubcategories(planData.category_sub);
          }
          if (planData.is_women_only) setWomenOnly(planData.is_women_only);
          if (planData.allow_view_guest_list === false) setHideGuestListFromViewers(true);
          else if (planData.allow_view_guest_list) setHideGuestListFromViewers(false);
          if (planData.reshare_to_announcement_group) setShareToAnnouncementGroup(planData.reshare_to_announcement_group);
          
          // Handle date
          if (planData.date) {
            setSelectedDate(new Date(planData.date));
          }
          
          // Handle time
          if (planData.time) {
            setTimeEnabled(true);
            setStartTimeText(planData.time);
            const timeMatch = planData.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeMatch) {
              setStartAmPm(timeMatch[3].toUpperCase() as 'AM' | 'PM');
              let hours = parseInt(timeMatch[1], 10);
              const minutes = parseInt(timeMatch[2], 10);
              if (timeMatch[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
              if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
              const timeDate = new Date();
              timeDate.setHours(hours, minutes, 0, 0);
              setStartTime(timeDate);
            }
            if (planData.end_time) {
              setEndTimeText(planData.end_time);
              const endMatch = planData.end_time.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (endMatch) {
                setEndAmPm(endMatch[3].toUpperCase() as 'AM' | 'PM');
                let hours = parseInt(endMatch[1], 10);
                const minutes = parseInt(endMatch[2], 10);
                if (endMatch[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
                if (endMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
                const timeDate = new Date();
                timeDate.setHours(hours, minutes, 0, 0);
                setEndTime(timeDate);
              }
            }
          }

          // Handle passes/tickets (normalize pass media to { uri, type }); mark as existing so they can't be removed/edited
          if (planData.passes && planData.passes.length > 0) {
            setTicketsEnabled(true);
            setPasses(planData.passes.map((p: any) => ({
              ...p,
              isExisting: true,
              media: p.media && p.media.length > 0
                ? [{ uri: typeof p.media[0] === 'string' ? p.media[0] : p.media[0].url, type: 'image' as const }]
                : undefined,
            })));
          }

          // Handle additional details (additional_info may have heading + description)
          if (planData.add_details && planData.add_details.length > 0) {
            const settings: string[] = [];
            const details: { [key: string]: { title: string; description: string } } = {};
            planData.add_details.forEach((detail: any) => {
              settings.push(detail.detail_type);
              const isAdditionalInfo = detail.detail_type === 'additional_info';
              details[detail.detail_type] = {
                title: isAdditionalInfo ? (detail.heading ?? detail.title ?? '') : (detail.title ?? ''),
                description: detail.description || '',
              };
            });
            setSelectedAdditionalSettings(settings);
            setAdditionalDetails(details);
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

  const MAX_MEDIA = 5;

  const handleAddMedia = async () => {
    try {
      if (media.length >= MAX_MEDIA) {
        Alert.alert('Limit reached', `You can add up to ${MAX_MEDIA} images per post.`);
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA - media.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems = result.assets.slice(0, MAX_MEDIA - media.length).map((asset) => ({
          uri: asset.uri,
          type: 'image' as const,
        }));
        setMedia((prev) => [...prev, ...newItems].slice(0, MAX_MEDIA));
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const removeMedia = (index?: number) => {
    if (index !== undefined) {
      setMedia((prev) => prev.filter((_, i) => i !== index));
    } else {
      setMedia([]);
    }
  };

  const handleAddPassImage = async (passIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const updated = [...passes];
        updated[passIndex] = { ...updated[passIndex], media: [{ uri: result.assets[0].uri, type: 'image' as const }] };
        setPasses(updated);
      }
    } catch (error) {
      console.error('Error picking pass image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removePassImage = (passIndex: number) => {
    const updated = [...passes];
    updated[passIndex] = { ...updated[passIndex], media: undefined };
    setPasses(updated);
  };

  const addPass = () => {
    const newPass: Pass = {
      pass_id: `pass_${Date.now()}`,
      name: '',
      price: 0,
      description: '',
      capacity: 1,
    };
    setPasses([...passes, newPass]);
  };

  const updatePass = (index: number, field: keyof Pass, value: any) => {
    const updated = [...passes];
    updated[index] = { ...updated[index], [field]: value };
    setPasses(updated);
  };

  const removePass = (index: number) => {
    setPasses(passes.filter((_, i) => i !== index));
  };

  const toggleAdditionalSetting = (settingId: string) => {
    if (selectedAdditionalSettings.includes(settingId)) {
      setSelectedAdditionalSettings(selectedAdditionalSettings.filter(id => id !== settingId));
      const updated = { ...additionalDetails };
      delete updated[settingId];
      setAdditionalDetails(updated);
    } else {
      setSelectedAdditionalSettings([...selectedAdditionalSettings, settingId]);
      setAdditionalDetails({
        ...additionalDetails,
        [settingId]: { title: '', description: '' },
      });
    }
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const parseTimeText = (text: string): Date | null => {
    const timeMatch = text.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return null;
    let hours = parseInt(timeMatch[1], 10);
    const minutes = Math.min(59, Math.max(0, parseInt(timeMatch[2], 10)));
    const ampm = timeMatch[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    hours = Math.min(23, Math.max(0, hours));
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatPreviewData = () => {
    return {
      plan_id: 'preview',
      title: title || 'Event Title',
      description: description || 'Event description',
      media: media.length > 0 ? media.map((m) => ({ url: m.uri, type: m.type })) : [],
      location_text: location || undefined,
      date: selectedDate ? selectedDate : undefined,
      time: (() => {
        const s = startTime || parseTimeText(startTimeText);
        return timeEnabled && s ? formatTime(s) : undefined;
      })(),
      category_sub: selectedSubcategories.length > 0 ? selectedSubcategories : (selectedCategory ? [selectedCategory] : []),
      passes: passes.filter(p => p.name && p.price >= 0),
      user: currentUser ? {
        user_id: currentUser.user_id,
        name: currentUser.name || 'Organizer',
        profile_image: currentUser.profile_image ?? undefined,
      } : undefined,
    };
  };

  const handlePreview = () => {
    if (media.length === 0) {
      Alert.alert('Validation', 'Please add at least one image to preview the plan.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation', 'Plan Description is required');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation', 'Category is required');
      return;
    }
    if (ticketsEnabled && passes.length === 0) {
      Alert.alert('Validation', 'Please add at least one ticket with a price');
      return;
    }
    if (ticketsEnabled && passes.some(p => !p.name.trim() || p.price < 0)) {
      Alert.alert('Validation', 'All tickets must have a name and a valid price (0 or more)');
      return;
    }
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    // Check for authentication
    if (!user?.access_token || !user?.user_id) {
      Alert.alert('Error', 'Please log in to create a business plan');
      return;
    }

    // Check if user is business user
    if (!currentUser?.is_business) {
      Alert.alert('Error', 'Only business users can create business plans. Please contact support to enable business account.');
      return;
    }

    // Validate required fields: Title, Description, Category, and Ticket fee (if tickets enabled)
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation', 'Plan Description is required');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation', 'Category is required');
      return;
    }
    if (ticketsEnabled && passes.length === 0) {
      Alert.alert('Validation', 'Please add at least one ticket with a price');
      return;
    }
    if (ticketsEnabled && passes.some(p => !p.name.trim() || p.price < 0)) {
      Alert.alert('Validation', 'All tickets must have a name and a valid price (0 or more for free)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      let hasFiles = false;
      
      // Add post media files if exists
      if (media.length > 0) {
        media.forEach((item, index) => {
          formData.append('files', {
            uri: Platform.OS === 'ios' ? item.uri.replace('file://', '') : item.uri,
            type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
            name: `media-${index}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
          } as any);
          hasFiles = true;
        });
      }

      // Prepare add_details from additional settings
      const addDetails = selectedAdditionalSettings.map(settingId => {
        const isAdditionalInfo = settingId === 'additional_info';
        const payload: { detail_type: string; title?: string; description?: string; heading?: string } = {
          detail_type: settingId,
          title: additionalDetails[settingId]?.title ?? (isAdditionalInfo ? '' : (ADDITIONAL_SETTINGS.find(s => s.id === settingId)?.label ?? settingId)),
          description: additionalDetails[settingId]?.description ?? '',
        };
        if (isAdditionalInfo) payload.heading = additionalDetails[settingId]?.title ?? '';
        return payload;
      });

      // Use user_id as business_id (backend requirement)
      const businessId = currentUser.business_id || user.user_id;

      // Prepare plan data - only include fields that have values
      const planData: any = {
        user_id: user.user_id,
        business_id: businessId,
        title: title.trim(),
        description: description.trim(),
        category_main: selectedCategory.toLowerCase(),
        category_sub: selectedSubcategories.length > 0 ? selectedSubcategories : (selectedCategory ? [selectedCategory] : []),
      };

      // Only set post_status when creating, not when editing
      if (!editMode) {
        planData.post_status = 'published';
      }

      // Optional fields - only include if they have values
      if (location.trim()) {
        planData.location_text = location.trim();
      }
      if (selectedDate) {
        planData.date = selectedDate.toISOString();
      }
      if (timeEnabled) {
        const resolvedStart = startTime || parseTimeText(startTimeText);
        const resolvedEnd = endTime || parseTimeText(endTimeText);
        if (resolvedStart) planData.time = formatTime(resolvedStart);
        if (resolvedEnd) planData.end_time = formatTime(resolvedEnd);
      }
      if (ticketsEnabled && passes.length > 0) {
        planData.passes = passes.filter(p => p.name && p.price >= 0).map(p => ({
          pass_id: p.pass_id,
          name: p.name,
          price: p.price,
          description: p.description || '',
          capacity: p.capacity || 1,
          media: p.media && p.media.length > 0 ? [{ url: p.media[0].uri, type: 'image' as const }] : undefined,
        }));
        planData.is_paid_plan = true;
        planData.registration_required = true;
      }
      if (addDetails.length > 0) {
        planData.add_details = addDetails;
      }
      if (editMode && planId) {
        planData.is_women_only = womenOnly;
      } else if (womenOnly) {
        planData.is_women_only = true;
      }
      planData.allow_view_guest_list = !hideGuestListFromViewers;
      if (shareToAnnouncementGroup) {
        planData.reshare_to_announcement_group = true;
      }

      // If we have files, append all plan data to FormData
      if (hasFiles) {
        Object.keys(planData).forEach(key => {
          const value = planData[key];
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value)) {
              formData.append(key, JSON.stringify(value));
            } else if (Array.isArray(value)) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        });
      }

      let response;
      if (editMode && planId) {
        // Update existing business plan
        response = await apiService.updateBusinessPlan(
          user.access_token, 
          planId, 
          hasFiles ? {} : planData,
          hasFiles ? formData : undefined
        );
        if (response.success) {
          if (shareToAnnouncementGroup) {
            try {
              const annRes = await apiService.getOrCreateAnnouncementGroup();
              const groupId = (annRes as any)?.data?.group_id ?? (annRes as any)?.group_id;
              if (groupId && user.user_id) {
                const shareMedia = media.length > 0 ? media.map(m => ({ url: m.uri, type: m.type })) : [];
                await apiService.sendMessage(groupId, user.user_id, 'plan', {
                  plan_id: planId,
                  title: planData.title,
                  description: planData.description,
                  media: shareMedia,
                  tags: planData.category_sub || [],
                  category_sub: planData.category_sub || [],
                  category_main: planData.category_main,
                  is_business: true,
                });
              }
            } catch (shareErr: any) {
              console.warn('Failed to share to announcement group:', shareErr);
            }
          }
          isEditFlowRef.current = false;
          Alert.alert('Success', 'Business plan updated successfully!', [
            { 
              text: 'OK', 
              onPress: () => {
                setEditMode(false);
                setPlanId(null);
                router.replace('/(tabs)');
              },
            },
          ]);
        }
      } else {
        // Create new business plan
        response = await apiService.createBusinessPlan(
          user.access_token, 
          hasFiles ? {} : planData,
          hasFiles ? formData : undefined
        );
        if (response.success) {
          const createdPlanId = (response as any)?.data?.post_id ?? (response as any)?.post_id ?? null;
          if (shareToAnnouncementGroup && createdPlanId) {
            try {
              const annRes = await apiService.getOrCreateAnnouncementGroup();
              const groupId = (annRes as any)?.data?.group_id ?? (annRes as any)?.group_id;
              if (groupId && user.user_id) {
                const shareMedia = media.length > 0 ? media.map(m => ({ url: m.uri, type: m.type })) : [];
                await apiService.sendMessage(groupId, user.user_id, 'plan', {
                  plan_id: createdPlanId,
                  title: planData.title,
                  description: planData.description,
                  media: shareMedia,
                  tags: planData.category_sub || [],
                  category_sub: planData.category_sub || [],
                  category_main: planData.category_main,
                  is_business: true,
                });
              }
            } catch (shareErr: any) {
              console.warn('Failed to share to announcement group:', shareErr);
            }
          }
          dispatch(setPostCreated({
            planId: createdPlanId,
            title: title.trim(),
            description: description.trim(),
            media: media.map(m => ({ url: m.uri, type: m.type })),
            tags: selectedSubcategories.length > 0 ? selectedSubcategories : (selectedCategory ? [selectedCategory] : []),
            category_main: selectedCategory?.toLowerCase(),
          }));
          isEditFlowRef.current = false;
          setCreatedPlanIdForSuccess(createdPlanId);
          setShowPostSuccessModal(true);
        }
      }
    } catch (error: any) {
      // Provide more detailed error messages
      let errorMessage = error.message || 'Failed to create business plan';
      
      // Check for common validation errors
      if (errorMessage.includes('business_id') || errorMessage.includes('BusinessPlan validation failed')) {
        errorMessage = 'Business ID is missing. Please ensure your account has business status enabled.';
      } else if (errorMessage.includes('title') || errorMessage.includes('Title')) {
        errorMessage = 'Title is required. Please enter a title for your business plan.';
      } else if (errorMessage.includes('description') || errorMessage.includes('Description')) {
        errorMessage = 'Plan Description is required. Please enter a description for your business plan.';
      } else if (errorMessage.includes('category') || errorMessage.includes('Category')) {
        errorMessage = 'Category is required. Please select a category for your business plan.';
      }
      
      Alert.alert('Error', errorMessage);
      console.error('Business plan creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isBusinessUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showPreview) {
    const previewData = formatPreviewData();
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setShowPreview(false)}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
          <BusinessCard
            plan={previewData}
            user={currentUser ? {
              id: currentUser.user_id,
              name: currentUser.name || 'Organizer',
              avatar: currentUser.profile_image || '',
              time: selectedDate ? selectedDate.toLocaleDateString() : '',
            } : undefined}
            attendeesCount={0}
            isSwipeable={false}
            hideActions
          />
        </ScrollView>
        <View style={styles.previewStickyBar}>
          <TouchableOpacity style={[styles.actionButton, styles.previewEditButton]} onPress={() => setShowPreview(false)}>
            <Text style={styles.previewEditButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.postButton]} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.postButtonText}>Post</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.createPostHeader}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.createPostHeaderTitle}>{editMode ? 'Editing post' : 'Create Post'}</Text>
        <View style={styles.cancelButton} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />

          {/* Description */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="Plan Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

          {/* Media - up to 5 images */}
          <View style={styles.mediaSection}>
            {media.length > 0 ? (
              <View style={styles.mediaList}>
                {media.map((item, index) => (
                  <View key={`${item.uri}-${index}`} style={styles.mediaPreviewWrap}>
                    <Image source={{ uri: item.uri }} style={styles.mediaThumb} />
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => removeMedia(index)}
                    >
                      <Ionicons name="close" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {media.length < MAX_MEDIA && (
                  <TouchableOpacity style={styles.addMediaThumb} onPress={handleAddMedia}>
                    <Ionicons name="add" size={28} color="#666" />
                    <Text style={styles.addMediaThumbText}>{media.length}/{MAX_MEDIA}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.addMediaButton} onPress={handleAddMedia}>
                <Ionicons name="add" size={24} color="#666" />
                <Text style={styles.addMediaText}>+ Add Media (up to {MAX_MEDIA} images)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          <TextInput
            style={styles.input}
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
            placeholderTextColor="#999"
          />

          {/* Date */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={selectedDate ? styles.inputText : styles.inputPlaceholder}>
              {selectedDate ? selectedDate.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }) : 'Date of event'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>

          <CalendarPicker
            visible={showDatePicker}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
            minimumDate={new Date()}
          />

          {/* Time of Event */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Time of Event</Text>
            <Switch
              value={timeEnabled}
              onValueChange={setTimeEnabled}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          {timeEnabled && (
            <>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="8:00"
                  value={startTimeText.replace(/\s*AM|PM/i, '').trim()}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9:]/g, '');
                    setStartTimeText(cleaned ? `${cleaned} ${startAmPm}` : '');
                    const parsed = parseTimeText(cleaned ? `${cleaned} ${startAmPm}` : '');
                    if (parsed) setStartTime(parsed);
                  }}
                  placeholderTextColor="#999"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <View style={styles.amPmBox}>
                  <TouchableOpacity
                    style={[styles.amPmOption, startAmPm === 'AM' && styles.amPmOptionSelected]}
                    onPress={() => { setStartAmPm('AM'); const t = startTimeText.replace(/\s*AM|PM/i, '').trim(); if (t) { setStartTimeText(`${t} AM`); const p = parseTimeText(`${t} AM`); if (p) setStartTime(p); } }}
                  >
                    <Text style={[styles.amPmOptionText, startAmPm === 'AM' && styles.amPmOptionTextSelected]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.amPmOption, startAmPm === 'PM' && styles.amPmOptionSelected]}
                    onPress={() => { setStartAmPm('PM'); const t = startTimeText.replace(/\s*AM|PM/i, '').trim(); if (t) { setStartTimeText(`${t} PM`); const p = parseTimeText(`${t} PM`); if (p) setStartTime(p); } }}
                  >
                    <Text style={[styles.amPmOptionText, startAmPm === 'PM' && styles.amPmOptionTextSelected]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="End time (optional)"
                  value={endTimeText.replace(/\s*AM|PM/i, '').trim()}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9:]/g, '');
                    setEndTimeText(cleaned ? `${cleaned} ${endAmPm}` : '');
                    const parsed = parseTimeText(cleaned ? `${cleaned} ${endAmPm}` : '');
                    if (parsed) setEndTime(parsed);
                  }}
                  placeholderTextColor="#999"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <View style={styles.amPmBox}>
                  <TouchableOpacity
                    style={[styles.amPmOption, endAmPm === 'AM' && styles.amPmOptionSelected]}
                    onPress={() => { setEndAmPm('AM'); const t = endTimeText.replace(/\s*AM|PM/i, '').trim(); if (t) { setEndTimeText(`${t} AM`); const p = parseTimeText(`${t} AM`); if (p) setEndTime(p); } }}
                  >
                    <Text style={[styles.amPmOptionText, endAmPm === 'AM' && styles.amPmOptionTextSelected]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.amPmOption, endAmPm === 'PM' && styles.amPmOptionSelected]}
                    onPress={() => { setEndAmPm('PM'); const t = endTimeText.replace(/\s*AM|PM/i, '').trim(); if (t) { setEndTimeText(`${t} PM`); const p = parseTimeText(`${t} PM`); if (p) setEndTime(p); } }}
                  >
                    <Text style={[styles.amPmOptionText, endAmPm === 'PM' && styles.amPmOptionTextSelected]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Category – select category then expand subcategories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {CATEGORY_TAGS.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category && styles.categoryChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      setSelectedSubcategories((prev) =>
                        prev.filter((s) => (CATEGORY_SUBCATEGORIES[category] || []).includes(s))
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category && styles.categoryChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {selectedCategory && (CATEGORY_SUBCATEGORIES[selectedCategory]?.length ?? 0) > 0 && (
              <View style={styles.subcategorySection}>
                <Text style={styles.subcategoryLabel}>Subcategories (optional)</Text>
                <View style={styles.subcategoryChips}>
                  {(CATEGORY_SUBCATEGORIES[selectedCategory] || []).map((sub) => {
                    const isSelected = selectedSubcategories.includes(sub);
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.subcategoryChip,
                          isSelected && styles.subcategoryChipSelected,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedSubcategories((prev) => prev.filter((s) => s !== sub));
                          } else {
                            // Only one subcategory per category: replace any sub for this category with the selected one
                            const subsForCategory = CATEGORY_SUBCATEGORIES[selectedCategory] || [];
                            setSelectedSubcategories((prev) => [...prev.filter((s) => !subsForCategory.includes(s)), sub]);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.subcategoryChipText,
                            isSelected && styles.subcategoryChipTextSelected,
                          ]}
                        >
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Tickets */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Tickets</Text>
            <Switch
              value={ticketsEnabled}
              onValueChange={(value) => {
                setTicketsEnabled(value);
                if (value && passes.length === 0) addPass();
              }}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          {ticketsEnabled && (
            <View style={styles.passesSection}>
              {/* Fixed Add Media row (for first pass ticket image) */}
              {passes[0] && !(editMode && passes[0].isExisting) && (
                <TouchableOpacity
                  style={styles.addMediaOptionButton}
                  onPress={() => handleAddPassImage(0)}
                >
                  {passes[0].media && passes[0].media.length > 0 ? (
                    <View style={styles.passMediaPreview}>
                      <Image source={{ uri: passes[0].media[0].uri }} style={styles.passMediaThumb} />
                      <TouchableOpacity style={styles.removePassMediaBtn} onPress={() => removePassImage(0)}>
                        <Ionicons name="close" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color="#666" />
                      <Text style={styles.addMediaOptionText}>+ Add Media</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {passes[0] && editMode && passes[0].isExisting && passes[0].media && passes[0].media.length > 0 && (
                <View style={styles.passImageRow}>
                  <Text style={styles.passImageLabel}>Ticket image</Text>
                  <Image source={{ uri: passes[0].media[0].uri }} style={styles.passMediaThumb} />
                </View>
              )}
              {passes.map((pass, index) => {
                const isExistingTicket = editMode && pass.isExisting;
                return (
                  <View key={pass.pass_id} style={styles.passCard}>
                    <View style={styles.passHeader}>
                      <Text style={styles.passTitle}>Pass {index + 1}</Text>
                      {!editMode && (
                        <TouchableOpacity onPress={() => removePass(index)}>
                          <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.passNamePriceRow}>
                      <TextInput
                        style={[styles.passInput, styles.passNameInRow]}
                        placeholder="Ticket Name"
                        value={pass.name}
                        onChangeText={(text) => !isExistingTicket && updatePass(index, 'name', text)}
                        placeholderTextColor="#999"
                        editable={!isExistingTicket}
                      />
                      <TextInput
                        style={[styles.passInput, styles.passPriceInRow]}
                        placeholder="Price"
                        value={pass.price >= 0 ? pass.price.toString() : ''}
                        onChangeText={(text) => !isExistingTicket && updatePass(index, 'price', parseFloat(text) >= 0 ? parseFloat(text) : 0)}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                        editable={!isExistingTicket}
                      />
                    </View>
                    <TextInput
                      style={[styles.passInput, styles.passDescription]}
                      placeholder="Description (Optional)"
                      value={pass.description}
                      onChangeText={(text) => !isExistingTicket && updatePass(index, 'description', text)}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#999"
                      editable={!isExistingTicket}
                    />
                  </View>
                );
              })}
              <View style={styles.addTypePreviewRow}>
                <TouchableOpacity style={styles.addPassButton} onPress={addPass}>
                  <Text style={styles.addPassText}>+ Add Type</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.previewTicketButton}
                  onPress={() => {
                    setPreviewPassIndex(0);
                    setShowTicketPreview(true);
                  }}
                >
                  <Ionicons name="eye-outline" size={18} color="#1C1C1E" />
                  <Text style={styles.previewTicketButtonText}>Preview Ticket</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Share to Announcement Group */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Share to Announcement Group</Text>
            <Switch
              value={shareToAnnouncementGroup}
              onValueChange={setShareToAnnouncementGroup}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          {/* Additional Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Settings</Text>
            <View style={styles.settingsGrid}>
              {ADDITIONAL_SETTINGS.map((setting) => (
                <TouchableOpacity
                  key={setting.id}
                  style={[
                    styles.settingChip,
                    selectedAdditionalSettings.includes(setting.id) && styles.settingChipSelected,
                  ]}
                  onPress={() => toggleAdditionalSetting(setting.id)}
                >
                  <Ionicons
                    name={setting.icon as any}
                    size={16}
                    color={selectedAdditionalSettings.includes(setting.id) ? '#FFF' : '#666'}
                  />
                  <Text
                    style={[
                      styles.settingChipText,
                      selectedAdditionalSettings.includes(setting.id) && styles.settingChipTextSelected,
                    ]}
                  >
                    {setting.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedAdditionalSettings.map((settingId) => {
              const setting = ADDITIONAL_SETTINGS.find(s => s.id === settingId);
              const isAdditionalInfo = settingId === 'additional_info';
              return (
                <View key={settingId} style={styles.additionalDetailCard}>
                  <Text style={styles.additionalDetailLabel}>{setting?.label}</Text>
                  {isAdditionalInfo ? (
                    <>
                      <TextInput
                        style={styles.additionalDetailInput}
                        placeholder="Heading"
                        value={additionalDetails[settingId]?.title || ''}
                        onChangeText={(text) =>
                          setAdditionalDetails({
                            ...additionalDetails,
                            [settingId]: { ...additionalDetails[settingId], title: text },
                          })
                        }
                        placeholderTextColor="#999"
                      />
                      <TextInput
                        style={[styles.additionalDetailInput, styles.additionalDetailDescription]}
                        placeholder="Description"
                        value={additionalDetails[settingId]?.description || ''}
                        onChangeText={(text) =>
                          setAdditionalDetails({
                            ...additionalDetails,
                            [settingId]: { ...additionalDetails[settingId], description: text },
                          })
                        }
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={2}
                      />
                    </>
                  ) : (
                    <TextInput
                      style={styles.additionalDetailInput}
                      placeholder={(setting as any)?.placeholder ?? (setting?.label ? `Enter ${setting.label}` : 'Value')}
                      value={additionalDetails[settingId]?.description ?? additionalDetails[settingId]?.title ?? ''}
                      onChangeText={(text) =>
                        setAdditionalDetails({
                          ...additionalDetails,
                          [settingId]: {
                            title: setting?.label ?? settingId,
                            description: text,
                          },
                        })
                      }
                      placeholderTextColor="#999"
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Additional Toggles */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Women&apos;s only</Text>
            <Switch
              value={womenOnly}
              onValueChange={setWomenOnly}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>
          {womenOnly && (
            <Text style={styles.womenOnlyInfo}>
              Your event will be visible to everyone but only women will be able to register.
            </Text>
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Hide guest list from viewers</Text>
            <Switch
              value={hideGuestListFromViewers}
              onValueChange={setHideGuestListFromViewers}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          {/* Ticket Preview Modal */}
          <Modal
            visible={showTicketPreview}
            animationType="slide"
            onRequestClose={() => setShowTicketPreview(false)}
          >
            <SafeAreaView style={styles.ticketPreviewModal}>
              <View style={styles.ticketPreviewHeader}>
                <TouchableOpacity onPress={() => setShowTicketPreview(false)}>
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.ticketPreviewTitle}>Ticket Preview</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.ticketPreviewScroll} contentContainerStyle={styles.ticketPreviewContent}>
                {passes[previewPassIndex] && (() => {
                  const pass = passes[previewPassIndex];
                  const mainImage = pass.media?.[0]?.uri ?? (media[0]?.uri);
                  const eventDate = selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
                  const eventTime = (startTime ? formatTime(startTime) : startTimeText) || 'TBD';
                  const categoryTags = [...(selectedCategory ? [selectedCategory] : []), ...selectedSubcategories].slice(0, 3);
                  return (
                    <View style={styles.ticketPreviewCard}>
                      {mainImage ? (
                        <Image source={{ uri: mainImage }} style={styles.ticketPreviewImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.ticketPreviewImage, styles.ticketPreviewImagePlaceholder]}>
                          <Ionicons name="image-outline" size={48} color="#8E8E93" />
                        </View>
                      )}
                      <Text style={styles.ticketPreviewEventTitle}>{title || 'Event Title'}</Text>
                      <LinearGradient
                        colors={['#E0F2FE', '#D1FAE5', '#FEF3C7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ticketPreviewDetails}
                      >
                        <View style={styles.ticketPreviewDetailsRow}>
                          <Text style={styles.ticketPreviewDetailText}>{eventDate}</Text>
                          <Text style={styles.ticketPreviewDetailText}>{eventTime}</Text>
                        </View>
                        {location ? <Text style={styles.ticketPreviewLocation}>{location}</Text> : null}
                        {categoryTags.length > 0 && (
                          <View style={styles.ticketPreviewTagsRow}>
                            {categoryTags.map((tag: string, idx: number) => (
                              <View key={idx} style={styles.ticketPreviewTag}>
                                <Text style={styles.ticketPreviewTagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </LinearGradient>
                      <View style={styles.ticketPreviewQrSection}>
                        <View style={styles.ticketPreviewQrPlaceholder}>
                          <Ionicons name="qr-code-outline" size={80} color="#8E8E93" />
                          <Text style={styles.ticketPreviewQrText}>Preview</Text>
                        </View>
                        <Text style={styles.ticketPreviewPassName}>{pass.name || 'Ticket'}</Text>
                        <Text style={styles.ticketPreviewPrice}>₹{pass.price >= 0 ? pass.price : 0}</Text>
                      </View>
                    </View>
                  );
                })()}
                <TouchableOpacity
                  style={styles.ticketPreviewBackButton}
                  onPress={() => setShowTicketPreview(false)}
                >
                  <Ionicons name="create-outline" size={20} color="#FFF" />
                  <Text style={styles.ticketPreviewBackButtonText}>Back to Edit</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </ScrollView>
        {/* Sticky Action Buttons - visible on every page of create flow */}
        <View style={styles.stickyActionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.previewButton]}
            onPress={handlePreview}
          >
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.postButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.postButtonText}>{editMode ? 'Update' : 'Post'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Post success modal: full BusinessCard + Edit event & Share */}
      <Modal visible={showPostSuccessModal} animationType="slide" transparent>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.successModalScroll}>
              <BusinessCard
                plan={{
                  ...formatPreviewData(),
                  plan_id: createdPlanIdForSuccess ?? 'preview',
                }}
                user={currentUser ? {
                  id: currentUser.user_id,
                  name: currentUser.name || 'Organizer',
                  avatar: currentUser.profile_image || '',
                  time: selectedDate ? selectedDate.toLocaleDateString() : '',
                } : undefined}
                attendeesCount={0}
                isSwipeable={false}
                hideActions
              />
              <View style={styles.successModalButtons}>
                <TouchableOpacity
                  style={styles.successEditButton}
                  onPress={async () => {
                    if (!createdPlanIdForSuccess) return;
                    setShowPostSuccessModal(false);
                    try {
                      const response = await apiService.getBusinessPlan(createdPlanIdForSuccess);
                      const planData = response.data;
                      if (planData) {
                        setPlanId(createdPlanIdForSuccess);
                        setEditMode(true);
                        isEditFlowRef.current = true;
                        if (planData.title) setTitle(planData.title);
                        if (planData.description) setDescription(planData.description);
                        if (planData.location_text) setLocation(planData.location_text);
                        if (planData.category_main) setSelectedCategory(planData.category_main);
                        if (planData.category_sub && Array.isArray(planData.category_sub)) setSelectedSubcategories(planData.category_sub);
                        if (planData.is_women_only) setWomenOnly(planData.is_women_only);
                        if (planData.allow_view_guest_list === false) setHideGuestListFromViewers(true);
                        else if (planData.allow_view_guest_list) setHideGuestListFromViewers(false);
                        if (planData.date) setSelectedDate(new Date(planData.date));
                        if (planData.time) {
                          setTimeEnabled(true);
                          setStartTimeText(planData.time);
                          const m = planData.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                          if (m) {
                            setStartAmPm(m[3].toUpperCase() as 'AM' | 'PM');
                            let h = parseInt(m[1], 10);
                            const min = parseInt(m[2], 10);
                            if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
                            if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
                            const d = new Date();
                            d.setHours(h, min, 0, 0);
                            setStartTime(d);
                          }
                        }
                        if (planData.media?.length) setMedia(planData.media.map((m: any) => ({ uri: m.url, type: m.type === 'video' ? 'video' as const : 'image' as const })));
                        if (planData.passes?.length) {
                          setTicketsEnabled(true);
                          setPasses(planData.passes.map((p: any) => ({
                            pass_id: p.pass_id || `pass_${Date.now()}`,
                            name: p.name || '',
                            price: p.price ?? 0,
                            description: p.description || '',
                            media: p.media?.map((pm: any) => ({ uri: pm.url, type: 'image' as const })),
                            isExisting: true,
                          })));
                        }
                        if (planData.add_details?.length) {
                          const settings = planData.add_details.map((d: any) => d.detail_type).filter(Boolean);
                          const details: typeof additionalDetails = {};
                          planData.add_details.forEach((d: any) => {
                            if (d.detail_type === 'additional_info') {
                              details[d.detail_type] = { title: d.heading ?? d.title ?? '', description: d.description ?? '' };
                            } else {
                              details[d.detail_type] = { title: d.title ?? '', description: d.description ?? '' };
                            }
                          });
                          setSelectedAdditionalSettings(settings);
                          setAdditionalDetails(details);
                        }
                      }
                    } catch (e) {
                      Alert.alert('Error', 'Failed to load plan for editing');
                    }
                  }}
                >
                  <Text style={styles.successEditButtonText}>Edit event</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.successShareButton}
                  onPress={() => {
                    setShowShareToChatModal(true);
                  }}
                >
                  <Text style={styles.successShareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.successModalClose}
              onPress={() => {
                setShowPostSuccessModal(false);
                setCreatedPlanIdForSuccess(null);
                router.replace('/(tabs)');
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ShareToChatModal
        visible={showShareToChatModal}
        onClose={() => setShowShareToChatModal(false)}
        postId={createdPlanIdForSuccess ?? ''}
        postTitle={title}
        postDescription={description}
        postMedia={media.map(m => ({ url: m.uri, type: m.type }))}
        postTags={selectedSubcategories.length ? selectedSubcategories : (selectedCategory ? [selectedCategory] : [])}
        postCategorySub={selectedSubcategories}
        postCategoryMain={selectedCategory}
        postIsBusiness={true}
        userId={user?.user_id ?? ''}
        currentUserAvatar={currentUser?.profile_image}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C5C5D0',
  },
  cancelButton: {
    minWidth: 70,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  createPostHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stickyActionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#F2F2F7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C5C5D0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  descriptionInput: {
    fontSize: 14,
    color: '#000',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  mediaSection: {
    marginBottom: 16,
  },
  mediaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaPreviewWrap: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaThumb: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaThumbText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  mediaPreview: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  addMediaButton: {
    width: '100%',
    height: 100,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  addMediaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  input: {
    fontSize: 14,
    color: '#000',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 14,
    color: '#000',
  },
  inputPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
    marginBottom: 0,
  },
  amPmBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  amPmOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  amPmOptionSelected: {
    backgroundColor: '#1C1C1E',
  },
  amPmOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  amPmOptionTextSelected: {
    color: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  womenOnlyInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
  },
  categoryChipSelected: {
    backgroundColor: '#1C1C1E',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#FFF',
  },
  subcategorySection: {
    marginTop: 12,
  },
  subcategoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subcategoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subcategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E5E5E5',
  },
  subcategoryChipSelected: {
    backgroundColor: '#1C1C1E',
  },
  subcategoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  subcategoryChipTextSelected: {
    color: '#FFF',
  },
  passesSection: {
    marginBottom: 16,
  },
  passCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  passInput: {
    fontSize: 14,
    color: '#000',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 12,
  },
  passDescription: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  passImageRow: {
    marginTop: 8,
  },
  passImageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  passMediaPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  passMediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePassMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  addPassImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addPassImageText: {
    fontSize: 13,
    color: '#666',
  },
  addMediaOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 12,
  },
  addMediaOptionText: {
    fontSize: 14,
    color: '#666',
  },
  passNamePriceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  passNameInRow: {
    flex: 1,
    marginBottom: 0,
  },
  passPriceInRow: {
    width: 100,
    marginBottom: 0,
  },
  addTypePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  previewTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
  },
  previewTicketButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  ticketPreviewModal: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  ticketPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  ticketPreviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  ticketPreviewScroll: {
    flex: 1,
  },
  ticketPreviewContent: {
    padding: 20,
    paddingBottom: 40,
  },
  ticketPreviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  ticketPreviewImage: {
    width: '100%',
    height: 200,
  },
  ticketPreviewImagePlaceholder: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketPreviewEventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
  },
  ticketPreviewDetails: {
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  ticketPreviewDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketPreviewDetailText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  ticketPreviewLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  ticketPreviewTagsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ticketPreviewTag: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ticketPreviewTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  ticketPreviewQrSection: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
  },
  ticketPreviewQrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketPreviewQrText: {
    marginTop: 8,
    fontSize: 12,
    color: '#8E8E93',
  },
  ticketPreviewPassName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  ticketPreviewPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  ticketPreviewBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  ticketPreviewBackButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  addPassButton: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
  },
  addPassText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  settingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    gap: 6,
  },
  settingChipSelected: {
    backgroundColor: '#1C1C1E',
  },
  settingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  settingChipTextSelected: {
    color: '#FFF',
  },
  additionalDetailCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  additionalDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  additionalDetailInput: {
    fontSize: 14,
    color: '#000',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  additionalDetailDescription: {
    marginTop: 10,
  },
  productionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    gap: 6,
  },
  productionTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#1C1C1E',
  },
  previewButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  postButton: {
    backgroundColor: '#1C1C1E',
  },
  postButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    width: '92%',
    maxHeight: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  successModalScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  successModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  successEditButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#E5E5EA',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successEditButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  successShareButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successShareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  successModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  previewScroll: { flex: 1 },
  previewScrollContent: { paddingBottom: 24 },
  previewStickyBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  previewEditButton: {
    backgroundColor: '#E5E5EA',
  },
  previewEditButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '700',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  datePickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  dateInput: {
    fontSize: 14,
    color: '#000',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 12,
  },
  datePickerButton: {
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
