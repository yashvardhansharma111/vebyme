import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_VALUE = 1;
const MAX_VALUE = 50;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LocationPreferenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [radius, setRadius] = useState(5);

  const handleSave = () => {
    // TODO: Save location preference
    router.back();
  };

  const handleSliderChange = (increment: number) => {
    const newValue = radius + increment;
    if (newValue >= MIN_VALUE && newValue <= MAX_VALUE) {
      setRadius(newValue);
    }
  };

  // Calculate percentage for the custom progress bar
  const progressPercent = ((radius - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Preference</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main Card */}
        <View style={styles.card}>
          <View style={styles.textSection}>
            <Text style={styles.sectionTitle}>Discovery Radius</Text>
            <Text style={styles.sectionDescription}>
              Set how far you want to discover plans around you.
            </Text>
          </View>

          {/* Value Display */}
          <View style={styles.valueDisplay}>
            <Text style={styles.valueText}>{radius}</Text>
            <Text style={styles.unitText}>km</Text>
          </View>

          {/* Custom Slider Control */}
          <View style={styles.sliderSection}>
            {/* Minus Button */}
            <TouchableOpacity
              style={[styles.controlButton, radius <= MIN_VALUE && styles.controlButtonDisabled]}
              onPress={() => handleSliderChange(-1)}
              disabled={radius <= MIN_VALUE}
            >
              <Ionicons name="remove" size={24} color={radius <= MIN_VALUE ? "#CCC" : "#1C1C1E"} />
            </TouchableOpacity>

            {/* Track */}
            <View style={styles.trackContainer}>
              <View style={styles.trackBackground}>
                <View style={[styles.trackFill, { width: `${progressPercent}%` }]} />
              </View>
              {/* Labels under track */}
              <View style={styles.trackLabels}>
                <Text style={styles.trackLabelText}>{MIN_VALUE}km</Text>
                <Text style={styles.trackLabelText}>{MAX_VALUE}km</Text>
              </View>
            </View>

            {/* Plus Button */}
            <TouchableOpacity
              style={[styles.controlButton, radius >= MAX_VALUE && styles.controlButtonDisabled]}
              onPress={() => handleSliderChange(1)}
              disabled={radius >= MAX_VALUE}
            >
              <Ionicons name="add" size={24} color={radius >= MAX_VALUE ? "#CCC" : "#1C1C1E"} />
            </TouchableOpacity>
          </View>

          {/* Map Placeholder Visualization */}
          <View style={styles.mapPreviewContainer}>
            <View style={styles.mapPlaceholder}>
              {/* Concentric Circles to represent radius */}
              <View style={[styles.radarCircle, { width: '80%', height: '80%', opacity: 0.1 }]} />
              <View style={[styles.radarCircle, { width: '50%', height: '50%', opacity: 0.2 }]} />
              
              {/* Dynamic Circle based on radius (clamped for visual) */}
              <View 
                style={[
                    styles.activeRadius, 
                    { 
                        width: `${10 + (progressPercent * 0.8)}%`, 
                        height: `${10 + (progressPercent * 0.8)}%` 
                    }
                ]} 
              />
              
              <View style={styles.userDot}>
                <Ionicons name="location" size={16} color="#FFF" />
              </View>
            </View>
            <Text style={styles.mapNote}>Map Preview</Text>
          </View>

        </View>
      </ScrollView>

      {/* Footer Save Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Preference</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2', // Light gray background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F2F2F2',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  textSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Value Display
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 32,
  },
  valueText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -2,
  },
  unitText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 4,
  },

  // Slider Section
  sliderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  trackContainer: {
    flex: 1,
    height: 40, // Height to contain labels
    justifyContent: 'center',
  },
  trackBackground: {
    height: 8,
    backgroundColor: '#F2F2F2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 4,
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trackLabelText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // Map Preview
  mapPreviewContainer: {
    alignItems: 'center',
  },
  mapPlaceholder: {
    width: '100%',
    aspectRatio: 1.5,
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    backgroundColor: 'transparent',
  },
  activeRadius: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(28, 28, 30, 0.1)', // Light black opacity
    borderWidth: 1,
    borderColor: 'rgba(28, 28, 30, 0.3)',
  },
  userDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  mapNote: {
    marginTop: 12,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F2',
  },
  saveButton: {
    backgroundColor: '#1C1C1E', // Black button
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});