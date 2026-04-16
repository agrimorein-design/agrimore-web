/**
 * Razorpay Payment Service for Agrimore
 * 
 * Live Keys Configuration:
 *   Key ID:     rzp_live_ST1fL8IpN0e24U
 *   Key Secret: i0bLdO15k6K8iK5B989DKc0y
 * 
 * Web: Uses Razorpay Checkout.js (loaded via script tag)
 * Native: Uses react-native-razorpay package
 */

import { Platform } from 'react-native';

// ===== Razorpay Config =====
export const RAZORPAY_CONFIG = {
  key_id: 'rzp_live_ST1fL8IpN0e24U',
  key_secret: 'i0bLdO15k6K8iK5B989DKc0y', // ⚠️ In production, NEVER expose secret on client. Use a backend.
  currency: 'INR',
  company_name: 'Agrimore',
  theme_color: '#145A32',
};

// ===== Load Razorpay Checkout.js for Web =====
let razorpayScriptLoaded = false;

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (razorpayScriptLoaded) { resolve(true); return; }
    if (typeof document === 'undefined') { resolve(false); return; }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => { razorpayScriptLoaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ===== Payment Options Interface =====
export interface PaymentOptions {
  amount: number;       // Amount in rupees (will be converted to paise)
  orderId?: string;     // Firestore order ID for reference
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

// ===== Web Payment (Razorpay Checkout.js) =====
async function payWithRazorpayWeb(options: PaymentOptions): Promise<PaymentResult> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    return { success: false, error: 'Failed to load Razorpay SDK' };
  }

  return new Promise((resolve) => {
    const rzpOptions = {
      key: RAZORPAY_CONFIG.key_id,
      amount: Math.round(options.amount * 100), // Convert to paise
      currency: RAZORPAY_CONFIG.currency,
      name: RAZORPAY_CONFIG.company_name,
      description: options.description || `Order #${options.orderId || 'N/A'}`,
      handler: (response: any) => {
        resolve({
          success: true,
          paymentId: response.razorpay_payment_id,
        });
      },
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone,
      },
      theme: {
        color: RAZORPAY_CONFIG.theme_color,
      },
      modal: {
        ondismiss: () => {
          resolve({ success: false, error: 'Payment cancelled by user' });
        },
      },
    };

    const rzp = new (window as any).Razorpay(rzpOptions);
    rzp.on('payment.failed', (response: any) => {
      resolve({
        success: false,
        error: response.error?.description || 'Payment failed',
      });
    });
    rzp.open();
  });
}

// ===== Native Payment (react-native-razorpay) =====
async function payWithRazorpayNative(options: PaymentOptions): Promise<PaymentResult> {
  try {
    const RazorpayCheckout = require('react-native-razorpay').default;

    const rzpOptions = {
      key: RAZORPAY_CONFIG.key_id,
      amount: Math.round(options.amount * 100),
      currency: RAZORPAY_CONFIG.currency,
      name: RAZORPAY_CONFIG.company_name,
      description: options.description || `Order #${options.orderId || 'N/A'}`,
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone,
      },
      theme: {
        color: RAZORPAY_CONFIG.theme_color,
      },
    };

    const data = await RazorpayCheckout.open(rzpOptions);
    return {
      success: true,
      paymentId: data.razorpay_payment_id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.description || error?.message || 'Payment failed',
    };
  }
}

// ===== Unified Payment Function =====
export async function processPayment(options: PaymentOptions): Promise<PaymentResult> {
  if (Platform.OS === 'web') {
    return payWithRazorpayWeb(options);
  } else {
    return payWithRazorpayNative(options);
  }
}
