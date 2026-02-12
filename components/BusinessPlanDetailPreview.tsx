import React, { useState } from 'react';
import { Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_ASPECT = 4 / 3;
const HERO_HEIGHT = SCREEN_WIDTH * HERO_ASPECT;
const HERO_OVERLAP_PERCENT = 0.1;
const CONTENT_PADDING_H = 20;

const TICKET_BGS = [
  require('@/assets/images/ticket1 bg.png'),
  require('@/assets/images/ticket2 bg.png'),
  require('@/assets/images/ticket3 bg.png'),
];

export interface BusinessPlanDetailPreviewPlan {
  plan_id?: string;
  title: string;
  description: string;
  media?: Array<{ url: string; type: string }>;
  location_text?: string;
  date?: Date | string;
  time?: string;
  category_sub?: string[];
  add_details?: Array<{
    detail_type: string;
    title?: string;
    description?: string;
    heading?: string;
  }>;
  passes?: Array<{
    pass_id: string;
    name: string;
    price: number;
    description?: string;
    media?: Array<{ url: string; type: string }>;
  }>;
}

interface BusinessPlanDetailPreviewProps {
  plan: BusinessPlanDetailPreviewPlan;
  organizerName?: string;
  organizerAvatar?: string | null;
  /** When true, show organizer pill at top of content (detail-page style) */
  showOrganizer?: boolean;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function categoryLabel(detail: { detail_type: string; title?: string; heading?: string }): string {
  if (detail.title) return detail.title;
  const t = detail.detail_type;
  if (t === 'f&b') return 'F&B';
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ');
}

export default function BusinessPlanDetailPreview({
  plan,
  organizerName = 'Organizer',
  organizerAvatar = null,
  showOrganizer = true,
}: BusinessPlanDetailPreviewProps) {
  const [heroIndex, setHeroIndex] = useState(0);

  const planMedia = plan.media?.length ? plan.media.slice(0, 5) : [];
  const mediaCount = planMedia.length;
  const heroImageUri = planMedia[0]?.url;
  const overlayHeight = HERO_HEIGHT * HERO_OVERLAP_PERCENT;
  const detailPills = plan.add_details?.filter((d) => d.detail_type !== 'google_drive_link') ?? [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={[styles.heroWrap, { height: HERO_HEIGHT }]}>
        {mediaCount > 1 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setHeroIndex(i);
            }}
            style={styles.heroScroll}
            contentContainerStyle={[styles.heroScrollContent, { height: HERO_HEIGHT }]}
          >
            {planMedia.map((item, i) => (
              <Image
                key={i}
                source={{ uri: item.url }}
                style={[styles.heroImageSlide, { height: HERO_HEIGHT }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : heroImageUri ? (
          <Image
            source={{ uri: heroImageUri }}
            style={[styles.heroImage, { height: HERO_HEIGHT }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroPlaceholder, { height: HERO_HEIGHT }]}>
            <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.5)" />
          </View>
        )}
        {mediaCount > 1 && (
          <View style={styles.carouselDots}>
            {planMedia.map((_, i) => (
              <View key={i} style={[styles.carouselDot, i === heroIndex && styles.carouselDotActive]} />
            ))}
          </View>
        )}
      </View>

      {/* White content overlay – same as detail page */}
      <View style={[styles.contentOverlay, { marginTop: -overlayHeight, paddingTop: overlayHeight + 16 }]}>
        {showOrganizer && (
          <View style={styles.organizerRow}>
            <Avatar uri={organizerAvatar ?? undefined} size={36} />
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName} numberOfLines={1}>{organizerName}</Text>
              <Text style={styles.organizerTime}>Preview</Text>
            </View>
          </View>
        )}

        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.description}>{plan.description}</Text>

        {/* Venue + date/time */}
        <View style={styles.venueDateCard}>
          {plan.location_text ? (
            <View style={styles.venueDateRow}>
              <Ionicons name="location" size={18} color="#1C1C1E" style={styles.venueDateIcon} />
              <View style={styles.venueDateTextWrap}>
                <Text style={styles.venueDateTitle}>{plan.location_text}</Text>
              </View>
            </View>
          ) : null}
          {(plan.date || plan.time) ? (
            <View style={styles.venueDateRow}>
              <Ionicons name="calendar-outline" size={18} color="#1C1C1E" style={styles.venueDateIcon} />
              <View style={styles.venueDateTextWrap}>
                <Text style={styles.venueDateTitle}>
                  {formatDate(plan.date)}
                  {plan.time ? ` | ${plan.time}` : ''}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Category pills */}
        {detailPills.length > 0 && (
          <View style={styles.categoryPillsWrap}>
            {detailPills.slice(0, 4).map((detail, index) => (
              <View key={index} style={styles.categoryPill}>
                <Text style={styles.categoryPillHeading}>
                  {detail.detail_type === 'additional_info'
                    ? (detail.heading ?? detail.title ?? 'Additional Info')
                    : categoryLabel(detail)}
                </Text>
                {(detail.description ?? detail.title) ? (
                  <Text style={styles.categoryPillValue} numberOfLines={2}>
                    {detail.detail_type === 'additional_info' ? detail.description : (detail.description ?? detail.title ?? '')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Select Passes */}
        {plan.passes && plan.passes.length > 0 && (
          <View style={styles.ticketsSection}>
            <Text style={styles.ticketsTitle}>Select Passes</Text>
            {plan.passes.map((pass, index) => {
              const bgSource = TICKET_BGS[index % TICKET_BGS.length];
              return (
                <View key={pass.pass_id} style={styles.passCard}>
                  <ImageBackground source={bgSource} style={styles.passBg} imageStyle={styles.passBgImage}>
                    <View style={styles.passContent}>
                      <Text style={styles.passName}>{pass.name}</Text>
                      {pass.description ? (
                        <Text style={styles.passDescription} numberOfLines={2}>{pass.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.passPriceBlock}>
                      <Text style={styles.passPrice}>₹{pass.price}</Text>
                    </View>
                  </ImageBackground>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: 40 },
  heroWrap: { width: SCREEN_WIDTH, overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroScroll: { flex: 1, width: SCREEN_WIDTH },
  heroScrollContent: {},
  heroImageSlide: { width: SCREEN_WIDTH },
  carouselDots: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  carouselDotActive: { backgroundColor: '#FFF', width: 8, height: 8, borderRadius: 4 },
  contentOverlay: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: CONTENT_PADDING_H,
    paddingBottom: 40,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  organizerInfo: { flex: 1, minWidth: 0 },
  organizerName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  organizerTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 10 },
  description: { fontSize: 14, color: '#444', lineHeight: 21, marginBottom: 20 },
  venueDateCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    padding: 14,
    marginTop: 0,
    marginBottom: 16,
  },
  venueDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  venueDateIcon: { marginRight: 10 },
  venueDateTextWrap: { flex: 1, minWidth: 0 },
  venueDateTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  categoryPillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  categoryPill: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: '47%',
  },
  categoryPillHeading: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginBottom: 4 },
  categoryPillValue: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', lineHeight: 18 },
  ticketsSection: { marginBottom: 24 },
  ticketsTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginBottom: 14 },
  passCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  passBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 100,
  },
  passBgImage: { borderRadius: 16 },
  passContent: { flex: 1, minWidth: 0 },
  passName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  passDescription: { fontSize: 13, color: '#6B7280' },
  passPriceBlock: { marginLeft: 12 },
  passPrice: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
});
