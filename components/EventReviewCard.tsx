import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type EventReviewRating = 'amazing' | 'good' | 'bad' | 'terrible';

const OPTIONS: { value: EventReviewRating; label: string; emoji: string }[] = [
  { value: 'amazing', label: 'Amazing', emoji: '😍' },
  { value: 'good', label: 'Good', emoji: '😊' },
  { value: 'bad', label: 'Bad', emoji: '🙁' },
  { value: 'terrible', label: 'Terrible', emoji: '😡' },
];

interface EventReviewCardProps {
  /** e.g. "How was your experience?" or "How was your last event at The Window Seat" */
  question: string;
  selectedRating: EventReviewRating | null;
  onSelectRating: (rating: EventReviewRating) => void;
  /** Optional: called when user taps an option (can submit immediately or add Submit button later) */
  onSubmit?: (rating: EventReviewRating) => void;
  /** Card style variant: inline (e.g. feed) vs standalone (e.g. notifications) */
  variant?: 'inline' | 'standalone';
}

export default function EventReviewCard({
  question,
  selectedRating,
  onSelectRating,
  onSubmit,
  variant = 'inline',
}: EventReviewCardProps) {
  const handlePress = (rating: EventReviewRating) => {
    onSelectRating(rating);
    onSubmit?.(rating);
  };

  return (
    <View style={[styles.card, variant === 'standalone' && styles.cardStandalone]}>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.optionsRow}>
        {OPTIONS.map((opt) => {
          const isSelected = selectedRating === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handlePress(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
  },
  cardStandalone: {
    backgroundColor: '#FFF',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: '#1C1C1E',
  },
  emoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  optionLabelSelected: {
    color: '#FFF',
  },
});
