/**
 * Agrimore — Firestore Database Seed Script
 * 
 * Run: npx ts-node src/firebase/seed.ts
 * OR:  node -e "require('./src/firebase/seed')"
 * 
 * Initializes all required collections with proper structure.
 * Safe to re-run — uses setDoc with merge.
 */

import { db } from './config';
import { doc, setDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const now = serverTimestamp();
const future = (days: number) => Timestamp.fromDate(new Date(Date.now() + days * 86400000));

async function seedSettings() {
  console.log('📦 Seeding settings...');
  await setDoc(doc(db, 'settings', 'app'), {
    // Delivery
    deliveryFee: 30,
    freeDeliveryAbove: 499,
    maxDeliveryRange: 5,
    // Tax
    gst: 5,
    // Order
    minOrderValue: 99,
    // Referral
    referralRewardReferrer: 50,
    referralRewardReferred: 50,
    referralEnabled: true,
    // Wallet
    walletEnabled: true,
    walletMaxUsage: 100, // max % of order payable by wallet
    // Payment methods
    codEnabled: true,
    upiEnabled: true,
    cardEnabled: true,
    // Flash Sale
    flashSaleEnabled: true,
    // Support
    supportPhone: '+917094826587',
    supportEmail: 'help@agrimore.com',
    supportWhatsapp: '+917094826587',
    // Store
    storeLocation: { lat: 13.0827, lng: 80.2707 },
    storeName: 'Agrimore Fresh Market',
    storeAddress: 'Chennai, Tamil Nadu',
    // App
    maintenanceMode: false,
    appVersion: '1.0.0',
    forceUpdate: false,
    updatedAt: now,
  }, { merge: true });
}

async function seedCategories() {
  console.log('📦 Seeding categories...');
  const categories = [
    { name: 'Fruits', emoji: '🍎', icon: 'apple', priority: 1, isVisible: true, status: 'active', productCount: 0 },
    { name: 'Vegetables', emoji: '🥦', icon: 'leaf', priority: 2, isVisible: true, status: 'active', productCount: 0 },
    { name: 'Dairy', emoji: '🥛', icon: 'milk', priority: 3, isVisible: true, status: 'active', productCount: 0 },
    { name: 'Meats', emoji: '🥩', icon: 'beef', priority: 4, isVisible: true, status: 'active', productCount: 0 },
    { name: 'Grains', emoji: '🌾', icon: 'wheat', priority: 5, isVisible: true, status: 'active', productCount: 0 },
    { name: 'Cooking', emoji: '🫒', icon: 'cooking-pot', priority: 6, isVisible: true, status: 'active', productCount: 0 },
    { name: 'Natural', emoji: '🍯', icon: 'flower', priority: 7, isVisible: true, status: 'active', productCount: 0 },
    { name: 'Beverages', emoji: '🥤', icon: 'cup-soda', priority: 8, isVisible: true, status: 'active', productCount: 0 },
  ];

  for (const cat of categories) {
    await addDoc(collection(db, 'categories'), { ...cat, createdAt: now });
  }
}

async function seedProducts() {
  console.log('📦 Seeding products...');
  const products = [
    { name: 'Organic Tomatoes', categoryName: 'Vegetables', price: 60, discountPrice: 45, discount: 25, stock: 50, unit: '1 kg', description: 'Farm-fresh organic tomatoes, pesticide-free.', tags: ['organic', 'fresh'], images: [] },
    { name: 'Red Apples', categoryName: 'Fruits', price: 249, discountPrice: 199, discount: 20, stock: 30, unit: '1 kg', description: 'Crispy and sweet red apples from Himachal.', tags: ['fresh', 'bestseller'], images: [] },
    { name: 'Farm Fresh Milk', categoryName: 'Dairy', price: 68, discountPrice: 58, discount: 15, stock: 100, unit: '1 L', description: 'Pure cow milk delivered fresh daily.', tags: ['fresh', 'daily'], images: [] },
    { name: 'Green Broccoli', categoryName: 'Vegetables', price: 89, discountPrice: 69, discount: 22, stock: 25, unit: '250 g', description: 'Fresh green broccoli, rich in vitamins.', tags: ['organic', 'superfood'], images: [] },
    { name: 'Farm Eggs', categoryName: 'Dairy', price: 120, discountPrice: 99, discount: 18, stock: 60, unit: '12 pcs', description: 'Free-range farm fresh eggs.', tags: ['protein', 'fresh'], images: [] },
    { name: 'Basmati Rice', categoryName: 'Grains', price: 350, discountPrice: 299, discount: 15, stock: 40, unit: '1 kg', description: 'Premium long-grain basmati rice.', tags: ['premium', 'staple'], images: [] },
    { name: 'Pure Desi Ghee', categoryName: 'Dairy', price: 580, discountPrice: 499, discount: 14, stock: 20, unit: '500 ml', description: 'Traditional A2 cow ghee, hand-churned.', tags: ['organic', 'traditional'], images: [] },
    { name: 'Wildflower Honey', categoryName: 'Natural', price: 450, discountPrice: 399, discount: 11, stock: 15, unit: '500 g', description: 'Raw, unprocessed wildflower honey.', tags: ['organic', 'natural'], images: [] },
    { name: 'Chicken Breast', categoryName: 'Meats', price: 320, discountPrice: 280, discount: 12, stock: 35, unit: '500 g', description: 'Boneless chicken breast, hygienically packed.', tags: ['protein', 'fresh'], images: [] },
    { name: 'Extra Virgin Olive Oil', categoryName: 'Cooking', price: 650, discountPrice: 550, discount: 15, stock: 18, unit: '500 ml', description: 'Cold-pressed extra virgin olive oil.', tags: ['premium', 'healthy'], images: [] },
    { name: 'Fresh Spinach', categoryName: 'Vegetables', price: 40, discountPrice: 30, discount: 25, stock: 3, unit: '250 g', description: 'Freshly harvested organic spinach.', tags: ['organic', 'iron-rich'], images: [] },
    { name: 'Mango Alphonso', categoryName: 'Fruits', price: 500, discountPrice: 420, discount: 16, stock: 2, unit: '1 kg', description: 'Premium Ratnagiri Alphonso mangoes.', tags: ['seasonal', 'premium'], images: [] },
  ];

  for (const p of products) {
    await addDoc(collection(db, 'products'), {
      ...p,
      isAvailable: true,
      isFeatured: false,
      lowStockThreshold: 5,
      soldCount: 0,
      rating: 0,
      ratingCount: 0,
      distanceRange: '0-5km',
      priority: 0,
      status: 'active',
      nutritionInfo: { calories: 0, protein: 0, fat: 0, carbs: 0 },
      farmInfo: '',
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function seedDeliverySlots() {
  console.log('📦 Seeding delivery slots...');
  const slots = [
    { label: 'Today', timeRange: '2:00 PM - 4:00 PM', emoji: '⚡', maxOrders: 20, currentOrders: 0, isAvailable: true, priority: 1 },
    { label: 'Today', timeRange: '5:00 PM - 7:00 PM', emoji: '🌇', maxOrders: 20, currentOrders: 0, isAvailable: true, priority: 2 },
    { label: 'Tomorrow', timeRange: '9:00 AM - 11:00 AM', emoji: '🌅', maxOrders: 25, currentOrders: 0, isAvailable: true, priority: 3 },
    { label: 'Tomorrow', timeRange: '2:00 PM - 4:00 PM', emoji: '☀️', maxOrders: 25, currentOrders: 0, isAvailable: true, priority: 4 },
    { label: 'Tomorrow', timeRange: '5:00 PM - 7:00 PM', emoji: '🌄', maxOrders: 25, currentOrders: 0, isAvailable: true, priority: 5 },
  ];

  for (const slot of slots) {
    await addDoc(collection(db, 'deliverySlots'), { ...slot, createdAt: now });
  }
}

async function seedCoupons() {
  console.log('📦 Seeding coupons...');
  const coupons = [
    { code: 'FRESH20', description: 'Get 20% off on fresh vegetables', discountType: 'percentage', discount: 20, maxDiscount: 100, minOrder: 299, usageLimit: 100, perUserLimit: 3, usedCount: 0, applicableCategories: [], expiry: future(30), isActive: true },
    { code: 'AGRI50', description: 'Flat ₹50 off on orders above ₹500', discountType: 'flat', discount: 50, maxDiscount: 50, minOrder: 500, usageLimit: 200, perUserLimit: 1, usedCount: 0, applicableCategories: [], expiry: future(45), isActive: true },
    { code: 'DAIRY10', description: '10% off on all dairy products', discountType: 'percentage', discount: 10, maxDiscount: 80, minOrder: 199, usageLimit: 150, perUserLimit: 5, usedCount: 0, applicableCategories: ['Dairy'], expiry: future(20), isActive: true },
    { code: 'FIRST100', description: 'New user special - ₹100 off first order', discountType: 'flat', discount: 100, maxDiscount: 100, minOrder: 399, usageLimit: 500, perUserLimit: 1, usedCount: 0, applicableCategories: [], expiry: future(60), isActive: true },
  ];

  for (const c of coupons) {
    await addDoc(collection(db, 'coupons'), { ...c, createdAt: now });
  }
}

async function seedBanners() {
  console.log('📦 Seeding banners...');
  const banners = [
    { title: 'Fresh Arrivals', imageUrl: '', linkType: 'category', linkValue: 'Fruits', priority: 1, isActive: true, startDate: now, endDate: future(30) },
    { title: 'Organic Week', imageUrl: '', linkType: 'category', linkValue: 'Vegetables', priority: 2, isActive: true, startDate: now, endDate: future(7) },
    { title: 'Dairy Deals', imageUrl: '', linkType: 'category', linkValue: 'Dairy', priority: 3, isActive: true, startDate: now, endDate: future(14) },
  ];

  for (const b of banners) {
    await addDoc(collection(db, 'banners'), { ...b, createdAt: now });
  }
}

async function seedComboOffers() {
  console.log('📦 Seeding combo offers...');
  // These will be populated with real product IDs after products are seeded
  // For now, create the structure
  const combos = [
    { title: 'Buy Chicken, Get Masala Free!', mainProductName: 'Chicken Breast', mainProductQty: 1, freeProductName: 'Garam Masala', freeProductQty: 1, mainProductId: '', freeProductId: '', freeProductImage: '', isActive: true, startDate: now, endDate: future(30), priority: 1 },
  ];

  for (const c of combos) {
    await addDoc(collection(db, 'comboOffers'), { ...c, createdAt: now });
  }
}

async function seedFlashSales() {
  console.log('📦 Seeding flash sales...');
  await addDoc(collection(db, 'flashSales'), {
    title: 'Weekend Flash Sale',
    discount: 30,
    productIds: [],
    startTime: now,
    endTime: future(2),
    isActive: true,
    createdAt: now,
  });
}

// ─── MAIN ──────────────────────────────────────────
export async function seedDatabase() {
  console.log('🌱 Starting Agrimore Database Seed...\n');
  try {
    await seedSettings();
    await seedCategories();
    await seedProducts();
    await seedDeliverySlots();
    await seedCoupons();
    await seedBanners();
    await seedComboOffers();
    await seedFlashSales();
    console.log('\n✅ Database seeded successfully!');
  } catch (e) {
    console.error('❌ Seed error:', e);
  }
}

// Auto-run if called directly
// seedDatabase();
