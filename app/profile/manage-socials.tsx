import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, borderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SocialPlatform {
  id: string;
  name: string;
  url?: string;
  enabled: boolean;
  description: string;
}

export default function ManageSocialsScreen() {
  const router = useRouter();
  const [socials, setSocials] = useState<SocialPlatform[]>([
    {
      id: 'facebook',
      name: 'Facebook',
      enabled: true,
      description: 'Display on your profile',
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      enabled: false,
      description: 'Display on your profile',
    },
    {
      id: 'whatsapp',
      name: 'whatsapp.com',
      enabled: true,
      description: 'Display on your profile',
    },
  ]);

  const toggleSocial = (id: string) => {
    setSocials(
      socials.map((social) =>
        social.id === id ? { ...social, enabled: !social.enabled } : social
      )
    );
  };

  const handleSave = async () => {
    // TODO: Save social preferences to backend
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Socials</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionDescription}>
            Connect your social media accounts to display on your profile
          </Text>

          {socials.map((social) => (
            <View key={social.id} style={styles.socialItem}>
              <View style={styles.socialInfo}>
                <Text style={styles.socialName}>{social.name}</Text>
                <Text style={styles.socialDescription}>{social.description}</Text>
              </View>
              <Switch
                value={social.enabled}
                onValueChange={() => toggleSocial(social.id)}
                trackColor={{
                  false: Colors.light.border,
                  true: Colors.light.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
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
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  socialInfo: {
    flex: 1,
  },
  socialName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  socialDescription: {
    fontSize: 14,
    color: '#6B7280',
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

