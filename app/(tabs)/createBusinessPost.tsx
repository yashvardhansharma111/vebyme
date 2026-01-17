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
import BusinessCard from '@/components/BusinessCard';
import CalendarPicker from '@/components/CalendarPicker';

const CATEGORY_TAGS = ['Music', 'Cafe', 'Clubs', 'Sports', 'Comedy', 'Travel'];
const ADDITIONAL_SETTINGS = [
  { id: 'distance', label: 'Distance', icon: 'location' },
  { id: 'starting_point', label: 'Starting Point', icon: 'navigate' },
  { id: 'dress_code', label: 'Dress Code', icon: 'shirt' },
  { id: 'music_type', label: 'Music Type', icon: 'musical-notes' },
  { id: 'parking', label: 'Parking', icon: 'car' },
  { id: 'f&b', label: 'F&B', icon: 'restaurant' },
  { id: 'links', label: 'Links', icon: 'link' },
  { id: 'additional_info', label: 'Additional Info', icon: 'information-circle' },
];

interface Pass {
  pass_id: string;
  name: string;
  price: number;
  description: string;
  capacity?: number;
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
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [selectedAdditionalSettings, setSelectedAdditionalSettings] = useState<string[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState<{ [key: string]: { title: string; description: string } }>({});
  const [eventProduction, setEventProduction] = useState<string[]>([]);
  const [venueRequired, setVenueRequired] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [allowViewGuestList, setAllowViewGuestList] = useState(false);
  const [shareToAnnouncementGroup, setShareToAnnouncementGroup] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddMedia = async () => {
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
        setMedia([{
          uri: result.assets[0].uri,
          type: 'image' as const,
        }]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const removeMedia = () => {
    setMedia([]);
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

  const addEventProduction = () => {
    Alert.prompt(
      'Add Event Production',
      'Enter production type (e.g., Musician, Content Creator)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (text: string | undefined) => {
            if (text && text.trim()) {
              setEventProduction([...eventProduction, text.trim()]);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const removeEventProduction = (index: number) => {
    setEventProduction(eventProduction.filter((_, i) => i !== index));
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatPreviewData = () => {
    return {
      plan_id: 'preview',
      title: title || 'Event Title',
      description: description || 'Event description',
      media: media.length > 0 ? [{ url: media[0].uri, type: media[0].type }] : [],
      location_text: location || undefined,
      date: selectedDate ? selectedDate : undefined,
      time: timeEnabled && startTime ? formatTime(startTime) : undefined,
      category_sub: selectedCategory ? [selectedCategory] : [],
      passes: passes.filter(p => p.name && p.price > 0),
      user: currentUser ? {
        user_id: currentUser.user_id,
        name: currentUser.name || 'Organizer',
        profile_image: currentUser.profile_image ?? undefined,
      } : undefined,
    };
  };

  const handlePreview = () => {
    // Only validate required fields: Title, Description, Category, and Ticket fee (if tickets enabled)
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
    if (ticketsEnabled && passes.some(p => !p.name.trim() || p.price <= 0)) {
      Alert.alert('Validation', 'All tickets must have a name and price');
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
    if (ticketsEnabled && passes.some(p => !p.name.trim() || p.price <= 0)) {
      Alert.alert('Validation', 'All tickets must have a name and price');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload media first if exists
      let uploadedMedia: Array<{ url: string; type: string }> = [];
      if (media.length > 0) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: media[0].uri,
            type: 'image/jpeg',
            name: 'image.jpg',
          } as any);
          const uploadResponse = await apiService.uploadImage(formData, user.access_token);
          if (uploadResponse.data?.url) {
            uploadedMedia = [{ url: uploadResponse.data.url, type: 'image' }];
          }
        } catch (uploadError: any) {
          // If upload fails (e.g., Cloudinary not configured), continue without media
          console.warn('Media upload failed, continuing without image:', uploadError.message);
          // Optionally, you could use the local URI as a fallback
          // uploadedMedia = [{ url: media[0].uri, type: 'image' }];
        }
      }

      // Prepare add_details from additional settings
      const addDetails = selectedAdditionalSettings.map(settingId => ({
        detail_type: settingId,
        title: additionalDetails[settingId]?.title || settingId,
        description: additionalDetails[settingId]?.description || '',
      }));

      // Use user_id as business_id (backend requirement)
      const businessId = currentUser.business_id || user.user_id;

      // Prepare plan data - only include fields that have values
      const planData: any = {
        user_id: user.user_id,
        business_id: businessId,
        title: title.trim(),
        description: description.trim(),
        category_main: selectedCategory.toLowerCase(),
        category_sub: selectedCategory ? [selectedCategory] : [],
        post_status: 'published',
      };

      // Optional fields - only include if they have values
      if (uploadedMedia.length > 0) {
        planData.media = uploadedMedia;
      }
      if (location.trim()) {
        planData.location_text = location.trim();
      }
      if (selectedDate) {
        planData.date = selectedDate.toISOString();
      }
      if (timeEnabled && startTime) {
        planData.time = formatTime(startTime);
      }
      if (ticketsEnabled && passes.length > 0) {
        planData.passes = passes.filter(p => p.name && p.price > 0).map(p => ({
          pass_id: p.pass_id,
          name: p.name,
          price: p.price,
          description: p.description || '',
          capacity: p.capacity || 1,
        }));
        planData.is_paid_plan = true;
        planData.registration_required = true;
      }
      if (addDetails.length > 0) {
        planData.add_details = addDetails;
      }
      if (eventProduction.length > 0) {
        planData.event_production = eventProduction;
      }
      if (venueRequired) {
        planData.venue_required = true;
      }
      if (womenOnly) {
        planData.is_women_only = true;
      }
      if (allowViewGuestList) {
        planData.allow_view_guest_list = true;
      }
      if (shareToAnnouncementGroup) {
        planData.reshare_to_announcement_group = true;
      }

      const response = await apiService.createBusinessPlan(user.access_token, planData);
      if (response.success) {
        Alert.alert('Success', 'Business plan created successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
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
        <ScrollView>
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
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            maxLength={250}
          />
          <Text style={styles.charCount}>{description.length}/250</Text>

          {/* Media */}
          <View style={styles.mediaSection}>
            {media.length > 0 ? (
              <View style={styles.mediaPreview}>
                <Image source={{ uri: media[0].uri }} style={styles.mediaImage} />
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={removeMedia}
                >
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addMediaButton} onPress={handleAddMedia}>
                <Ionicons name="add" size={24} color="#666" />
                <Text style={styles.addMediaText}>+ Add Media</Text>
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
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={startTime ? styles.inputText : styles.inputPlaceholder}>
                  {startTime ? formatTime(startTime) : '8:00 AM'}
                </Text>
              </TouchableOpacity>

              {showStartTimePicker && (
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>Select Start Time</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="HH:MM AM/PM (e.g., 8:00 AM)"
                    value={startTime ? formatTime(startTime) : ''}
                    onChangeText={(text) => {
                      // Simple time parsing - can be improved
                      const timeMatch = text.match(/(\d+):(\d+)\s*(AM|PM)/i);
                      if (timeMatch) {
                        let hours = parseInt(timeMatch[1]);
                        const minutes = parseInt(timeMatch[2]);
                        const ampm = timeMatch[3].toUpperCase();
                        if (ampm === 'PM' && hours !== 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        const date = new Date();
                        date.setHours(hours, minutes);
                        setStartTime(date);
                      }
                    }}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowStartTimePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={endTime ? styles.inputText : styles.inputPlaceholder}>
                  {endTime ? formatTime(endTime) : 'End Time (optional)'}
                </Text>
              </TouchableOpacity>

              {showEndTimePicker && (
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>Select End Time</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="HH:MM AM/PM (e.g., 10:00 PM)"
                    value={endTime ? formatTime(endTime) : ''}
                    onChangeText={(text) => {
                      const timeMatch = text.match(/(\d+):(\d+)\s*(AM|PM)/i);
                      if (timeMatch) {
                        let hours = parseInt(timeMatch[1]);
                        const minutes = parseInt(timeMatch[2]);
                        const ampm = timeMatch[3].toUpperCase();
                        if (ampm === 'PM' && hours !== 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        const date = new Date();
                        date.setHours(hours, minutes);
                        setEndTime(date);
                      }
                    }}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndTimePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Category */}
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
                    onPress={() => setSelectedCategory(category)}
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
          </View>

          {/* Tickets */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Tickets</Text>
            <Switch
              value={ticketsEnabled}
              onValueChange={setTicketsEnabled}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          {ticketsEnabled && (
            <View style={styles.passesSection}>
              {passes.map((pass, index) => (
                <View key={pass.pass_id} style={styles.passCard}>
                  <View style={styles.passHeader}>
                    <Text style={styles.passTitle}>Pass {index + 1}</Text>
                    <TouchableOpacity onPress={() => removePass(index)}>
                      <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.passInput}
                    placeholder="Ticket Name"
                    value={pass.name}
                    onChangeText={(text) => updatePass(index, 'name', text)}
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={styles.passInput}
                    placeholder="Ticket Fee"
                    value={pass.price > 0 ? pass.price.toString() : ''}
                    onChangeText={(text) => updatePass(index, 'price', parseFloat(text) || 0)}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={[styles.passInput, styles.passDescription]}
                    placeholder="Description (Optional)"
                    value={pass.description}
                    onChangeText={(text) => updatePass(index, 'description', text)}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#999"
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.addPassButton} onPress={addPass}>
                <Text style={styles.addPassText}>+ Add Type</Text>
              </TouchableOpacity>
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
              return (
                <View key={settingId} style={styles.additionalDetailCard}>
                  <Text style={styles.additionalDetailLabel}>{setting?.label}</Text>
                  <TextInput
                    style={styles.additionalDetailInput}
                    placeholder={`${setting?.label} details`}
                    value={additionalDetails[settingId]?.title || ''}
                    onChangeText={(text) =>
                      setAdditionalDetails({
                        ...additionalDetails,
                        [settingId]: { ...additionalDetails[settingId], title: text },
                      })
                    }
                    placeholderTextColor="#999"
                  />
                </View>
              );
            })}
          </View>

          {/* Event Production */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Event Production</Text>
              <TouchableOpacity onPress={addEventProduction}>
                <Ionicons name="add" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.productionTags}>
              {eventProduction.map((prod, index) => (
                <View key={index} style={styles.productionTag}>
                  <Text style={styles.productionTagText}>{prod}</Text>
                  <TouchableOpacity onPress={() => removeEventProduction(index)}>
                    <Ionicons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Additional Toggles */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Venue Required</Text>
            <Switch
              value={venueRequired}
              onValueChange={setVenueRequired}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Women Only</Text>
            <Switch
              value={womenOnly}
              onValueChange={setWomenOnly}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Allow View Guest List</Text>
            <Switch
              value={allowViewGuestList}
              onValueChange={setAllowViewGuestList}
              trackColor={{ false: '#E5E5E5', true: '#8B5CF6' }}
              thumbColor="#FFF"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
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
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 16,
  },
  mediaSection: {
    marginBottom: 16,
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
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 12,
    textTransform: 'uppercase',
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
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
