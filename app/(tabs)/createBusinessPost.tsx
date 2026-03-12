import { apiService } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser } from "@/store/slices/profileSlice";
import { setPostCreated } from "@/store/slices/postCreatedSlice";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import BusinessCard from "@/components/BusinessCard";
import BusinessPlanDetailPreview from "@/components/BusinessPlanDetailPreview";
import { EventCard } from "@/components/SwipeableEventCard";
import CalendarPicker from "@/components/CalendarPicker";
import ShareToChatModal from "@/components/ShareToChatModal";
import FormBuilder, { FormField } from "@/components/FormBuilder";
import FormSelector from "@/components/FormSelector";
import FormEditor from "@/components/FormEditor";

const CATEGORY_TAGS = [
  "Running",
  "Sports",
  "Fitness/Training",
  "Social/Community",
];

const CATEGORY_ICONS: Record<string, string> = {
  Running: "walk-outline",
  Sports: "basketball-outline",
  "Fitness/Training": "barbell-outline",
  "Social/Community": "people-outline",
};

// Previously used categories – hidden per design; uncomment to restore
// const CATEGORY_TAGS_OLD = ['Music', 'Cafe', 'Clubs', 'Sports', 'Comedy', 'Travel'];
// const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
//   Music: ['Rave', 'Live Music', 'DJ', 'Concert', 'Karaoke'],
//   Cafe: ['Coffee', 'Brunch', 'Work'],
//   Clubs: ['Nightlife', 'Lounge'],
//   Sports: ['Running', 'Cycling', 'Football', 'Yoga', 'Weekend'],
//   Comedy: ['Standup', 'Open Mic'],
//   Travel: ['Road Trip', 'Hitchhiking', 'Weekend', 'Evening'],
// };
const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  Running: [],
  Sports: [],
  "Fitness/Training": [],
  "Social/Community": [],
};

const MAX_MEDIA = 2;

// Icons match assets/icons/*.svg replaced by React icons: Map pin → location-outline, Ticket_alt → pricetag-outline, t-shirt → shirt-outline, etc. (see constants/assetIcons.ts)
const ADDITIONAL_SETTINGS = [
  {
    id: "distance",
    label: "Distance",
    icon: "location-outline",
    placeholder: "e.g. 5k",
  },
  {
    id: "starting_point",
    label: "Starting Point",
    icon: "navigate-outline",
    placeholder: "e.g. Alienkind Indiranagar",
  },
  {
    id: "f&b",
    label: "F&B",
    icon: "restaurant-outline",
    placeholder: "e.g. Post Run Coffee",
  },
  {
    id: "dress_code",
    label: "Dress Code",
    icon: "shirt-outline",
    placeholder: "e.g. Cafe Joggers",
  },
  {
    id: "music_type",
    label: "Music Type",
    icon: "musical-notes-outline",
    placeholder: "e.g. Electronic",
  },
  // Strava profile link – only relevant when category is Running.
  {
    id: "strava_link",
    label: "Strava Link",
    icon: "link-outline",
    placeholder: "https://www.strava.com/athletes/...",
  },
  {
    id: "links",
    label: "Links",
    icon: "link-outline",
    placeholder: "https://...",
  },
  {
    id: "google_drive_link",
    label: "Link for photos",
    icon: "cloud-download-outline",
    placeholder: "https://drive.google.com/recent_run",
  },
];

interface Pass {
  pass_id: string;
  name: string;
  price: number;
  description: string;
  capacity?: number;
  media?: { uri: string; type: "image" }[];
  isExisting?: boolean; // true when loaded from plan (edit mode) – not removable/editable
}

