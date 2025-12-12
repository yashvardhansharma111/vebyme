import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MIN_VALUE = 1;
const MAX_VALUE = 50;

export default function LocationPreferenceScreen() {
  const router = useRouter();
  const [radius, setRadius] = useState(5);

  const handleSave = () => {
    // TODO: Save location preference (when location is implemented)
    router.back();
  };

  const handleSliderChange = (value: number) => {
    const newValue = Math.round(value);
    if (newValue >= MIN_VALUE && newValue <= MAX_VALUE) {
      setRadius(newValue);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Preference</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery Radius</Text>
          <Text style={styles.sectionDescription}>
            Set how far you want to discover plans
          </Text>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderValueContainer}>
              <Text style={styles.sliderValue}>{radius} Km</Text>
            </View>
            <View style={styles.sliderWrapper}>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${((radius - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100}%` },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    {
                      left: `${((radius - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => handleSliderChange(radius - 1)}
                  disabled={radius <= MIN_VALUE}
                >
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => handleSliderChange(radius + 1)}
                  disabled={radius >= MAX_VALUE}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 Km</Text>
              <Text style={styles.sliderLabel}>50 Km</Text>
            </View>
          </View>

          <View style={styles.mapPreview}>
            <View style={[styles.radiusCircle, { width: radius * 4, height: radius * 4 }]} />
            <Text style={styles.mapPreviewText}>
              {radius} Km discovery radius
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 32,
  },
  sliderValueContainer: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  sliderWrapper: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    position: 'relative',
    marginBottom: 16,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    position: 'absolute',
    top: -8,
    marginLeft: -12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  mapPreview: {
    height: 300,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  radiusCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: Colors.light.primary,
    opacity: 0.2,
  },
  mapPreviewText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

