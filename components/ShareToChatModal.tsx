import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Share,
  Linking,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/services/api';
import Avatar from './Avatar';

const COLS = 3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 20;
const GAP = 16;
const TILE_SIZE = (SCREEN_WIDTH - PAD * 2 - GAP * (COLS - 1)) / COLS;

interface ShareToChatModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  postDescription: string;
  postMedia: any[];
  postTags?: string[];
  postCategorySub?: string[];
  postCategoryMain?: string;
  postIsBusiness?: boolean;
  userId: string;
  /** Optional: avatar URL for "You" tile */
  currentUserAvatar?: string;
  onShareSuccess?: () => void;
}

interface ChatItem {
  group_id: string;
  plan_id: string;
  plan_title: string;
  plan_description: string;
  plan_media: any[];
  author_id: string;
  author_name: string;
  author_image: string | null;
  other_user?: { user_id: string; name: string; profile_image: string } | null;
  last_message?: { content: string; type: string; timestamp: string; user_id: string } | null;
  member_count: number;
  is_group: boolean;
  group_name: string;
}

type GridItem = { type: 'you'; id: string; name: string; avatar: string | null } | { type: 'chat'; item: ChatItem };

export default function ShareToChatModal({
  visible,
  onClose,
  postId,
  postTitle,
  postDescription,
  postMedia,
  postTags,
  postCategorySub,
  postCategoryMain,
  postIsBusiness,
  userId,
  currentUserAvatar,
  onShareSuccess,
}: ShareToChatModalProps) {
  const [chatLists, setChatLists] = useState<{
    their_plans: ChatItem[];
    my_plans: ChatItem[];
    groups: ChatItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible && userId) {
      loadChatLists();
      setSearch('');
    }
  }, [visible, userId]);

  const loadChatLists = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChatLists(userId);
      if (response.data) setChatLists(response.data);
    } catch (error: any) {
      console.error('Error loading chat lists:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const allChats: ChatItem[] = useMemo(
    () => [
      ...(chatLists?.their_plans || []),
      ...(chatLists?.my_plans || []),
      ...(chatLists?.groups || []),
    ],
    [chatLists]
  );

  const gridItems: GridItem[] = useMemo(() => {
    const you: GridItem = { type: 'you', id: 'you', name: 'You', avatar: currentUserAvatar || null };
    const chats = allChats.filter((c) => {
      const name = (c.group_name || c.plan_title || '').toLowerCase();
      return !search.trim() || name.includes(search.toLowerCase());
    });
    return [you, ...chats.map((item) => ({ type: 'chat' as const, item }))];
  }, [allChats, search, currentUserAvatar]);

  const handleShareToChat = async (group_id: string) => {
    if (!userId || group_id === 'you') return;
    try {
      setSharing(group_id);
      await apiService.sendMessage(group_id, userId, 'plan', {
        plan_id: postId,
        title: postTitle,
        description: postDescription,
        media: postMedia || [],
        tags: postTags || postCategorySub || [],
        category_sub: postCategorySub || postTags || [],
        category_main: postCategoryMain,
        is_business: postIsBusiness === true,
      });
      Alert.alert('Success', 'Post shared to chat!', [
        { text: 'OK', onPress: () => { onShareSuccess?.(); onClose(); } },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share post');
    } finally {
      setSharing(null);
    }
  };

  const planUrl = `https://vybeme.com/plan/${postId}`;
  const shareMessage = `Check out this plan: ${postTitle}\n\n${planUrl}`;

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(planUrl);
      Alert.alert('Link copied', 'Plan link copied to clipboard.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to copy link');
    }
  };

  const handleExternalShare = async () => {
    try {
      await Share.share({ message: shareMessage, url: planUrl, title: postTitle });
    } catch (e: any) {
      if (e.message?.includes('cancel') || e.code === 'E_SHARE_CANCELLED') return;
      Alert.alert('Error', e.message || 'Failed to share');
    }
  };

  const handleWhatsApp = () => {
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`).catch(() => handleExternalShare());
  };

  const getDisplayForItem = (entry: GridItem): { name: string; image: string | null; isGroup: boolean } => {
    if (entry.type === 'you') return { name: entry.name, image: entry.avatar, isGroup: false };
    const c = entry.item;
    const name = c.group_name || c.plan_title || 'Chat';
    let image: string | null = null;
    if (c.is_group && c.member_count > 2) {
      const m = c.plan_media?.[0];
      image = typeof m === 'string' ? m : m?.url || null;
    } else {
      image = c.other_user?.profile_image || c.author_image || null;
    }
    return { name, image, isGroup: c.is_group && c.member_count > 2 };
  };

  const renderTile = (entry: GridItem, index: number) => {
    const { name, image, isGroup } = getDisplayForItem(entry);
    const id = entry.type === 'you' ? 'you' : entry.item.group_id;
    const isSharing = id !== 'you' && sharing === id;

    return (
      <TouchableOpacity
        key={id}
        style={styles.tile}
        onPress={() => entry.type === 'chat' && handleShareToChat(entry.item.group_id)}
        disabled={entry.type === 'you' || isSharing}
        activeOpacity={0.7}
      >
        <View style={styles.tileAvatarWrap}>
          {isGroup ? (
            image ? (
              <Avatar uri={image} size={TILE_SIZE - 8} />
            ) : (
              <View style={styles.tilePlaceholder}>
                <Ionicons name="people" size={28} color="#8E8E93" />
              </View>
            )
          ) : (
            <Avatar uri={image ?? undefined} size={TILE_SIZE - 8} />
          )}
        </View>
        <Text style={styles.tileName} numberOfLines={1}>{name}</Text>
        {isSharing && <ActivityIndicator size="small" color="#1C1C1E" style={styles.tileLoader} />}
      </TouchableOpacity>
    );
  };

  const rows = useMemo(() => {
    const list: GridItem[] = gridItems;
    const result: GridItem[][] = [];
    for (let i = 0; i < list.length; i += COLS) result.push(list.slice(i, i + COLS));
    return result;
  }, [gridItems]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#8E8E93"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1C1C1E" />
            </View>
          ) : (
            <ScrollView
              style={styles.gridScroll}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
            >
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                  {row.map((entry, colIndex) => renderTile(entry, rowIndex * COLS + colIndex))}
                  {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.tile} />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.externalRow}>
            <TouchableOpacity style={styles.externalIcon} onPress={handleWhatsApp}>
              <View style={[styles.externalCircle, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={26} color="#FFF" />
              </View>
              <Text style={styles.externalLabel}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.externalIcon} onPress={handleExternalShare}>
              <View style={[styles.externalCircle, { backgroundColor: '#000' }]}>
                <Ionicons name="logo-twitter" size={22} color="#FFF" />
              </View>
              <Text style={styles.externalLabel}>X</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.externalIcon} onPress={handleExternalShare}>
              <View style={[styles.externalCircle, { backgroundColor: '#E4405F' }]}>
                <Ionicons name="logo-instagram" size={26} color="#FFF" />
              </View>
              <Text style={styles.externalLabel}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.externalIcon} onPress={handleExternalShare}>
              <View style={[styles.externalCircle, { backgroundColor: '#FFFC00' }]}>
                <Ionicons name="camera" size={24} color="#000" />
              </View>
              <Text style={styles.externalLabel}>Snapchat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.externalIcon} onPress={handleExternalShare}>
              <View style={[styles.externalCircle, { backgroundColor: '#E5E5EA' }]}>
                <Ionicons name="share-outline" size={24} color="#1C1C1E" />
              </View>
              <Text style={styles.externalLabel}>Share</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
            <Ionicons name="link" size={22} color="#FFF" />
            <Text style={styles.copyLinkText}>Copy Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 10,
    paddingHorizontal: PAD,
    paddingBottom: 34,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
    alignSelf: 'center',
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 0,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  gridScroll: {
    maxHeight: 320,
  },
  gridContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: GAP,
    gap: GAP,
  },
  tile: {
    width: TILE_SIZE,
    alignItems: 'center',
  },
  tileAvatarWrap: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    marginBottom: 8,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  tileLoader: {
    marginTop: 4,
  },
  externalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  externalIcon: {
    alignItems: 'center',
  },
  externalCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  externalLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3C',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
  },
  copyLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