export default function CreateBusinessPostScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser } = useAppSelector((state) => state.profile);

  // Redirect to login when not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Check if user is business user
  const isBusinessUser = currentUser?.is_business === true;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);
  const [location, setLocation] = useState("Bengaluru");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [startTimeText, setStartTimeText] = useState("");
  const [endTimeText, setEndTimeText] = useState("");
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showTimeWheelPicker, setShowTimeWheelPicker] = useState(false);
  const [timeWheelTarget, setTimeWheelTarget] = useState<"start" | "end">(
    "start",
  );
  const [wheelHour, setWheelHour] = useState(9);
  const [wheelMinute, setWheelMinute] = useState(0);
  const [wheelAmPm, setWheelAmPm] = useState<"AM" | "PM">("AM");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    [],
  );
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [selectedAdditionalSettings, setSelectedAdditionalSettings] = useState<
    string[]
  >([]);
  const [additionalDetails, setAdditionalDetails] = useState<{
    [key: string]: { title: string; description: string };
  }>({});
  // Custom additional info fields (allow user to add multiple custom fields)
  const [customAdditionalInfo, setCustomAdditionalInfo] = useState<
    Array<{ id: string; heading: string; description: string }>
  >([]);

  // remove strava link when category changes away from Running
  useEffect(() => {
    if (selectedCategory && selectedCategory !== "Running") {
      setSelectedAdditionalSettings((prev) =>
        prev.filter((id) => id !== "strava_link"),
      );
      setAdditionalDetails((prev) => {
        const { strava_link, ...rest } = prev;
        return rest;
      });
    }
  }, [selectedCategory]);
  const [womenOnly, setWomenOnly] = useState(false);
  const [hideGuestListFromViewers, setHideGuestListFromViewers] =
    useState(false);
  const [shareToAnnouncementGroup, setShareToAnnouncementGroup] =
    useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [previewPassIndex, setPreviewPassIndex] = useState<number>(0);
  const [showPostSuccessModal, setShowPostSuccessModal] = useState(false);
  const [createdPlanIdForSuccess, setCreatedPlanIdForSuccess] = useState<
    string | null
  >(null);
  const [showShareToChatModal, setShowShareToChatModal] = useState(false);
  const [startAmPm, setStartAmPm] = useState<"AM" | "PM">("AM");
  const [endAmPm, setEndAmPm] = useState<"AM" | "PM">("PM");
  const [additionalSettingsExpanded, setAdditionalSettingsExpanded] =
    useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(100);
  const isEditFlowRef = useRef(false);
  const openedFromMyPlansRef = useRef(false);
  const insets = useSafeAreaInsets();

  // Form-related state
  const [formId, setFormId] = useState<string | null>(null);
  const [showFormSelector, setShowFormSelector] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [attachFormEnabled, setAttachFormEnabled] = useState(false);
  const [mostRecentFormFields, setMostRecentFormFields] = useState<FormField[]>(
    [],
  );
  const [draftFormFields, setDraftFormFields] = useState<FormField[]>([]);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [selectedForm, setSelectedForm] = useState<{
    form_id: string;
    name: string;
    fields: FormField[];
  } | null>(null);

  // Registration limit state
  const [limitRegistrationEnabled, setLimitRegistrationEnabled] =
    useState(false);
  const [registrationLimit, setRegistrationLimit] = useState("");

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setMedia([]);
    setLocation("");
    setSelectedDate(null);
    setShowDatePicker(false);
    setTimeEnabled(false);
    setStartTime(null);
    setEndTime(null);
    setStartTimeText("");
    setEndTimeText("");
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowTimeWheelPicker(false);
    setSelectedCategory("");
    setSelectedSubcategories([]);
    setShowPostSuccessModal(false);
    setCreatedPlanIdForSuccess(null);
  }, [setSelectedSubcategories]);

  const normalizeTimeInput = (raw: string) => {
    const cleaned = raw.replace(/[^\d:]/g, "");
    if (!cleaned) return "";

    if (cleaned.includes(":")) {
      const parts = cleaned.split(":");
      const h = parts[0] ?? "";
      const m = (parts[1] ?? "").slice(0, 2);
      if (!h) return "";
      const hh = h.slice(0, 2);
      const mm = m.padEnd(2, "0");
      return `${hh}:${mm}`;
    }
    if (/^\d{1,2}$/.test(cleaned)) {
      return `${cleaned}:00`;
    }
    if (/^\d{3,4}$/.test(cleaned)) {
      const h = cleaned.slice(0, cleaned.length - 2);
      const m = cleaned.slice(-2);
      return `${h}:${m}`;
    }
    return cleaned.slice(0, 5);
  };

  const formatTime = (d: Date) => {
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const mm = String(minutes).padStart(2, "0");
    return `${h12}:${mm} ${ampm}`;
  };

  const parseTimeText = (timeText: string): Date | null => {
    if (!timeText) return null;
    const match = timeText.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (minute < 0 || minute > 59) return null;
    if (hour < 1 || hour > 12) return null;

    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const openTimeWheel = (target: "start" | "end") => {
    setTimeWheelTarget(target);
    const currentText = target === "start" ? startTimeText : endTimeText;
    const currentAmPm = target === "start" ? startAmPm : endAmPm;
    const base = currentText.replace(/\s*AM|PM/i, "").trim();
    const match = base.match(/^(\d{1,2}):(\d{2})$/);
    const h = match ? Math.min(12, Math.max(1, Number(match[1]))) : 9;
    const m = match ? Math.min(59, Math.max(0, Number(match[2]))) : 0;
    setWheelHour(h);
    setWheelMinute(m);
    setWheelAmPm(currentAmPm);
    setShowTimeWheelPicker(true);
  };

  const saveTimeWheel = () => {
    const mm = String(wheelMinute).padStart(2, "0");
    const value = `${wheelHour}:${mm} ${wheelAmPm}`;
    const parsed = parseTimeText(value);

    if (timeWheelTarget === "start") {
      setStartAmPm(wheelAmPm);
      setStartTimeText(value);
      if (parsed) setStartTime(parsed);
    } else {
      setEndAmPm(wheelAmPm);
      setEndTimeText(value);
      if (parsed) setEndTime(parsed);
    }
    setShowTimeWheelPicker(false);
  };

  // utility to validate URLs (used by the Strava field)
  const isValidUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddMediaFromSource = async (source: "camera" | "gallery") => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Please grant camera permission to take photos.",
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Please grant photo permission.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsMultipleSelection: true,
          allowsEditing: false,
          quality: 0.8,
          selectionLimit: Math.max(0, MAX_MEDIA - media.length),
        });
      }

      if (!result.canceled && result.assets) {
        const newMedia = result.assets
          .slice(0, Math.max(0, MAX_MEDIA - media.length))
          .map((asset) => ({
            uri: asset.uri,
            type:
              asset.type === "video"
                ? ("video" as const)
                : ("image" as const),
          }));
        setMedia((prev) => [...prev, ...newMedia]);
      }
    } catch (error) {
      console.error("Error picking media:", error);
    }
  };

  const handleAddMedia = () => {
    Alert.alert("Add Media", "Choose source", [
      { text: "Cancel", style: "cancel" },
      { text: "Camera", onPress: () => handleAddMediaFromSource("camera") },
      {
        text: "Gallery",
        onPress: () => handleAddMediaFromSource("gallery"),
      },
    ]);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const addPass = () => {
    const newPass: Pass = {
      pass_id: `pass_${Date.now()}_${Math.random()}`,
      name: "",
      price: -1,
      description: "",
      media: [],
    };
    setPasses((prev) => [...prev, newPass]);
  };

  const updatePass = (index: number, key: keyof Pass, value: any) => {
    setPasses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const removePass = (index: number) => {
    setPasses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPassImage = async (passIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant photo permission.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        updatePass(passIndex, "media", [{ uri, type: "image" }]);
      }
    } catch (e) {
      console.error("Error picking pass image:", e);
    }
  };

  const removePassImage = (passIndex: number) => {
    updatePass(passIndex, "media", []);
  };

  const toggleAdditionalSetting = (settingId: string) => {
    if (settingId === "strava_link" && selectedCategory !== "Running") {
      return;
    }
    setSelectedAdditionalSettings((prev) => {
      const exists = prev.includes(settingId);
      const next = exists ? prev.filter((id) => id !== settingId) : [...prev, settingId];
      return next;
    });
    setAdditionalDetails((prev) => {
      if (prev[settingId]) {
        const { [settingId]: _removed, ...rest } = prev;
        return rest;
      }
      const placeholder =
        ADDITIONAL_SETTINGS.find((s) => s.id === settingId)?.placeholder ?? "";
      return {
        ...prev,
        [settingId]: { title: "", description: placeholder ? "" : "" },
      };
    });
  };

  const handleFormSelectorSelect = async (selectedFormId: string) => {
    try {
      setSavingForm(true);
      setShowFormSelector(false);
      setFormId(selectedFormId);
      const resp = await apiService.getForm(selectedFormId);
      const f = (resp as any)?.data;
      const name = f?.name ?? "";
      const fields = Array.isArray(f?.fields) ? (f.fields as FormField[]) : [];
      setSelectedForm({ form_id: selectedFormId, name, fields });
      setDraftFormFields(fields);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load form");
      setFormId(null);
      setSelectedForm(null);
      setDraftFormFields([]);
    } finally {
      setSavingForm(false);
    }
  };

  const handleFormBuilderSave = async (fields: FormField[]) => {
    try {
      setSavingForm(true);
      const payload = {
        user_id: user?.user_id,
        name: "Untitled Form",
        fields,
      };
      const resp = await apiService.createForm(payload as any);
      const createdId = (resp as any)?.data?.form_id;
      if (createdId) {
        setFormId(createdId);
        setSelectedForm({ form_id: createdId, name: payload.name, fields });
        setDraftFormFields(fields);
      }
      setMostRecentFormFields(fields);
      setShowFormBuilder(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save form");
    } finally {
      setSavingForm(false);
    }
  };

  const handleFormEditorSave = async (form: any) => {
    try {
      setSavingForm(true);
      const payload = {
        user_id: user?.user_id,
        name: form.name,
        fields: form.fields,
      };
      const resp = await apiService.updateForm(selectedForm?.form_id || "", payload);
      const updatedId = (resp as any)?.data?.form_id;
      if (updatedId) {
        setFormId(updatedId);
        setSelectedForm({ form_id: updatedId, name: form.name, fields: form.fields });
      }
      setDraftFormFields(form.fields);
      setShowFormEditor(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save form");
    } finally {
      setSavingForm(false);
    }
  };

  const formatPreviewData = () => {
    const add_details = selectedAdditionalSettings.map((settingId) => {
      const isAdditionalInfo = settingId === "additional_info";
      return {
        detail_type: settingId,
        title:
          additionalDetails[settingId]?.title ??
          (isAdditionalInfo
            ? ""
            : (ADDITIONAL_SETTINGS.find((s) => s.id === settingId)?.label ??
              settingId)),
        description: additionalDetails[settingId]?.description ?? "",
        ...(isAdditionalInfo
          ? { heading: additionalDetails[settingId]?.title ?? "" }
          : {}),
      };
    });
    // Also add custom additional info fields
    customAdditionalInfo.forEach((field) => {
      add_details.push({
        detail_type: "additional_info",
        title: field.heading,
        description: field.description,
        heading: field.heading,
      });
    });
    return {
      plan_id: "preview",
      title: title || "Event Title",
      description: description || "Event description",
      media:
        media.length > 0
          ? media.map((m) => ({ url: m.uri, type: m.type }))
          : [],
      location_text: location || undefined,
      date: selectedDate ? selectedDate : undefined,
      time: (() => {
        const s = startTime || parseTimeText(startTimeText);
        return timeEnabled && s ? formatTime(s) : undefined;
      })(),
      category_sub:
        selectedSubcategories.length > 0
          ? selectedSubcategories
          : selectedCategory
            ? [selectedCategory]
            : [],
      add_details: add_details.length > 0 ? add_details : undefined,
      passes: passes
        .filter((p) => p.name && p.price >= 0)
        .map((p) => ({
          pass_id: p.pass_id,
          name: p.name,
          price: p.price,
          description: p.description ?? "",
          media: p.media?.map((m) => ({ url: m.uri, type: m.type })),
        })),
      user: currentUser
        ? {
            user_id: currentUser.user_id,
            name: currentUser.name || "Organizer",
            profile_image: currentUser.profile_image ?? undefined,
          }
        : undefined,
    };
  };

  const handlePreview = () => {
    if (media.length === 0) {
      Alert.alert(
        "Validation",
        "Please add at least one image to preview the plan.",
      );
      return;
    }
    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Validation", "Plan Description is required");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Validation", "Category is required");
      return;
    }
    if (ticketsEnabled && passes.length === 0) {
      Alert.alert("Validation", "Please add at least one ticket with a price");
      return;
    }
    if (ticketsEnabled && passes.some((p) => !p.name.trim() || p.price < 0)) {
      Alert.alert(
        "Validation",
        "All tickets must have a name and a valid price (0 or more)",
      );
      return;
    }
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    // Check for authentication
    if (!user?.access_token || !user?.user_id) {
      Alert.alert("Error", "Please log in to create a business plan");
      return;
    }

    // Check if user is business user
    if (!currentUser?.is_business) {
      Alert.alert(
        "Error",
        "Only business users can create business plans. Please contact support to enable business account.",
      );
      return;
    }

    // Validate required fields: Title, Description, Category, and Ticket fee (if tickets enabled)
    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Validation", "Plan Description is required");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Validation", "Category is required");
      return;
    }
    if (ticketsEnabled && passes.length === 0) {
      Alert.alert("Validation", "Please add at least one ticket with a price");
      return;
    }
    if (ticketsEnabled && passes.some((p) => !p.name.trim() || p.price < 0)) {
      Alert.alert(
        "Validation",
        "All tickets must have a name and a valid price (0 or more for free)",
      );
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
          formData.append("files", {
            uri: item.uri,
            type: item.type === "video" ? "video/mp4" : "image/jpeg",
            name: `media-${index}.${item.type === "video" ? "mp4" : "jpg"}`,
          } as any);
          hasFiles = true;
        });
      }

      // Prepare add_details from additional settings
      const addDetails = selectedAdditionalSettings.map((settingId) => {
        const isAdditionalInfo = settingId === "additional_info";
        const payload: {
          detail_type: string;
          title?: string;
          description?: string;
          heading?: string;
        } = {
          detail_type: settingId,
          title:
            additionalDetails[settingId]?.title ??
            (isAdditionalInfo
              ? ""
              : (ADDITIONAL_SETTINGS.find((s) => s.id === settingId)?.label ??
                settingId)),
          description: additionalDetails[settingId]?.description ?? "",
        };
        if (isAdditionalInfo)
          payload.heading = additionalDetails[settingId]?.title ?? "";
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
        category_sub:
          selectedSubcategories.length > 0
            ? selectedSubcategories
            : selectedCategory
              ? [selectedCategory]
              : [],
      };

      // Only set post_status when creating, not when editing
      if (!editMode) {
        planData.post_status = "published";
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
        planData.passes = passes
          .filter((p) => p.name && p.price >= 0)
          .map((p) => ({
            pass_id: p.pass_id,
            name: p.name,
            price: p.price,
            description: p.description || "",
            capacity: p.capacity || 1,
            media:
              p.media && p.media.length > 0
                ? [{ url: p.media[0].uri, type: "image" as const }]
                : undefined,
          }));
        planData.is_paid_plan = true;
        planData.registration_required = true;
      }
      if (addDetails.length > 0 || customAdditionalInfo.length > 0) {
        const allAddDetails = addDetails.concat(
          customAdditionalInfo.map((field) => ({
            detail_type: "additional_info",
            title: field.heading,
            heading: field.heading,
            description: field.description,
          })),
        );
        planData.add_details = allAddDetails;
      }
      if (formId) {
        planData.form_id = formId;
      }
      if (limitRegistrationEnabled && registrationLimit) {
        planData.registration_limit = parseInt(registrationLimit, 10) + 1;
      } else if (editMode) {
        planData.registration_limit = null;
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
        Object.keys(planData).forEach((key) => {
          const value = planData[key];
          if (value !== undefined && value !== null) {
            if (typeof value === "object" && !Array.isArray(value)) {
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
          hasFiles ? formData : undefined,
        );
        if (response.success) {
          if (shareToAnnouncementGroup) {
            try {
              const annRes = await apiService.getOrCreateAnnouncementGroup();
              const groupId =
                (annRes as any)?.data?.group_id ?? (annRes as any)?.group_id;
              if (groupId && user.user_id) {
                const shareMedia =
                  media.length > 0
                    ? media.map((m) => ({ url: m.uri, type: m.type }))
                    : [];
                await apiService.sendMessage(groupId, user.user_id, "plan", {
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
              console.warn("Failed to share to announcement group:", shareErr);
            }
          }
          isEditFlowRef.current = false;
          Alert.alert("Success", "Business plan updated successfully!", [
            {
              text: "OK",
              onPress: () => {
                setEditMode(false);
                setPlanId(null);
                if (openedFromMyPlansRef.current) {
                  router.replace("/profile/your-plans");
                } else {
                  router.replace("/(tabs)");
                }
              },
            },
          ]);
        }
      } else {
        // Create new business plan
        if (!user?.access_token) {
          Alert.alert("Error", "Session expired. Please log in again.");
          setIsSubmitting(false);
          return;
        }
        console.log(
          "[CreateBusinessPost] Calling create API, hasFiles:",
          hasFiles,
        );
        response = await apiService.createBusinessPlan(
          user.access_token,
          hasFiles ? {} : planData,
          hasFiles ? formData : undefined,
        );
        const createdPlanId =
          (response as any)?.data?.post_id ??
          (response as any)?.post_id ??
          null;
        const ok = (response as any)?.success === true || createdPlanId != null;
        if (!ok) {
          const msg =
            (response as any)?.message ||
            "Server did not return a post ID. Please try again.";
          Alert.alert("Error", msg);
          setIsSubmitting(false);
          return;
        }
        if (shareToAnnouncementGroup && createdPlanId) {
          try {
            const annRes = await apiService.getOrCreateAnnouncementGroup();
            const groupId =
              (annRes as any)?.data?.group_id ?? (annRes as any)?.group_id;
            if (groupId && user.user_id) {
              const shareMedia =
                media.length > 0
                  ? media.map((m) => ({ url: m.uri, type: m.type }))
                  : [];
              await apiService.sendMessage(groupId, user.user_id, "plan", {
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
            console.warn("Failed to share to announcement group:", shareErr);
          }
        }
        dispatch(
          setPostCreated({
            planId: createdPlanId,
            title: title.trim(),
            description: description.trim(),
            media: media.map((m) => ({ url: m.uri, type: m.type })),
            tags:
              selectedSubcategories.length > 0
                ? selectedSubcategories
                : selectedCategory
                  ? [selectedCategory]
                  : [],
            category_main: selectedCategory?.toLowerCase(),
          }),
        );
        isEditFlowRef.current = false;
        setCreatedPlanIdForSuccess(createdPlanId);
        setShowPreview(false); // Close preview so main view (with success modal) is shown
        setShowPostSuccessModal(true);
      }
    } catch (error: any) {
      // Provide more detailed error messages
      let errorMessage = error.message || "Failed to create business plan";

      // Check for common validation errors
      if (
        errorMessage.includes("business_id") ||
        errorMessage.includes("BusinessPlan validation failed")
      ) {
        errorMessage =
          "Business ID is missing. Please ensure your account has business status enabled.";
      } else if (
        errorMessage.includes("title") ||
        errorMessage.includes("Title")
      ) {
        errorMessage =
          "Title is required. Please enter a title for your business plan.";
      } else if (
        errorMessage.includes("description") ||
        errorMessage.includes("Description")
      ) {
        errorMessage =
          "Plan Description is required. Please enter a description for your business plan.";
      } else if (
        errorMessage.includes("category") ||
        errorMessage.includes("Category")
      ) {
        errorMessage =
          "Category is required. Please select a category for your business plan.";
      }

      Alert.alert("Error", errorMessage);
      console.error("Business plan creation error:", error);
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Modal visible animationType="fade" statusBarTranslucent>
          <SafeAreaView style={styles.modalScreen}>
            <View style={styles.modalContentCenter}>
              <View style={styles.previewCardContainer}>
                <BusinessCard
                  plan={previewData}
                  user={{
                    id: currentUser?.user_id ?? "preview",
                    name: currentUser?.name || "You",
                    avatar: currentUser?.profile_image ?? "",
                    time: "Preview",
                  }}
                  hideActions={false}
                  registerButtonGreyed={true}
                  shareButtonGreyed={true}
                  onRegisterPress={() => {}}
                  isSwipeable={false}
                />
              </View>
            </View>

            <View
              style={[
                styles.previewStickyBar,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionButton, styles.previewEditButton]}
                onPress={() => setShowPreview(false)}
              >
                <Text style={styles.previewEditButtonText}>Back to edit</Text>
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
          </SafeAreaView>
        </Modal>
      </GestureHandlerRootView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.createPostHeader}>
        <TouchableOpacity
          onPress={() => {
            if (editMode || openedFromMyPlansRef.current) {
              router.replace("/profile/your-plans");
            } else {
              router.back();
            }
          }}
          style={styles.backButtonHeader}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.createPostHeaderTitle}>
          {editMode ? "Editing post" : "Create Post"}
        </Text>
        <View style={styles.backButtonHeader} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Title – with label */}
          <View style={styles.sectionCard}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />
          </View>

          {/* Event Description – label + expands as text increases */}
          <View style={styles.sectionCard}>
            <TextInput
              style={[
                styles.descriptionInput,
                { minHeight: Math.max(100, descriptionHeight) },
              ]}
              placeholder="Plan Description"
              value={description}
              onChangeText={setDescription}
              multiline
              onContentSizeChange={(e) =>
                setDescriptionHeight(e.nativeEvent.contentSize.height + 24)
              }
              placeholderTextColor="#999"
            />
          </View>

          {/* Media - with section label; Add Media as smaller button */}
          <View style={[styles.sectionCard, styles.mediaSection]}>
            {media.length > 0 ? (
              <View style={styles.mediaList}>
                {media.map((item, index) => (
                  <View
                    key={`${item.uri}-${index}`}
                    style={styles.mediaPreviewWrap}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.mediaThumb}
                    />
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => removeMedia(index)}
                    >
                      <Ionicons name="close" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {media.length < MAX_MEDIA && (
                  <TouchableOpacity
                    style={styles.addMediaThumb}
                    onPress={handleAddMedia}
                  >
                    <Ionicons name="add" size={28} color="#666" />
                    <Text style={styles.addMediaThumbText}>
                      {media.length}/{MAX_MEDIA}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addMediaButtonSmall}
                onPress={handleAddMedia}
              >
                <Ionicons name="add" size={20} color="#666" />
                <Text style={styles.addMediaTextSmall}>Add Media</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          <View style={styles.sectionCard}>
            <TextInput
              style={styles.locationInputPill}
              placeholder="Location"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#999"
            />
          </View>

          {/* Date */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.dateRow}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={
                  selectedDate ? styles.inputText : styles.inputPlaceholder
                }
              >
                {selectedDate
                  ? (() => {
                      const d = selectedDate;
                      const day = d.getDate();
                      const suffix =
                        day === 1 || day === 21 || day === 31
                          ? "st"
                          : day === 2 || day === 22
                            ? "nd"
                            : day === 3 || day === 23
                              ? "rd"
                              : "th";
                      return `${day}${suffix} ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
                    })()
                  : "Date of Event"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>

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
          <View style={[styles.sectionCard, styles.sectionCardCompact]}>
            <View style={[styles.toggleRow, styles.toggleRowCompact]}>
              <Text style={styles.toggleLabel}>Time of Event</Text>
              <Switch
                value={timeEnabled}
                onValueChange={setTimeEnabled}
                trackColor={{ false: "#E5E5E5", true: "#8B5CF6" }}
                thumbColor="#FFF"
              />
            </View>

            {timeEnabled && (
              <>
                <View style={[styles.timeRow, styles.timeRowCompact]}>
                  <TouchableOpacity
                    style={[styles.input, styles.timeInput, styles.timeWheelTap]}
                    onPress={() => openTimeWheel("start")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        startTimeText
                          ? styles.inputText
                          : styles.inputPlaceholder
                      }
                    >
                      {startTimeText ? startTimeText : "Select start time"}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.amPmBox}>
                    <TouchableOpacity
                      style={[
                        styles.amPmOption,
                        startAmPm === "AM" && styles.amPmOptionSelected,
                      ]}
                      onPress={() => {
                        setStartAmPm("AM");
                        const t = startTimeText.replace(/\s*AM|PM/i, "").trim();
                        if (t) {
                          setStartTimeText(`${t} AM`);
                          const p = parseTimeText(`${t} AM`);
                          if (p) setStartTime(p);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.amPmOptionText,
                          startAmPm === "AM" && styles.amPmOptionTextSelected,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.amPmOption,
                        startAmPm === "PM" && styles.amPmOptionSelected,
                      ]}
                      onPress={() => {
                        setStartAmPm("PM");
                        const t = startTimeText.replace(/\s*AM|PM/i, "").trim();
                        if (t) {
                          setStartTimeText(`${t} PM`);
                          const p = parseTimeText(`${t} PM`);
                          if (p) setStartTime(p);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.amPmOptionText,
                          startAmPm === "PM" && styles.amPmOptionTextSelected,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.timeRow, styles.timeRowCompact]}>
                  <TouchableOpacity
                    style={[styles.input, styles.timeInput, styles.timeWheelTap]}
                    onPress={() => openTimeWheel("end")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        endTimeText
                          ? styles.inputText
                          : styles.inputPlaceholder
                      }
                    >
                      {endTimeText ? endTimeText : "Select end time (optional)"}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.amPmBox}>
                    <TouchableOpacity
                      style={[
                        styles.amPmOption,
                        endAmPm === "AM" && styles.amPmOptionSelected,
                      ]}
                      onPress={() => {
                        setEndAmPm("AM");
                        const t = endTimeText.replace(/\s*AM|PM/i, "").trim();
                        if (t) {
                          setEndTimeText(`${t} AM`);
                          const p = parseTimeText(`${t} AM`);
                          if (p) setEndTime(p);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.amPmOptionText,
                          endAmPm === "AM" && styles.amPmOptionTextSelected,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.amPmOption,
                        endAmPm === "PM" && styles.amPmOptionSelected,
                      ]}
                      onPress={() => {
                        setEndAmPm("PM");
                        const t = endTimeText.replace(/\s*AM|PM/i, "").trim();
                        if (t) {
                          setEndTimeText(`${t} PM`);
                          const p = parseTimeText(`${t} PM`);
                          if (p) setEndTime(p);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.amPmOptionText,
                          endAmPm === "PM" && styles.amPmOptionTextSelected,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>

          <Modal
            visible={showTimeWheelPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimeWheelPicker(false)}
          >
            <View style={styles.iosTimeOverlay}>
              <TouchableOpacity 
                style={styles.iosTimeBackdrop}
                activeOpacity={1}
                onPress={() => setShowTimeWheelPicker(false)}
              />
              <View style={styles.iosTimeContainer}>
                <View style={styles.iosTimeHeader}>
                  <TouchableOpacity
                    onPress={() => setShowTimeWheelPicker(false)}
                    style={styles.iosTimeCancelButton}
                  >
                    <Text style={styles.iosTimeCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.iosTimeTitle}>
                    {timeWheelTarget === "start" ? "Start Time" : "End Time"}
                  </Text>
                  <TouchableOpacity
                    onPress={saveTimeWheel}
                    style={styles.iosTimeConfirmButton}
                  >
                    <Text style={styles.iosTimeConfirmText}>Done</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.iosTimePickerContainer}>
                  <View style={styles.iosTimeColumn}>
                    <ScrollView 
                      style={styles.iosTimeScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.iosTimeOption,
                            wheelHour === hour && styles.iosTimeOptionSelected
                          ]}
                          onPress={() => setWheelHour(hour)}
                        >
                          <Text style={[
                            styles.iosTimeOptionText,
                            wheelHour === hour && styles.iosTimeOptionTextSelected
                          ]}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <Text style={styles.iosTimeSeparator}>:</Text>

                  <View style={styles.iosTimeColumn}>
                    <ScrollView 
                      style={styles.iosTimeScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((minute) => {
                        const label = String(minute).padStart(2, "0");
                        return (
                          <TouchableOpacity
                            key={minute}
                            style={[
                              styles.iosTimeOption,
                              wheelMinute === minute && styles.iosTimeOptionSelected
                            ]}
                            onPress={() => setWheelMinute(minute)}
                          >
                            <Text style={[
                              styles.iosTimeOptionText,
                              wheelMinute === minute && styles.iosTimeOptionTextSelected
                            ]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.iosTimeColumn}>
                    <ScrollView 
                      style={styles.iosTimeScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {["AM", "PM"].map((period) => (
                        <TouchableOpacity
                          key={period}
                          style={[
                            styles.iosTimeOption,
                            wheelAmPm === period && styles.iosTimeOptionSelected
                          ]}
                          onPress={() => setWheelAmPm(period as "AM" | "PM")}
                        >
                          <Text style={[
                            styles.iosTimeOptionText,
                            wheelAmPm === period && styles.iosTimeOptionTextSelected
                          ]}>
                            {period}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Category – icons in pills; pills white when unselected */}
          <View style={[styles.section, styles.sectionCard]}>
            <Text style={styles.sectionTitle}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {CATEGORY_TAGS.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category &&
                        styles.categoryChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      setSelectedSubcategories((prev) =>
                        prev.filter((s) =>
                          (CATEGORY_SUBCATEGORIES[category] || []).includes(s),
                        ),
                      );
                    }}
                  >
                    <Ionicons
                      name={
                        (CATEGORY_ICONS[category] || "pricetag-outline") as any
                      }
                      size={18}
                      color={selectedCategory === category ? "#FFF" : "#1C1C1E"}
                      style={styles.categoryChipIcon}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {selectedCategory &&
              (CATEGORY_SUBCATEGORIES[selectedCategory]?.length ?? 0) > 0 && (
                <View style={styles.subcategorySection}>
                  <Text style={styles.subcategoryLabel}>
                    Subcategories (optional)
                  </Text>
                  <View style={styles.subcategoryChips}>
                    {(CATEGORY_SUBCATEGORIES[selectedCategory] || []).map(
                      (sub) => {
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
                                setSelectedSubcategories((prev) =>
                                  prev.filter((s) => s !== sub),
                                );
                              } else {
                                // Only one subcategory per category: replace any sub for this category with the selected one
                                const subsForCategory =
                                  CATEGORY_SUBCATEGORIES[selectedCategory] ||
                                  [];
                                setSelectedSubcategories((prev) => [
                                  ...prev.filter(
                                    (s) => !subsForCategory.includes(s),
                                  ),
                                  sub,
                                ]);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.subcategoryChipText,
                                isSelected &&
                                  styles.subcategoryChipTextSelected,
                              ]}
                            >
                              {sub}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </View>
              )}
          </View>

          {/* Tickets */}
          <View
            style={[
              styles.sectionCard,
              styles.sectionCardCompact,
              ticketsEnabled && styles.ticketsSectionWhenOn,
            ]}
          >
            <View style={[styles.toggleRow, styles.toggleRowCompact]}>
              <Text style={styles.toggleLabel}>Tickets</Text>
              <Switch
                value={ticketsEnabled}
                onValueChange={(value) => {
                  setTicketsEnabled(value);
                  if (value && passes.length === 0) addPass();
                }}
                trackColor={{ false: "#E5E5E5", true: "#8B5CF6" }}
                thumbColor="#FFF"
              />
            </View>

            {ticketsEnabled && (
              <View style={styles.passesSection}>
                {/* Add media – just below ticket title; gray bg */}
                <TouchableOpacity
                  style={styles.ticketAddMediaButton}
                  onPress={() =>
                    passes[0] && !(editMode && passes[0].isExisting)
                      ? handleAddPassImage(0)
                      : undefined
                  }
                  disabled={editMode && passes[0]?.isExisting}
                >
                  <Ionicons name="image-outline" size={18} color="#1C1C1E" />
                  <Text style={styles.ticketAddMediaButtonText}>Add media</Text>
                </TouchableOpacity>
                {/* Small preview of uploaded ticket image below Add media */}
                {(passes[0]?.media?.length ?? 0) > 0 && (
                  <View style={styles.ticketImagePreviewWrap}>
                    <Image
                      source={{ uri: passes[0].media![0].uri }}
                      style={styles.ticketImagePreviewThumb}
                    />
                    {!(editMode && passes[0]?.isExisting) && (
                      <TouchableOpacity
                        style={styles.ticketImagePreviewRemove}
                        onPress={() => removePassImage(0)}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {passes.map((pass, index) => {
                  const isExistingTicket = editMode && pass.isExisting;
                  return (
                    <View key={pass.pass_id} style={styles.passCard}>
                      <View style={styles.passNamePriceRow}>
                        <TextInput
                          style={[styles.passInput, styles.passNameInRow]}
                          placeholder="Ticket Name"
                          value={pass.name}
                          onChangeText={(text) =>
                            !isExistingTicket && updatePass(index, "name", text)
                          }
                          placeholderTextColor="#8E8E93"
                          editable={!isExistingTicket}
                        />
                        <TextInput
                          style={[styles.passInput, styles.passPriceInRow]}
                          placeholder="Price"
                          value={pass.price >= 0 ? pass.price.toString() : ""}
                          onChangeText={(text) => {
                            if (isExistingTicket) return;
                            const digitsOnly = text.replace(/[^0-9]/g, "");
                            const num =
                              digitsOnly === "" ? -1 : parseInt(digitsOnly, 10);
                            updatePass(index, "price", num < 0 ? -1 : num);
                          }}
                          keyboardType="number-pad"
                          placeholderTextColor="#8E8E93"
                          editable={!isExistingTicket}
                        />
                        {passes.length > 1 &&
                          (!editMode || !pass.isExisting) && (
                            <TouchableOpacity
                              onPress={() => removePass(index)}
                              style={styles.passRemoveButton}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={20}
                                color="#666"
                              />
                            </TouchableOpacity>
                          )}
                      </View>
                      <TextInput
                        style={[styles.passInput, styles.passDescription]}
                        placeholder="Description (Optional)"
                        value={pass.description}
                        onChangeText={(text) =>
                          !isExistingTicket &&
                          updatePass(index, "description", text)
                        }
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#8E8E93"
                        editable={!isExistingTicket}
                      />
                    </View>
                  );
                })}
                {/* Bottom row: Add type (gray, left) | Preview ticket (black, right) */}
                <View style={styles.ticketsBottomRow}>
                  <TouchableOpacity
                    style={styles.ticketAddTypeButton}
                    onPress={addPass}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#1C1C1E"
                    />
                    <Text style={styles.ticketAddTypeButtonText}>Add type</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.previewTicketButtonBottom}
                    onPress={() => {
                      setPreviewPassIndex(0);
                      setShowTicketPreview(true);
                    }}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFF" />
                    <Text style={styles.previewTicketButtonBottomText}>
                      Preview ticket
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Share to community */}
          <View style={[styles.sectionCard, styles.sectionCardCompact]}>
            <View style={[styles.toggleRow, styles.toggleRowCompact]}>
              <Text style={styles.toggleLabel}>Share to community</Text>
              <Switch
                value={shareToAnnouncementGroup}
                onValueChange={setShareToAnnouncementGroup}
                trackColor={{ false: "#E5E5E5", true: "#8B5CF6" }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Additional Settings – collapsible, collapsed by default */}
          <View style={[styles.section, styles.sectionCard]}>
            <TouchableOpacity
              style={styles.additionalSettingsHeader}
              onPress={() => setAdditionalSettingsExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Additional Settings</Text>
              <Ionicons
                name={
                  additionalSettingsExpanded ? "chevron-up" : "chevron-down"
                }
                size={22}
                color="#666"
              />
            </TouchableOpacity>
            {additionalSettingsExpanded && (
              <>
                <View style={styles.settingsGrid}>
                  {ADDITIONAL_SETTINGS.filter(
                    (s) =>
                      s.id !== "strava_link" || selectedCategory === "Running",
                  ).map((setting) => (
                    <TouchableOpacity
                      key={setting.id}
                      style={[
                        styles.settingChip,
                        selectedAdditionalSettings.includes(setting.id) &&
                          styles.settingChipSelected,
                      ]}
                      onPress={() => toggleAdditionalSetting(setting.id)}
                    >
                      <Ionicons
                        name={setting.icon as any}
                        size={16}
                        color={
                          selectedAdditionalSettings.includes(setting.id)
                            ? "#FFF"
                            : "#666"
                        }
                      />
                      <Text
                        style={[
                          styles.settingChipText,
                          selectedAdditionalSettings.includes(setting.id) &&
                            styles.settingChipTextSelected,
                        ]}
                      >
                        {setting.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedAdditionalSettings.map((settingId) => {
                  const setting = ADDITIONAL_SETTINGS.find(
                    (s) => s.id === settingId,
                  );
                  const isAdditionalInfo = settingId === "additional_info";
                  return (
                    <View key={settingId} style={styles.additionalDetailCard}>
                      <Text style={styles.additionalDetailLabel}>
                        {setting?.label}
                      </Text>
                      {isAdditionalInfo ? (
                        <>
                          <TextInput
                            style={styles.additionalDetailInput}
                            placeholder="Heading"
                            value={additionalDetails[settingId]?.title || ""}
                            onChangeText={(text) =>
                              setAdditionalDetails({
                                ...additionalDetails,
                                [settingId]: {
                                  ...additionalDetails[settingId],
                                  title: text,
                                },
                              })
                            }
                            placeholderTextColor="#999"
                          />
                          <TextInput
                            style={[
                              styles.additionalDetailInput,
                              styles.additionalDetailDescription,
                            ]}
                            placeholder="Description"
                            value={
                              additionalDetails[settingId]?.description || ""
                            }
                            onChangeText={(text) =>
                              setAdditionalDetails({
                                ...additionalDetails,
                                [settingId]: {
                                  ...additionalDetails[settingId],
                                  description: text,
                                },
                              })
                            }
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={2}
                          />
                        </>
                      ) : (
                        <>
                          <TextInput
                            style={styles.additionalDetailInput}
                            placeholder={
                              (setting as any)?.placeholder ??
                              (setting?.label
                                ? `Enter ${setting.label}`
                                : "Value")
                            }
                            value={
                              additionalDetails[settingId]?.description ??
                              additionalDetails[settingId]?.title ??
                              ""
                            }
                            keyboardType={
                              settingId === "strava_link" ? "url" : "default"
                            }
                            onChangeText={(text) => {
                              if (settingId === "strava_link") {
                                // only update when the value is a valid URL or empty
                                if (text === "" || isValidUrl(text)) {
                                  setAdditionalDetails({
                                    ...additionalDetails,
                                    [settingId]: {
                                      title: setting?.label ?? settingId,
                                      description: text,
                                    },
                                  });
                                }
                              } else {
                                setAdditionalDetails({
                                  ...additionalDetails,
                                  [settingId]: {
                                    title: setting?.label ?? settingId,
                                    description: text,
                                  },
                                });
                              }
                            }}
                            placeholderTextColor="#999"
                          />
                          {settingId === "google_drive_link" && (
                            <Text style={styles.photosLinkHint}>
                              Only registered users will be able to access
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}

                {/* Custom Additional Info */}
                <View style={styles.whiteCardContainer}>
                  <Text style={styles.cardHeadingAllcaps}>ADDITIONAL INFORMATION</Text>

                  {customAdditionalInfo.map((field, idx) => (
                    <View key={field.id} style={styles.customFieldWrapper}>
                      <View style={styles.customFieldInputs}>
                        {/* Box 1: Field Name (Heading) */}
                        <TextInput
                          style={styles.customInputBox}
                          placeholder={`Field Name ${idx + 1}`}
                          value={field.heading}
                          onChangeText={(text) => {
                            const updated = [...customAdditionalInfo];
                            updated[idx] = { ...updated[idx], heading: text };
                            setCustomAdditionalInfo(updated);
                          }}
                          placeholderTextColor="#8E8E93"
                        />

                        {/* Box 2: Field Value (Description) */}
                        <TextInput
                          style={styles.customInputBox}
                          placeholder={idx === 0 ? "e.g. Specify RSVP detail" : "e.g. Equipment needed"}
                          value={field.description}
                          onChangeText={(text) => {
                            const updated = [...customAdditionalInfo];
                            updated[idx] = { ...updated[idx], description: text };
                            setCustomAdditionalInfo(updated);
                          }}
                          placeholderTextColor="#8E8E93"
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.customInfoRemoveIcon}
                        onPress={() =>
                          setCustomAdditionalInfo((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Ionicons name="close" size={24} color="#000" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addCustomInfoButtonOutline}
                    onPress={() => {
                      setCustomAdditionalInfo((prev) => [
                        ...prev,
                        {
                          id: `custom_${Date.now()}`,
                          heading: "",
                          description: "",
                        },
                      ]);
                    }}
                  >
                    <Text style={styles.addCustomInfoButtonText}>+ Add a Field</Text>
                  </TouchableOpacity>
                </View>

                {/* Women's Only & Allow Viewing Guest List – inside Additional Settings */}
                <View style={styles.additionalTogglesBlock}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Women&apos;s Only</Text>
                    <Switch
                      value={womenOnly}
                      onValueChange={setWomenOnly}
                      trackColor={{ false: "#E5E5E5", true: "#8B5CF6" }}
                      thumbColor="#FFF"
                    />
                  </View>
                  {womenOnly && (
                    <Text style={styles.womenOnlyInfo}>
                      Your event will be visible to everyone but only women will
                      be able to register.
                    </Text>
                  )}
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>
                      Allow Viewing Guest List
                    </Text>
                    <Switch
                      value={!hideGuestListFromViewers}
                      onValueChange={(v) => setHideGuestListFromViewers(!v)}
                      trackColor={{ false: "#E5E5E5", true: "#8B5CF6" }}
                      thumbColor="#FFF"
                    />
                  </View>

                  {/* Attach Form */}
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Attach Form</Text>
                    <Switch
                      value={attachFormEnabled}
                      onValueChange={(v) => {
                        setAttachFormEnabled(v);
                        if (!v) {
                          setFormId(null);
                          setMostRecentFormFields([]);
                          setDraftFormFields([]);
                        } else {
                          setFormId(null);
                          setMostRecentFormFields([]);
                          setDraftFormFields([]);
                        }
                      }}
                      trackColor={{ false: "#E5E5E5", true: "#8B5CF6" }}
                      thumbColor="#FFF"
                    />
                  </View>

                  {attachFormEnabled && (
                    <View style={styles.whiteCardContainer}>
                      <Text style={styles.cardHeadingAllcaps}>FORM ATTACHMENT</Text>

                      {formId && selectedForm ? (
                        <View style={styles.formSelectedContainer}>
                          {/* Your existing selected form UI goes here */}
                          <View style={styles.formSelectedContent}>
                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                            <View style={styles.formSelectedInfo}>
                               <Text style={styles.formSelectedLabel}>Form Attached</Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => setFormId(null)}>
                            <Ionicons name="close" size={20} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      ) : formId ? (
                        <View style={styles.formLoading}>
                          <ActivityIndicator size="small" color="#8B5CF6" />
                          <Text style={styles.formLoadingText}>Loading form...</Text>
                        </View>
                      ) : (
                        <View style={styles.formAttachmentRow}>
                          <TouchableOpacity
                            style={styles.formAttachmentBox}
                            onPress={() => setShowFormSelector(true)}
                          >
                            <Ionicons name="list" size={22} color="#000" />
                            <Text style={styles.formAttachmentBoxText}>Choose from{"\n"}my forms</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.formAttachmentBox}
                            onPress={() => setShowFormBuilder(true)}
                          >
                            <Ionicons name="duplicate-outline" size={22} color="#000" />
                            <Text style={styles.formAttachmentBoxText}>Create a{"\n"}new form</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Limit Registration */}
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Limit Registration</Text>
                    <Switch
                      value={limitRegistrationEnabled}
                      onValueChange={(v) => {
                        setLimitRegistrationEnabled(v);
                        if (!v) setRegistrationLimit("");
                      }}
                      trackColor={{ false: "#E5E5E5", true: "#8B5CF6" }}
                      thumbColor="#FFF"
                    />
                  </View>

                  {limitRegistrationEnabled && (
                    <View style={styles.registrationLimitContainer}>
                      <TextInput
                        style={styles.registrationLimitInput}
                        placeholder="Maximum number of attendees"
                        placeholderTextColor="#9CA3AF"
                        value={registrationLimit}
                        onChangeText={(text) => {
                          // Only allow numeric input
                          const numText = text.replace(/[^0-9]/g, "");
                          setRegistrationLimit(numText);
                        }}
                        keyboardType="number-pad"
                      />
                      {registrationLimit && (
                        <Text style={styles.registrationLimitHint}>
                          Maximum {registrationLimit} attendee
                          {registrationLimit !== "1" ? "s" : ""}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Ticket Preview Modal – same UI as app ticket screen, no back button, only Edit plan */}
          <Modal
            visible={showTicketPreview}
            animationType="slide"
            onRequestClose={() => setShowTicketPreview(false)}
          >
            <SafeAreaView style={styles.ticketPreviewModal} edges={["top"]}>
              <LinearGradient
                colors={["#8B7AB8", "#C9A0B8", "#F5E6E8", "#FFFFFF"]}
                locations={[0, 0.35, 0.7, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.ticketPreviewHeader}>
                <View style={{ width: 24 }} />
                <Text style={styles.ticketPreviewTitle}>Ticket Preview</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView
                style={styles.ticketPreviewScroll}
                contentContainerStyle={styles.ticketPreviewContent}
                showsVerticalScrollIndicator={false}
              >
                {passes[previewPassIndex] &&
                  (() => {
                    const pass = passes[previewPassIndex];
                    const mainImage = pass.media?.[0]?.uri ?? media[0]?.uri;
                    const eventDate = selectedDate
                      ? selectedDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "TBD";
                    const eventTime =
                      (startTime ? formatTime(startTime) : startTimeText) ||
                      "TBD";
                    const hasValue = (v?: string) =>
                      !!v && v.trim() !== "" && v.trim() !== "—";
                    const getVal = (d: {
                      title?: string;
                      description?: string;
                    }) => (d?.description ?? d?.title ?? "").trim();
                    type PillType =
                      | "category"
                      | "distance"
                      | "starting_point"
                      | "dress_code"
                      | "music_type"
                      | "f&b"
                      | "other";
                    const details = selectedAdditionalSettings.map((id) => ({
                      detail_type: id,
                      title:
                        ADDITIONAL_SETTINGS.find((s) => s.id === id)?.label ??
                        id,
                      description: additionalDetails[id]?.description ?? "",
                    }));
                    const find = (t: string) =>
                      details.find((d) => d.detail_type === t);
                    const previewPills: { type: PillType; label: string }[] =
                      [];
                    const cat =
                      selectedCategory ||
                      (selectedSubcategories && selectedSubcategories[0]) ||
                      "";
                    if (hasValue(cat))
                      previewPills.push({ type: "category", label: cat });
                    const priority: PillType[] = [
                      "distance",
                      "starting_point",
                      "dress_code",
                      "music_type",
                      "f&b",
                    ];
                    for (const type of priority) {
                      const value = getVal(find(type) ?? {});
                      if (hasValue(value))
                        previewPills.push({ type, label: value });
                      if (previewPills.length >= 4) break;
                    }
                    const skip = new Set([
                      "distance",
                      "starting_point",
                      "dress_code",
                      "music_type",
                      "f&b",
                      "google_drive_link",
                      "link",
                      "url",
                    ]);
                    for (const d of details) {
                      if (skip.has(d.detail_type) || previewPills.length >= 4)
                        continue;
                      const value = getVal(d);
                      if (hasValue(value))
                        previewPills.push({ type: "other", label: value });
                    }
                    const renderPillIcon = (type: PillType, label: string) => {
                      const p = { size: 18 as const, color: "#1C1C1E" };
                      if (type === "category") {
                        const l = label.toLowerCase();
                        if (l.includes("sport"))
                          return <FontAwesome5 name="basketball-ball" {...p} />;
                        if (
                          l.includes("fitness") ||
                          l.includes("training") ||
                          l.includes("gym")
                        )
                          return <FontAwesome5 name="dumbbell" {...p} />;
                        if (l.includes("social") || l.includes("community"))
                          return <FontAwesome5 name="glass-cheers" {...p} />;
                        if (l.includes("running") || l.includes("run"))
                          return <FontAwesome5 name="running" {...p} />;
                        return <FontAwesome5 name="tag" {...p} />;
                      }
                      if (type === "starting_point")
                        return <FontAwesome5 name="flag-checkered" {...p} />;
                      if (type === "distance")
                        return <FontAwesome5 name="running" {...p} />;
                      if (type === "dress_code")
                        return <Ionicons name="shirt-outline" {...p} />;
                      if (type === "music_type")
                        return <FontAwesome5 name="music" {...p} />;
                      if (type === "f&b")
                        return <MaterialIcons name="fastfood" {...p} />;
                      return <FontAwesome5 name="circle" {...p} />;
                    };
                    const imgH = 280;
                    const overlap = 56;
                    return (
                      <View style={styles.ticketPreviewCentered}>
                        <View style={styles.ticketPreviewCardWrap}>
                          <View style={styles.ticketPreviewCard}>
                            {mainImage ? (
                              <Image
                                source={{ uri: mainImage }}
                                style={[
                                  styles.ticketPreviewImage,
                                  { height: imgH },
                                ]}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.ticketPreviewImage,
                                  styles.ticketPreviewImagePlaceholder,
                                  { height: imgH },
                                ]}
                              >
                                <Ionicons
                                  name="image-outline"
                                  size={64}
                                  color="rgba(255,255,255,0.6)"
                                />
                              </View>
                            )}
                            <View
                              style={[
                                styles.ticketPreviewBlurStrip,
                                { height: imgH * 0.2 },
                              ]}
                            >
                              <BlurView
                                intensity={40}
                                tint="dark"
                                style={StyleSheet.absoluteFill}
                              />
                            </View>
                            <LinearGradient
                              colors={["transparent", "rgba(0,0,0,0.75)"]}
                              style={styles.ticketPreviewOverlay}
                            >
                              <Text
                                style={styles.ticketPreviewBannerTitle}
                                numberOfLines={2}
                              >
                                {title || "Event Title"}
                              </Text>
                              <View style={styles.ticketPreviewBannerMetaRow}>
                                <Text style={styles.ticketPreviewBannerDate}>
                                  {eventDate}
                                </Text>
                                <Text style={styles.ticketPreviewBannerTime}>
                                  {eventTime}
                                </Text>
                              </View>
                              {location ? (
                                <Text
                                  style={styles.ticketPreviewBannerLocation}
                                  numberOfLines={1}
                                >
                                  {location}
                                </Text>
                              ) : null}
                            </LinearGradient>
                          </View>
                          <View
                            style={[
                              styles.ticketPreviewInfoSection,
                              { marginTop: -overlap, paddingTop: overlap + 16 },
                            ]}
                          >
                            <View style={styles.ticketPreviewInfoLeft}>
                              {previewPills.slice(0, 4).map((item, idx) => (
                                <View
                                  key={idx}
                                  style={styles.ticketPreviewPill}
                                >
                                  {renderPillIcon(item.type, item.label)}
                                  <Text
                                    style={styles.ticketPreviewPillLabel}
                                    numberOfLines={1}
                                  >
                                    {item.label}
                                  </Text>
                                </View>
                              ))}
                            </View>
                            <View style={styles.ticketPreviewInfoRight}>
                              <View style={styles.ticketPreviewQrWrap}>
                                <View style={styles.ticketPreviewQrPlaceholder}>
                                  <Ionicons
                                    name="qr-code-outline"
                                    size={56}
                                    color="#8E8E93"
                                  />
                                  <Text style={styles.ticketPreviewQrText}>
                                    Preview
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.ticketPreviewPassName}>
                                {pass.name || "Ticket"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
              </ScrollView>
              <View style={styles.ticketPreviewBottomBar}>
                <TouchableOpacity
                  style={styles.ticketPreviewBackButton}
                  onPress={() => setShowTicketPreview(false)}
                >
                  <Ionicons name="create-outline" size={20} color="#FFF" />
                  <Text style={styles.ticketPreviewBackButtonText}>
                    Edit plan
                  </Text>
                </TouchableOpacity>
              </View>
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
              <Text style={styles.postButtonText}>
                {editMode ? "Update" : "Post"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={showPostSuccessModal}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={styles.successOverlay}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.successCloseButton}
              onPress={() => {
                setShowPostSuccessModal(false);
                setCreatedPlanIdForSuccess(null);
                resetForm();
                router.replace("/(tabs)");
              }}
            >
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>

            {/* Card */}
            <View style={styles.successCardContainer}>
              <BusinessCard
                plan={{
                  plan_id: createdPlanIdForSuccess ?? "preview",
                  title,
                  description,
                  media: media.map((m) => ({ url: m.uri, type: m.type })),
                  location_text: location,
                  date: selectedDate || undefined,
                  time: (() => {
                    const s = startTime || parseTimeText(startTimeText);
                    return timeEnabled && s ? formatTime(s) : undefined;
                  })(),
                  category_main: selectedCategory,
                  category_sub: selectedSubcategories,
                  user: {
                    user_id: currentUser?.user_id || "",
                    name: currentUser?.name || "Organizer",
                    profile_image: currentUser?.profile_image || undefined,
                  },
                }}
                hideActions={true}
                hideRegisterButton={true}
                isSwipeable={false}
                fillHeight={false}
                compactVerticalPadding={true}
                descriptionNumberOfLines={2}
              />
            </View>

            {/* Bottom Panel */}
            <View style={styles.successBottomPanel}>
              <Text style={styles.successTitle}>{title} is Live</Text>

              <View style={styles.successButtonsRow}>
                <TouchableOpacity
                  style={styles.successEditButton}
                  onPress={() => {
                    if (!createdPlanIdForSuccess) return;
                    setShowPostSuccessModal(false);
                    router.push({
                      pathname: "/business-plan/[planId]",
                      params: { planId: createdPlanIdForSuccess },
                    } as any);
                  }}
                >
                  <Text style={styles.successEditButtonText}>Edit Event</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.successShareButton}
                  onPress={() => {
                    setShowPostSuccessModal(false);
                    setShowShareToChatModal(true);
                  }}
                >
                  <Ionicons name="paper-plane-outline" size={18} color="#FFF" />
                  <Text style={styles.successShareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>
      <ShareToChatModal
        visible={showShareToChatModal}
        onClose={() => setShowShareToChatModal(false)}
        postId={createdPlanIdForSuccess ?? ""}
        postTitle={title}
        postDescription={description}
        postMedia={media.map((m) => ({ url: m.uri, type: m.type }))}
        postTags={
          selectedSubcategories.length
            ? selectedSubcategories
            : selectedCategory
              ? [selectedCategory]
              : []
        }
        postCategorySub={selectedSubcategories}
        postCategoryMain={selectedCategory}
        postIsBusiness={true}
        userId={user?.user_id ?? ""}
        currentUserAvatar={currentUser?.profile_image ?? undefined}
      />

      {/* Form Selector Modal */}
      <FormSelector
        visible={showFormSelector}
        userId={user?.user_id ?? ""}
        onSelect={handleFormSelectorSelect}
        onCreateNew={() => {
          setShowFormSelector(false);
          setShowFormBuilder(true);
        }}
        onCancel={() => setShowFormSelector(false)}
        loading={savingForm}
      />

      <FormBuilder
        visible={showFormBuilder}
        onSave={handleFormBuilderSave}
        onCancel={() => setShowFormBuilder(false)}
        loading={savingForm}
      />

      <FormEditor
        visible={showFormEditor}
        form={selectedForm}
        onSave={handleFormEditorSave}
        onCancel={() => setShowFormEditor(false)}
        loading={savingForm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  sectionCard: {
    backgroundColor: "#EBEBED",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  /** Shorter sections with white bg: Time of Event, Tickets, Share to community */
  sectionCardCompact: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  locationInputPill: {
    fontSize: 15,
    color: "#1C1C1E",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "transparent",
    borderRadius: 24,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  createPostHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  cancelButton: {
    minWidth: 70,
  },
  backButtonHeader: {
    minWidth: 44,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#1C1C1E",
  },
  createPostHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
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
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: "#FFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 0,
    padding: 12,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  descriptionInput: {
    fontSize: 14,
    color: "#000",
    padding: 12,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  mediaSection: {
    marginBottom: 16,
  },
  mediaList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mediaPreviewWrap: {
    position: "relative",
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removeMediaButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addMediaThumb: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addMediaThumbText: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  mediaPreview: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  addMediaButton: {
    width: "100%",
    height: 100,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  addMediaButtonSmall: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    borderRadius: 20,
  },
  addMediaTextSmall: {
    marginLeft: 6,
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  addMediaText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  input: {
    fontSize: 14,
    color: "#000",
    padding: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputText: {
    fontSize: 14,
    color: "#000",
  },
  inputPlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  timeRowCompact: {
    marginBottom: 10,
  },
  timeInput: {
    flex: 1,
    marginBottom: 0,
  },
  timeWheelTap: {
    // inputs for start/end time should be left aligned rather than centered
    justifyContent: "flex-start",
    paddingLeft: 12,
  },
  amPmBox: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  amPmOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  timeWheelOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  timeWheelSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  timeWheelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  timeWheelHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  timeWheelHeaderButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  timeWheelSaveText: {
    color: "#8B5CF6",
  },
  timeWheelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  timeWheelRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  timeWheelColumn: {
    flex: 1,
  },
  timeWheelItem: {
    fontSize: 22,
    height: 180,
    color: "#000000",
  },
  // iOS-style time picker styles
  iosTimeOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  iosTimeBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iosTimeContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 320,
    overflow: "hidden",
  },
  iosTimeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  iosTimeCancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  iosTimeCancelText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  iosTimeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  iosTimeConfirmButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  iosTimeConfirmText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  iosTimePickerContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  iosTimeColumn: {
    flex: 1,
    maxHeight: 200,
  },
  iosTimeScroll: {
    flex: 1,
  },
  iosTimeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  iosTimeOptionSelected: {
    backgroundColor: "#E3F2FD",
  },
  iosTimeOptionText: {
    fontSize: 18,
    color: "#000",
    fontWeight: "400",
  },
  iosTimeOptionTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
  iosTimeSeparator: {
    fontSize: 24,
    color: "#000",
    fontWeight: "600",
    marginHorizontal: 8,
  },
  amPmOptionSelected: {
    backgroundColor: "#1C1C1E",
  },
  amPmOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  amPmOptionTextSelected: {
    color: "#FFF",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleRowCompact: {
    paddingVertical: 6,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  whiteCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeadingAllcaps: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
    textTransform: "uppercase",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  customFieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  customFieldInputs: {
    flex: 1,
    gap: 8, // Adds a visual gap between the field name box and the value box
  },
  customInputBox: {
    backgroundColor: "#EBEBED", // Light gray fill for the boxes
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1C1C1E",
  },
  customInfoRemoveIcon: {
    paddingLeft: 12,
    paddingRight: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  addCustomInfoButtonOutline: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#000000",
    marginTop: 4,
  },
  addCustomInfoButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "500",
  },
  formAttachmentRow: {
    flexDirection: "row",
    gap: 12,
  },
  formAttachmentBox: {
    flex: 1,
    backgroundColor: "#EBEBED",
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 88,
  },
  formAttachmentBoxText: {
    fontSize: 14,
    color: "#1C1C1E",
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 8,
  },
  additionalTogglesBlock: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  womenOnlyInfo: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  additionalSettingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 12,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  categoryChipSelected: {
    backgroundColor: "#1C1C1E",
    borderColor: "#1C1C1E",
  },
  categoryChipIcon: {
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  categoryChipTextSelected: {
    color: "#FFF",
  },
  subcategorySection: {
    marginTop: 12,
  },
  subcategoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  subcategoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subcategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  subcategoryChipSelected: {
    backgroundColor: "#1C1C1E",
    borderColor: "#1C1C1E",
  },
  subcategoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  subcategoryChipTextSelected: {
    color: "#FFF",
  },
  ticketsSectionWhenOn: {
    backgroundColor: "#FFF",
  },
  passesSection: {
    marginTop: 8,
    marginBottom: 0,
  },
  ticketAddMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  ticketAddMediaButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  ticketImagePreviewWrap: {
    position: "relative",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  ticketImagePreviewThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  ticketImagePreviewRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  ticketsBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  ticketAddTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
  },
  ticketAddTypeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  passCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  passInput: {
    fontSize: 14,
    color: "#1C1C1E",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 0,
  },
  passRemoveButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  passDescription: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  passImageRow: {
    marginTop: 8,
  },
  passImageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  passMediaPreview: {
    position: "relative",
    alignSelf: "flex-start",
  },
  passMediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePassMediaBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    padding: 4,
  },
  addPassImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  addPassImageText: {
    fontSize: 13,
    color: "#666",
  },
  addMediaOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    marginBottom: 12,
  },
  addMediaOptionText: {
    fontSize: 14,
    color: "#666",
  },
  passNamePriceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  passNameInRow: {
    flex: 1,
    marginBottom: 0,
  },
  passPriceInRow: {
    width: 90,
    marginBottom: 0,
  },
  ticketActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  ticketActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  ticketActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  addTypePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  previewTicketButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#E5E5EA",
    borderRadius: 8,
  },
  previewTicketButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  ticketPreviewModal: {
    flex: 1,
    backgroundColor: "#1C1C1E",
  },
  ticketPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
  },
  ticketPreviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  ticketPreviewScroll: {
    flex: 1,
  },
  ticketPreviewContent: {
    padding: 20,
    paddingBottom: 100,
    alignItems: "center",
  },
  ticketPreviewCentered: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  ticketPreviewCardWrap: {
    marginBottom: 0,
  },
  ticketPreviewCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    position: "relative",
  },
  ticketPreviewImage: {
    width: "100%",
  },
  ticketPreviewImagePlaceholder: {
    backgroundColor: "#94A3B8",
    justifyContent: "center",
    alignItems: "center",
  },
  ticketPreviewBlurStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 1,
  },
  ticketPreviewOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 2,
  },
  ticketPreviewBannerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 8,
  },
  ticketPreviewBannerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ticketPreviewBannerDate: {
    fontSize: 14,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },
  ticketPreviewBannerTime: {
    fontSize: 14,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },
  ticketPreviewBannerLocation: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  ticketPreviewInfoSection: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 20,
  },
  ticketPreviewInfoLeft: {
    flex: 1,
    justifyContent: "space-between",
    gap: 12,
  },
  ticketPreviewPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  ticketPreviewPillLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1E",
    maxWidth: 140,
  },
  ticketPreviewInfoRight: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 130,
  },
  ticketPreviewQrWrap: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  ticketPreviewQrPlaceholder: {
    width: 112,
    height: 112,
    justifyContent: "center",
    alignItems: "center",
  },
  ticketPreviewQrText: {
    marginTop: 4,
    fontSize: 12,
    color: "#8E8E93",
  },
  ticketPreviewPassName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
    textAlign: "center",
  },
  ticketPreviewBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "transparent",
  },
  ticketPreviewBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1E",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  ticketPreviewBackButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  previewTicketButtonBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
  },
  previewTicketButtonBottomText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  addPassButton: {
    padding: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
  },
  addPassText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  settingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  settingChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    gap: 6,
  },
  settingChipSelected: {
    backgroundColor: "#1C1C1E",
    borderColor: "#1C1C1E",
  },
  settingChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  settingChipTextSelected: {
    color: "#FFF",
  },
  additionalDetailCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  additionalDetailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  additionalDetailInput: {
    fontSize: 14,
    color: "#000",
    padding: 12,
    backgroundColor: "transparent",
    borderRadius: 8,
  },
  additionalDetailDescription: {
    marginTop: 10,
  },
  photosLinkHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },
  productionTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  productionTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E5E5E5",
    gap: 6,
  },
  productionTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  previewButton: {
    backgroundColor: "#E5E5EA",
  },
  previewButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "700",
  },
  postButton: {
    backgroundColor: "#1C1C1E",
  },
  postButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  successModalFullScreen: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  successModalScroll: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  successModalClose: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  liveStatusText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  businessCardWrap: {
    width: "100%",
    height: Dimensions.get("window").height * 0.5,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  previewFullScreen: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  previewCloseButton: {
    position: "absolute",
    top: 56,
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  previewScroll: { flex: 1 },
  previewScrollContent: {
    paddingBottom: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  eventPreviewWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  previewStickyBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: "#FFF",
    borderTopWidth: 0,
  },
  previewEditButton: {
    backgroundColor: "#E5E5EA",
  },
  previewEditButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "700",
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  datePickerContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  dateInput: {
    fontSize: 14,
    color: "#000",
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    marginBottom: 12,
  },
  datePickerButton: {
    backgroundColor: "#1C1C1E",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  datePickerButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  formSection: {
    marginTop: 12,
    paddingTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
  },
  formSelectedContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  formSelectedContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  formSelectedInfo: {
    flex: 1,
  },
  formSelectedLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
  },
  formSelectedId: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  formSelectedActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  formEditButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFF",
  },
  formEditButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },
  formRemoveButton: {
    padding: 6,
  },
  formActionButtons: {
    gap: 10,
  },
  formSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFF",
  },
  formSelectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  formCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#000000",
  },
  formCreateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  formQuestionsList: {
    maxHeight: 120,
    marginTop: 8,
  },
  formQuestionItem: {
    fontSize: 12,
    color: "#1C1C1E",
    marginBottom: 4,
    lineHeight: 16,
  },
  formLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  formLoadingText: {
    fontSize: 14,
    color: "#FFF",
    marginLeft: 8,
  },
  registrationLimitContainer: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },
  registrationLimitInput: {
    fontSize: 14,
    color: "#1C1C1E",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginBottom: 8,
  },
  registrationLimitHint: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  modalScreen: {
    flex: 1,
    backgroundColor: "#F4F4F6",
  },

  modalContentCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  previewCardContainer: {
    width: "100%",
    height: Dimensions.get("window").height * 0.5,
    justifyContent: "center",
  },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
  },

  /* Card container */
  successCardContainer: {
    marginTop: 60, // space for close button + notch
    paddingHorizontal: 20,
    height: Dimensions.get("window").height * 0.2, // smaller so it doesn't overlap bottom panel
  },

  /* Bottom action panel */
  successBottomPanel: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#F2F2F2",
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },

  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 18,
    textAlign: "center",
  },

  successButtonsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },

  /* Edit Button */
  successEditButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },

  successEditButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },

  /* Share Button */
  successShareButton: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#1C1C1E",
    borderRadius: 22,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },

  successShareButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },

  /* Close button below notch */
  successCloseButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },

  // Additional styles from first set that don't exist in second set
  successCenterWrap: {
    paddingHorizontal: 20,
    alignItems: "center",
  },

  successCardWrap: {
    width: "100%",
    height: Dimensions.get("window").height * 0.48,
  },

  successActionPanel: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#F2F2F2",
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
  },
});
