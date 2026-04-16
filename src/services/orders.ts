/**
 * Agrimore — Order Service
 * 
 * Handles order creation, status updates, stock management,
 * coupon validation, combo offers, and wallet transactions.
 */

import { db } from '../firebase/config';
import {
  doc, getDoc, getDocs, addDoc, updateDoc, collection,
  query, where, increment, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { getAppSettings } from './settings';

// ─── COUPON VALIDATION ─────────────────────────────
export async function validateCoupon(code: string, cartTotal: number, userId: string) {
  try {
    const q = query(collection(db, 'coupons'), where('code', '==', code));
    const snap = await getDocs(q);

    if (snap.empty) return { valid: false, error: 'Invalid coupon code' };

    const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;

    // Check active
    if (!coupon.isActive) return { valid: false, error: 'This coupon is no longer active' };

    // Check expiry
    const now = new Date();
    const expiryDate = coupon.expiry?.toDate ? coupon.expiry.toDate() : new Date(coupon.expiry);
    if (now > expiryDate) return { valid: false, error: 'This coupon has expired' };

    // Check usage limit
    if (coupon.usedCount >= coupon.usageLimit) return { valid: false, error: 'Coupon usage limit reached' };

    // Check min order
    if (cartTotal < coupon.minOrder) return { valid: false, error: `Minimum order value is ₹${coupon.minOrder}` };

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.min(cartTotal * (coupon.discount / 100), coupon.maxDiscount || Infinity);
    } else {
      discountAmount = coupon.discount;
    }

    return {
      valid: true,
      couponId: coupon.id,
      discountAmount: Math.round(discountAmount),
      code: coupon.code,
      description: coupon.description,
    };
  } catch (e) {
    console.error('Coupon validation error:', e);
    return { valid: false, error: 'Failed to validate coupon' };
  }
}

// ─── COMBO OFFERS CHECK ─────────────────────────────
export async function checkComboOffers(cartItems: any[]) {
  try {
    const snap = await getDocs(query(collection(db, 'comboOffers'), where('isActive', '==', true)));
    const freeItems: any[] = [];

    for (const comboDoc of snap.docs) {
      const combo = comboDoc.data();
      const now = new Date();
      const start = combo.startDate?.toDate ? combo.startDate.toDate() : new Date(0);
      const end = combo.endDate?.toDate ? combo.endDate.toDate() : new Date('2099-01-01');

      if (now < start || now > end) continue;

      // Check if main product is in cart with sufficient qty
      const mainItem = cartItems.find(item => item.id === combo.mainProductId);
      if (mainItem && mainItem.quantity >= combo.mainProductQty) {
        freeItems.push({
          id: combo.freeProductId,
          name: combo.freeProductName,
          image: combo.freeProductImage || '',
          price: 0,
          discountPrice: 0,
          quantity: combo.freeProductQty,
          isFreeCombo: true,
          comboTitle: combo.title,
        });
      }
    }

    return freeItems;
  } catch (e) {
    console.error('Combo offer check error:', e);
    return [];
  }
}

// ─── STOCK UPDATE ───────────────────────────────────
export async function updateStockAfterOrder(products: any[], operation: 'decrement' | 'increment') {
  try {
    for (const product of products) {
      if (product.isFreeCombo && operation === 'decrement') {
        // Also decrement stock for free items
      }
      const productRef = doc(db, 'products', product.id);
      const stockChange = operation === 'decrement' ? -product.quantity : product.quantity;
      const soldChange = operation === 'decrement' ? product.quantity : -product.quantity;

      await updateDoc(productRef, {
        stock: increment(stockChange),
        soldCount: increment(soldChange),
        updatedAt: serverTimestamp(),
      });

      // Check low stock
      if (operation === 'decrement') {
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const data = productDoc.data();
          if (data.stock <= (data.lowStockThreshold || 5)) {
            console.warn(`⚠️ Low stock alert: ${data.name} (${data.stock} remaining)`);
            // In production: create admin notification
          }
        }
      }
    }
  } catch (e) {
    console.error('Stock update error:', e);
  }
}

// ─── WALLET TRANSACTION ─────────────────────────────
export async function createWalletTransaction(
  userId: string,
  type: 'credit' | 'debit',
  amount: number,
  title: string,
  reason: string,
  orderId?: string
) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentBalance = userDoc.exists() ? (userDoc.data().walletBalance || 0) : 0;
    const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

    // Create transaction record
    await addDoc(collection(db, 'users', userId, 'transactions'), {
      type,
      amount,
      title,
      description: title,
      reason,
      orderId: orderId || '',
      balanceAfter: newBalance,
      createdAt: serverTimestamp(),
    });

    // Update balance
    await updateDoc(userRef, {
      walletBalance: newBalance,
    });

    return newBalance;
  } catch (e) {
    console.error('Wallet transaction error:', e);
    throw e;
  }
}

