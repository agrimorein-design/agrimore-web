/**
 * Agrimore — Universal MediaPicker Component
 * 
 * Reusable across Admin Panel for products, categories, banners, etc.
 * Supports:
 *   - File upload from device
 *   - External URL input
 *   - Preview with replace/delete
 *   - Multiple images
 */

import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, Alert,
  StyleSheet, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { Upload, Link2, X, Plus, Check, Eye, RefreshCw, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { uploadMedia, saveMediaUrl, deleteMedia, pickImage, validateUrl, MediaItem } from '../../services/media';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

interface MediaPickerProps {
  module: string;              // 'product', 'category', 'banner', etc.
  moduleId: string;            // ID of the entity
  existingMedia?: MediaItem[]; // Already uploaded media
  multiple?: boolean;          // Allow multiple images
  maxImages?: number;          // Max number of images (default: 5)
  onMediaChange?: (media: MediaItem[]) => void; // Callback on change
  darkMode?: boolean;          // For admin panel dark theme
}

export default function MediaPicker({
  module,
  moduleId,
  existingMedia = [],
  multiple = false,
  maxImages = 5,
  onMediaChange,
  darkMode = true,
}: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>(existingMedia);
  const [mode, setMode] = useState<'idle' | 'url'>('idle');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const colors = darkMode
    ? { bg: '#1F2937', border: '#374151', text: '#FFF', sub: '#9CA3AF', input: '#374151' }
    : { bg: '#FFF', border: '#E5E7EB', text: '#1F2937', sub: '#6B7280', input: '#F9FAFB' };

  // ─── File Upload ────────────────────────────────
  const handleFileUpload = async () => {
    if (!multiple && media.length >= 1) {
      Alert.alert('Limit Reached', 'Remove the existing image first, or enable multiple images.');
      return;
    }
    if (media.length >= maxImages) {
      Alert.alert('Limit Reached', `Maximum ${maxImages} images allowed.`);
      return;
    }

    setUploading(true);
    try {
      const file = await pickImage();
      if (!file) { setUploading(false); return; }

      const mediaItem = await uploadMedia(file, module, moduleId);
      const updated = [...media, mediaItem];
      setMedia(updated);
      onMediaChange?.(updated);
      Alert.alert('✅ Uploaded', 'Image uploaded successfully!');
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    }
    setUploading(false);
  };

  // ─── URL Save ───────────────────────────────────
  const handleUrlSave = async () => {
    if (!urlInput.trim()) return;

    const validation = validateUrl(urlInput);
    if (!validation.valid) {
      Alert.alert('Invalid URL', validation.error);
      return;
    }

    if (!multiple && media.length >= 1) {
      Alert.alert('Limit Reached', 'Remove the existing image first.');
      return;
    }

    setUploading(true);
    try {
      const mediaItem = await saveMediaUrl(urlInput, module, moduleId);
      const updated = [...media, mediaItem];
      setMedia(updated);
      onMediaChange?.(updated);
      setUrlInput('');
      setMode('idle');
      Alert.alert('✅ Saved', 'Image URL saved successfully!');
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    }
    setUploading(false);
  };

  // ─── Delete ─────────────────────────────────────
  const handleDelete = async (mediaId: string) => {
    Alert.alert('Delete Image', 'Are you sure you want to remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteMedia(mediaId);
            const updated = media.filter(m => m.id !== mediaId);
            setMedia(updated);
            onMediaChange?.(updated);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      },
    ]);
  };

  // ─── Replace ────────────────────────────────────
  const handleReplace = async (oldMediaId: string) => {
    // Delete old, then pick new
    try {
      await deleteMedia(oldMediaId);
      const updated = media.filter(m => m.id !== oldMediaId);
      setMedia(updated);

      // Open picker
      const file = await pickImage();
      if (file) {
        setUploading(true);
        const mediaItem = await uploadMedia(file, module, moduleId);
        const newList = [...updated, mediaItem];
        setMedia(newList);
        onMediaChange?.(newList);
        setUploading(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setUploading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <ImageIcon color="#D4A843" size={18} />
          <Text style={[font, s.title, { color: colors.text }]}>
            Media {multiple ? `(${media.length}/${maxImages})` : ''}
          </Text>
        </View>
        <View style={s.headerRight}>
          <Text style={[font, s.sourceHint, { color: colors.sub }]}>
            {media.length > 0 ? `${media.filter(m => m.sourceType === 'upload').length} uploaded, ${media.filter(m => m.sourceType === 'url').length} URL` : 'No media'}
          </Text>
        </View>
      </View>

      {/* Existing Media Grid */}
      {media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mediaScroll}>
          {media.map((item) => (
            <View key={item.id} style={[s.mediaCard, { borderColor: colors.border }]}>
              <Image
                source={{ uri: item.fileUrl }}
                style={s.mediaImage}
                resizeMode="cover"
              />
              {/* Source badge */}
              <View style={[s.sourceBadge, item.sourceType === 'upload' ? { backgroundColor: '#3B82F6' } : { backgroundColor: '#D4A843' }]}>
                <Text style={[font, s.sourceBadgeText]}>
                  {item.sourceType === 'upload' ? '📤' : '🔗'}
                </Text>
              </View>

              {/* Actions overlay */}
              <View style={s.mediaActions}>
                <TouchableOpacity style={s.mediaActionBtn} onPress={() => setPreviewUrl(item.fileUrl)}>
                  <Eye color="#FFF" size={12} />
                </TouchableOpacity>
                <TouchableOpacity style={s.mediaActionBtn} onPress={() => handleReplace(item.id)}>
                  <RefreshCw color="#FFF" size={12} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.mediaActionBtn, { backgroundColor: 'rgba(239,68,68,0.8)' }]} onPress={() => handleDelete(item.id)}>
                  <Trash2 color="#FFF" size={12} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Upload Actions */}
      {(multiple || media.length === 0) && media.length < maxImages && (
        <View style={s.uploadActions}>
          {/* File Upload Button */}
          <TouchableOpacity
            style={[s.uploadBtn, { borderColor: colors.border }]}
            onPress={handleFileUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#D4A843" />
            ) : (
              <>
                <Upload color="#D4A843" size={20} />
                <Text style={[font, s.uploadBtnText]}>Upload File</Text>
                <Text style={[font, s.uploadBtnSub, { color: colors.sub }]}>JPG, PNG, WebP • Max 5MB</Text>
              </>
            )}
          </TouchableOpacity>

          {/* URL Input Toggle */}
          <TouchableOpacity
            style={[s.uploadBtn, { borderColor: colors.border }]}
            onPress={() => setMode(mode === 'url' ? 'idle' : 'url')}
          >
            <Link2 color="#3B82F6" size={20} />
            <Text style={[font, s.uploadBtnText]}>Paste URL</Text>
            <Text style={[font, s.uploadBtnSub, { color: colors.sub }]}>Google Drive, CDN, etc.</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* URL Input Form */}
      {mode === 'url' && (
        <View style={s.urlForm}>
          <TextInput
            style={[font, s.urlInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor={colors.sub}
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* URL Preview */}
          {urlInput.length > 10 && (
            <View style={s.urlPreview}>
              <Image
                source={{ uri: urlInput }}
                style={s.urlPreviewImg}
                resizeMode="cover"
              />
            </View>
          )}

          <View style={s.urlActions}>
            <TouchableOpacity style={s.urlCancelBtn} onPress={() => { setMode('idle'); setUrlInput(''); }}>
              <X color="#9CA3AF" size={16} />
              <Text style={[font, { color: '#9CA3AF', marginLeft: 4, fontSize: 12 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.urlSaveBtn, !urlInput.trim() && { opacity: 0.5 }]}
              onPress={handleUrlSave}
              disabled={!urlInput.trim() || uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#145A32" />
              ) : (
                <>
                  <Check color="#145A32" size={16} />
                  <Text style={[font, { color: '#145A32', marginLeft: 4, fontSize: 12, fontWeight: '900' }]}>Save URL</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Full Preview Modal */}
      {previewUrl && (
        <TouchableOpacity style={s.previewOverlay} onPress={() => setPreviewUrl(null)} activeOpacity={1}>
          <View style={s.previewModal}>
            <Image source={{ uri: previewUrl }} style={s.previewImage} resizeMode="contain" />
            <TouchableOpacity style={s.previewClose} onPress={() => setPreviewUrl(null)}>
              <X color="#FFF" size={24} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: {},
  title: { fontSize: 14, fontWeight: '900', marginLeft: 8 },
  sourceHint: { fontSize: 11 },
  // Media grid
  mediaScroll: { marginBottom: 12 },
  mediaCard: {
    width: 100, height: 100, borderRadius: 12, marginRight: 10, overflow: 'hidden',
    position: 'relative', borderWidth: 1,
  },
  mediaImage: { width: '100%', height: '100%' },
  sourceBadge: {
    position: 'absolute', top: 4, left: 4, paddingHorizontal: 4, paddingVertical: 2,
    borderRadius: 6, zIndex: 2,
  },
  sourceBadgeText: { fontSize: 10 },
  mediaActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6,
  },
  mediaActionBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Upload buttons
  uploadActions: { flexDirection: 'row', gap: 10 },
  uploadBtn: {
    flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnText: { color: '#D4A843', fontSize: 12, fontWeight: '700', marginTop: 6 },
  uploadBtnSub: { fontSize: 9, marginTop: 2 },
  // URL form
  urlForm: { marginTop: 12 },
  urlInput: {
    borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 13,
  },
  urlPreview: {
    marginTop: 10, height: 120, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#374151',
  },
  urlPreviewImg: { width: '100%', height: '100%' },
  urlActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  urlCancelBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, backgroundColor: 'rgba(156,163,175,0.1)',
  },
  urlSaveBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#D4A843',
  },
  // Preview modal
  previewOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  previewModal: { width: '90%', height: '70%', position: 'relative' },
  previewImage: { width: '100%', height: '100%', borderRadius: 16 },
  previewClose: {
    position: 'absolute', top: 8, right: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
});
