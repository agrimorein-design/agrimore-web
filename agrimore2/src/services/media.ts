/**
 * Agrimore — Universal Media Service
 * 
 * Supports both file upload (Firebase Storage) and external URL.
 * Centralized media management with validation, dedup, and reuse.
 * 
 * Firestore Collection: `media`
 * Storage Path: `media/{mediaId}/{filename}`
 */

import { db, storage } from '../firebase/config';
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Alert, Platform } from 'react-native';

// ─── Types ──────────────────────────────────────────
export interface MediaItem {
  id: string;
  fileUrl: string;          // Final accessible URL
  fileName: string;         // Original file name
  fileType: string;         // 'image/jpeg', 'image/png', etc.
  fileSize: number;         // Size in bytes
  sourceType: 'upload' | 'url';  // How it was added
  storagePath: string;      // Firebase Storage path (empty for URLs)
  module: string;           // 'product', 'category', 'banner', 'profile', etc.
  moduleId: string;         // ID of the linked entity
  tags: string[];           // Searchable tags
  width: number;            // Image width (if available)
  height: number;           // Image height (if available)
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

// ─── Config ─────────────────────────────────────────
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ─── Validation ─────────────────────────────────────

/**
 * Validate file before upload
 */
export function validateFile(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_FORMATS.includes(file.type.toLowerCase())) {
    return { valid: false, error: `Invalid format: ${file.type}. Allowed: JPG, PNG, WebP, SVG, GIF` };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File too large: ${sizeMB}MB. Maximum: 5MB` };
  }

  return { valid: true };
}

/**
 * Validate external URL
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Check URL format
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check if URL has image extension
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  const isImageExt = ext && ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext);

  // Google Drive, Cloudinary, etc. may not have extensions — that's OK
  // Just warn but don't block
  if (!isImageExt) {
    console.warn('URL does not have a known image extension. Proceeding anyway.');
  }

  return { valid: true };
}

/**
 * Auto-detect file type from URL
 */
function detectTypeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'gif': return 'image/gif';
    default: return 'image/jpeg'; // Default assumption
  }
}

// ─── Upload to Firebase Storage ─────────────────────

/**
 * Upload file to Firebase Storage and create media record
 */
export async function uploadMedia(
  file: { uri: string; name: string; size: number; type: string },
  module: string,
  moduleId: string,
  tags: string[] = []
): Promise<MediaItem> {
  // Validate
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // Create media doc first to get ID
    const mediaRef = await addDoc(collection(db, 'media'), {
      fileUrl: '',
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      sourceType: 'upload',
      storagePath: '',
      module,
      moduleId,
      tags,
      width: 0,
      height: 0,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Upload to Storage
    const storagePath = `media/${mediaRef.id}/${file.name}`;
    const storageRef = ref(storage, storagePath);

    // Fetch file blob
    const response = await fetch(file.uri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob, { contentType: file.type });
    const downloadUrl = await getDownloadURL(storageRef);

    // Update media doc with URL and path
    await updateDoc(doc(db, 'media', mediaRef.id), {
      fileUrl: downloadUrl,
      storagePath,
      updatedAt: serverTimestamp(),
    });

    return {
      id: mediaRef.id,
      fileUrl: downloadUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      sourceType: 'upload',
      storagePath,
      module,
      moduleId,
      tags,
      width: 0,
      height: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (e: any) {
    console.error('Media upload error:', e);
    throw new Error(`Upload failed: ${e.message}`);
  }
}

// ─── Save External URL ─────────────────────────────

/**
 * Save external URL as media record (no file upload)
 */
export async function saveMediaUrl(
  url: string,
  module: string,
  moduleId: string,
  fileName: string = '',
  tags: string[] = []
): Promise<MediaItem> {
  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check for duplicate URL
  const existing = await checkDuplicate(url);
  if (existing) {
    console.log('Media URL already exists, reusing:', existing.id);
    return existing;
  }

  const fileType = detectTypeFromUrl(url);
  const name = fileName || url.split('/').pop()?.split('?')[0] || 'image';

  try {
    const mediaRef = await addDoc(collection(db, 'media'), {
      fileUrl: url,
      fileName: name,
      fileType,
      fileSize: 0,
      sourceType: 'url',
      storagePath: '',       // No storage path for URLs
      module,
      moduleId,
      tags,
      width: 0,
      height: 0,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: mediaRef.id,
      fileUrl: url,
      fileName: name,
      fileType,
      fileSize: 0,
      sourceType: 'url',
      storagePath: '',
      module,
      moduleId,
      tags,
      width: 0,
      height: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (e: any) {
    console.error('Save URL error:', e);
    throw new Error(`Failed to save URL: ${e.message}`);
  }
}

// ─── Check Duplicate ────────────────────────────────

/**
 * Check if URL already exists in media collection (for reuse)
 */
async function checkDuplicate(url: string): Promise<MediaItem | null> {
  try {
    const q = query(collection(db, 'media'), where('fileUrl', '==', url));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as MediaItem;
    }
  } catch (e) {
    console.error('Duplicate check error:', e);
  }
  return null;
}

// ─── Get Media ──────────────────────────────────────

/**
 * Get all media for a specific module and entity
 */
export async function getMediaByModule(module: string, moduleId: string): Promise<MediaItem[]> {
  try {
    const q = query(
      collection(db, 'media'),
      where('module', '==', module),
      where('moduleId', '==', moduleId),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaItem));
  } catch (e) {
    console.error('Get media error:', e);
    return [];
  }
}

/**
 * Get single media item by ID
 */
export async function getMediaById(mediaId: string): Promise<MediaItem | null> {
  try {
    const snap = await getDoc(doc(db, 'media', mediaId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as MediaItem;
    }
  } catch (e) {
    console.error('Get media by ID error:', e);
  }
  return null;
}

// ─── Replace Media ──────────────────────────────────

/**
 * Replace media — deletes old file (if uploaded) and saves new one
 */
export async function replaceMedia(
  oldMediaId: string,
  newFile: { uri: string; name: string; size: number; type: string } | null,
  newUrl: string | null,
  module: string,
  moduleId: string
): Promise<MediaItem> {
  // Delete old media
  await deleteMedia(oldMediaId);

  // Upload new
  if (newFile) {
    return await uploadMedia(newFile, module, moduleId);
  } else if (newUrl) {
    return await saveMediaUrl(newUrl, module, moduleId);
  }

  throw new Error('Either file or URL is required');
}

// ─── Delete Media ───────────────────────────────────

/**
 * Delete media — removes from Firestore and Storage (if uploaded)
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  try {
    const mediaDoc = await getDoc(doc(db, 'media', mediaId));
    if (!mediaDoc.exists()) return;

    const data = mediaDoc.data();

    // Delete from Storage if it was uploaded
    if (data.sourceType === 'upload' && data.storagePath) {
      try {
        const storageRef = ref(storage, data.storagePath);
        await deleteObject(storageRef);
      } catch (e) {
        console.warn('Storage delete warning:', e);
      }
    }

    // Delete Firestore doc
    await deleteDoc(doc(db, 'media', mediaId));
  } catch (e) {
    console.error('Delete media error:', e);
  }
}

/**
 * Soft delete — mark as inactive instead of deleting
 */
export async function softDeleteMedia(mediaId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'media', mediaId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Soft delete error:', e);
  }
}

// ─── Helper: Pick Image (React Native) ─────────────

/**
 * Utility to launch image picker (requires expo-image-picker)
 */
export async function pickImage(): Promise<{ uri: string; name: string; size: number; type: string } | null> {
  try {
    const ImagePicker = require('expo-image-picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'image.jpg';
      return {
        uri: asset.uri,
        name: fileName,
        size: asset.fileSize || 0,
        type: asset.mimeType || 'image/jpeg',
      };
    }
  } catch (e) {
    console.error('Image picker error:', e);
  }
  return null;
}
