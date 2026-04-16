/**
 * Agrimore — App Settings Service
 * 
 * Fetches all app settings from Firestore `settings/app` document.
 * Used by all screens so nothing is hardcoded.
 */

import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface AppSettings {
  // Delivery
  deliveryFee: number;
  freeDeliveryAbove: number;
  maxDeliveryRange: number;
  // Tax
  gst: number;
  // Order
  minOrderValue: number;
  // Referral
  referralRewardReferrer: number;
  referralRewardReferred: number;
  referralEnabled: boolean;
  // Wallet
  walletEnabled: boolean;
  walletMaxUsage: number;
  // Payment methods
  codEnabled: boolean;
  upiEnabled: boolean;
  cardEnabled: boolean;
  // Flash Sale
  flashSaleEnabled: boolean;
  // Support
  supportPhone: string;
  supportEmail: string;
  supportWhatsapp: string;
  // Store
  storeLocation: { lat: number; lng: number };
  storeName: string;
  storeAddress: string;
  // App
  maintenanceMode: boolean;
  appVersion: string;
  forceUpdate: boolean;
}

// Default fallback values (used if Firestore fetch fails)
const DEFAULTS: AppSettings = {
  deliveryFee: 30,
  freeDeliveryAbove: 499,
  maxDeliveryRange: 5,
  gst: 5,
  minOrderValue: 99,
  referralRewardReferrer: 50,
  referralRewardReferred: 50,
  referralEnabled: true,
  walletEnabled: true,
  walletMaxUsage: 100,
  codEnabled: true,
  upiEnabled: true,
  cardEnabled: true,
  flashSaleEnabled: true,
  supportPhone: '+917094826587',
  supportEmail: 'help@agrimore.com',
  supportWhatsapp: '+917094826587',
  storeLocation: { lat: 13.0827, lng: 80.2707 },
  storeName: 'Agrimore Fresh Market',
  storeAddress: 'Chennai, Tamil Nadu',
  maintenanceMode: false,
  appVersion: '1.0.0',
  forceUpdate: false,
};

// In-memory cache
let cachedSettings: AppSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get app settings from Firestore (with caching)
 */
export async function getAppSettings(): Promise<AppSettings> {
  // Return cache if still valid
  if (cachedSettings && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (snap.exists()) {
      cachedSettings = { ...DEFAULTS, ...snap.data() } as AppSettings;
    } else {
      cachedSettings = DEFAULTS;
    }
    cacheTimestamp = Date.now();
    return cachedSettings;
  } catch (e) {
    console.error('Failed to fetch settings:', e);
    return cachedSettings || DEFAULTS;
  }
}

/**
 * Update app settings (admin only)
 */
export async function updateAppSettings(updates: Partial<AppSettings>): Promise<void> {
  try {
    await updateDoc(doc(db, 'settings', 'app'), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    // Invalidate cache
    cachedSettings = null;
    cacheTimestamp = 0;
  } catch (e) {
    console.error('Failed to update settings:', e);
    throw e;
  }
}

/**
 * Clear settings cache (force refresh on next read)
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}