// ─── REFERRAL REWARD ────────────────────────────────
export async function processReferralReward(referrerId: string, referredUserId: string, referredUserName: string) {
  try {
    const settings = await getAppSettings();
    if (!settings.referralEnabled) return;

    // Record referral
    await addDoc(collection(db, 'referrals'), {
      referrerId,
      referredUserId,
      referredUserName,
      referrerReward: settings.referralRewardReferrer,
      referredReward: settings.referralRewardReferred,
      status: 'completed',
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    // Credit referrer
    await createWalletTransaction(
      referrerId,
      'credit',
      settings.referralRewardReferrer,
      `Referral Bonus - ${referredUserName} joined`,
      'referral'
    );

    // Credit referred user
    await createWalletTransaction(
      referredUserId,
      'credit',
      settings.referralRewardReferred,
      'Welcome Bonus - Referral reward',
      'referral'
    );

    // Update referrer stats
    await updateDoc(doc(db, 'users', referrerId), {
      referralFriends: increment(1),
      referralEarned: increment(settings.referralRewardReferrer),
    });
  } catch (e) {
    console.error('Referral reward error:', e);
  }
}

// ─── CREATE NOTIFICATION ────────────────────────────
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  emoji: string,
  type: string,
  linkType?: string,
  linkValue?: string
) {
  try {
    await addDoc(collection(db, 'users', userId, 'notifications'), {
      title,
      body,
      emoji,
      type,
      linkType: linkType || '',
      linkValue: linkValue || '',
      unread: true,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Notification creation error:', e);
  }
}

// ─── PLACE ORDER (Full Logic) ──────────────────────
export async function placeOrder(orderData: {
  userId: string;
  userName: string;
  userPhone: string;
  products: any[];
  subtotal: number;
  couponCode?: string;
  discount: number;
  address: string;
  addressId: string;
  location: { lat: number; lng: number };
  distance: number;
  distanceRange: string;
  deliverySlot: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentId: string;
}) {
  const settings = await getAppSettings();

  // Calculate charges
  const deliveryFee = orderData.subtotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryFee;
  const tax = Math.round(orderData.subtotal * (settings.gst / 100));
  const total = orderData.subtotal + deliveryFee + tax - orderData.discount;

  // Create order document
  const orderDoc = await addDoc(collection(db, 'orders'), {
    ...orderData,
    deliveryFee,
    tax,
    totalAmount: total,
    status: 'placed',
    statusHistory: [{ status: 'placed', timestamp: new Date(), note: 'Order placed by customer' }],
    rating: 0,
    ratingTags: [],
    ratingNote: '',
    adminNote: '',
    cancelReason: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update stock
  await updateStockAfterOrder(orderData.products, 'decrement');

  // Update coupon usage
  if (orderData.couponCode) {
    const cq = query(collection(db, 'coupons'), where('code', '==', orderData.couponCode));
    const cSnap = await getDocs(cq);
    if (!cSnap.empty) {
      await updateDoc(doc(db, 'coupons', cSnap.docs[0].id), {
        usedCount: increment(1),
      });
    }
  }

  // Wallet debit if wallet payment
  if (orderData.paymentMethod === 'wallet') {
    await createWalletTransaction(
      orderData.userId,
      'debit',
      total,
      `Order #${orderDoc.id.substring(0, 8).toUpperCase()}`,
      'order',
      orderDoc.id
    );
  }

  // Update user stats
  await updateDoc(doc(db, 'users', orderData.userId), {
    totalOrders: increment(1),
    totalSpent: increment(total),
  });

  // Send notification
  await createNotification(
    orderData.userId,
    'Order Placed! 🎉',
    `Your order #${orderDoc.id.substring(0, 8).toUpperCase()} has been placed. Total: ₹${total}`,
    '📦',
    'order',
    'order',
    orderDoc.id
  );

  return orderDoc.id;
}

// ─── UPDATE ORDER STATUS (Admin) ───────────────────
export async function updateOrderStatus(orderId: string, newStatus: string, note: string = '') {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data();
    const existingHistory = order.statusHistory || [];

    await updateDoc(orderRef, {
      status: newStatus,
      statusHistory: [...existingHistory, { status: newStatus, timestamp: new Date(), note }],
      updatedAt: serverTimestamp(),
    });

    // Status-specific actions
    const statusEmojis: Record<string, string> = {
      confirmed: '✅', packed: '📦', out_for_delivery: '🚚', delivered: '🎉', cancelled: '❌', rejected: '🚫',
    };
    const statusMessages: Record<string, string> = {
      confirmed: 'Your order has been confirmed!',
      packed: 'Your order is packed and ready!',
      out_for_delivery: 'Your order is on the way!',
      delivered: 'Your order has been delivered. Enjoy!',
      cancelled: 'Your order has been cancelled.',
      rejected: 'Your order was rejected by the store.',
    };

    if (statusMessages[newStatus]) {
      await createNotification(
        order.userId,
        `Order ${newStatus.replace(/_/g, ' ')}`,
        statusMessages[newStatus],
        statusEmojis[newStatus] || '📋',
        'order',
        'order',
        orderId
      );
    }

    // Reward Scratch Card on Delivery
    if (newStatus === 'delivered' && !order.scratchRewardIssued) {
      try {
        const rewardAmt = Math.floor(Math.random() * (50 - 10 + 1)) + 10; // ₹10 to ₹50 random
        await addDoc(collection(db, 'users', order.userId, 'scratchCards'), {
          amount: rewardAmt,
          isScratched: false,
          orderId: orderId,
          createdAt: serverTimestamp(),
        });
        // Mark order so we don't issue twice
        await updateDoc(orderRef, { scratchRewardIssued: true });
      } catch (e) {
        console.error('Scratch card issuance error:', e);
      }
    }

    // Restock if cancelled
    if (newStatus === 'cancelled' || newStatus === 'rejected') {
      await updateStockAfterOrder(order.products, 'increment');

      // Refund if paid
      if (order.paymentStatus === 'paid' && order.paymentMethod !== 'cod') {
        await createWalletTransaction(
          order.userId,
          'credit',
          order.totalAmount,
          `Refund - Order #${orderId.substring(0, 8).toUpperCase()}`,
          'refund',
          orderId
        );
        await updateDoc(orderRef, { paymentStatus: 'refunded' });
      }
    }

    return true;
  } catch (e) {
    console.error('Order status update error:', e);
    throw e;
  }
}
