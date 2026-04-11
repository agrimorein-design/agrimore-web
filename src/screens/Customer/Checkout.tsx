import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useCart } from '../../context/CartContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs, getDoc, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, MapPin, CreditCard, Banknote, Truck, Clock, Check, Smartphone, Wallet, ChevronRight, Tag, X } from 'lucide-react-native';
import { TextInput } from 'react-native';

const STORE_LOCATION = { lat: 13.0827, lng: 80.2707 };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const getDistanceCategory = (distance: number) => {
  if (distance <= 0.1) return '0-100m';
  if (distance <= 0.5) return '100m-500m';
  if (distance <= 1) return '500m-1km';
  if (distance <= 2) return '1km-2km';
  return '>2km';
};

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const DELIVERY_SLOTS = [
  { id: '1', label: 'Today', time: '8:00 AM - 10:00 AM', icon: '🌅' },
  { id: '2', label: 'Today', time: '10:00 AM - 12:00 PM', icon: '☀️' },
  { id: '3', label: 'Today', time: '4:00 PM - 6:00 PM', icon: '🌇' },
  { id: '4', label: 'Tomorrow', time: '8:00 AM - 10:00 AM', icon: '🌅' },
  { id: '5', label: 'Tomorrow', time: '10:00 AM - 12:00 PM', icon: '☀️' },
  { id: '6', label: 'Tomorrow', time: '4:00 PM - 6:00 PM', icon: '🌇' },
];



import { placeOrder } from '../../services/orders';
import { processPayment } from '../../services/payment';

export default function Checkout({ navigation }: any) {
  const { cart, cartTotal, clearCart } = useCart();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [dbSlots, setDbSlots] = useState<any[]>([]);
  const [config, setConfig] = useState({ deliveryCharge: 30, freeDeliveryMin: 499, minOrder: 100 });

  // Auto Delivery States
  const [orderType, setOrderType] = useState<'One Time' | 'Auto Delivery'>('One Time');
  const [autoFrequency, setAutoFrequency] = useState<'Daily' | 'Weekly'>('Daily');

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [bogoFreeProduct, setBogoFreeProduct] = useState<any>(null);

  const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm', Icon: Smartphone, color: '#3B82F6' },
    { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', Icon: CreditCard, color: '#8B5CF6' },
    { id: 'wallet', label: 'Agrimore Wallet', desc: `Balance: ₹${(userData?.walletBalance || 0).toFixed(2)}`, Icon: Wallet, color: '#D4A843' },
    { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when order arrives', Icon: Banknote, color: '#16A34A' },
  ];

  const ACTIVE_PAYMENT_METHODS = orderType === 'Auto Delivery' 
    ? [
        { id: 'cod', label: 'Cash on Delivery', desc: 'Pay per delivery', Icon: Banknote, color: '#16A34A' },
        { id: 'weekly_payment', label: 'Weekly Payment', desc: 'Pay once a week for all deliveries', Icon: Banknote, color: '#D4A843' }
      ]
    : PAYMENT_METHODS;

  // React on orderType change to reset payment method if invalid
  React.useEffect(() => {
    if (orderType === 'Auto Delivery' && paymentMethod !== 'cod' && paymentMethod !== 'weekly_payment') {
      setPaymentMethod('cod');
    }
  }, [orderType]);

  // Fetch appConfig Settings real-time
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'appConfig'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          deliveryCharge: data.deliveryCharge ?? 30,
          freeDeliveryMin: data.freeDeliveryMin ?? 499,
          minOrder: data.minOrder ?? 100
        });
        if (data.deliverySlots) {
          setDbSlots(data.deliverySlots.filter((s:any) => s.active === true));
        } else {
          setDbSlots(DELIVERY_SLOTS);
        }
      } else {
        setDbSlots(DELIVERY_SLOTS);
      }
    }, (e) => {
      console.error('Error fetching slots', e);
    });
    return () => unsub();
  }, []);

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) {
        setCouponError('Invalid or expired coupon');
        setCouponLoading(false);
        return;
      }
      
      const couponDoc = snap.docs[0];
      const couponData = { id: couponDoc.id, ...couponDoc.data() } as any;

      if (cartTotal < (couponData.minOrder || 0)) {
        setCouponError(`Minimum order amount must be ₹${couponData.minOrder}`);
        setCouponLoading(false);
        return;
      }

      if (couponData.type === 'bogo') {
        const hasBuyProduct = cart.some(item => item.id === couponData.buyProductId);
        if (!hasBuyProduct) {
          setCouponError('Required BOGO item is not in your cart.');
          setCouponLoading(false);
          return;
        }
        
        const freeProdSnap = await getDoc(doc(db, 'products', couponData.freeProductId));
        if (freeProdSnap.exists()) {
          setBogoFreeProduct({ id: freeProdSnap.id, ...freeProdSnap.data() });
          setAppliedCoupon(couponData);
        } else {
          setCouponError('Free product is currently unavailable.');
        }
      } else {
        setAppliedCoupon(couponData);
        setBogoFreeProduct(null);
      }
    } catch (e: any) {
      setCouponError('Failed to apply coupon.');
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setBogoFreeProduct(null);
  };

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      const perDisc = cartTotal * ((appliedCoupon.discount || 0) / 100);
      discount = appliedCoupon.maxDiscount ? Math.min(perDisc, appliedCoupon.maxDiscount) : perDisc;
    } else if (appliedCoupon.type === 'flat') {
      discount = appliedCoupon.discount || 0;
    }
  }

  const deliveryFee = (cartTotal - discount) >= config.freeDeliveryMin ? 0 : config.deliveryCharge;
  const total = cartTotal + deliveryFee - discount;

  const handlePlaceOrder = async () => {
    if (cartTotal < config.minOrder) {
      Alert.alert('Minimum Order Required', `Please add items worth ₹${config.minOrder - cartTotal} more to place this order.`);
      return;
    }
    if (!userData?.location || !userData?.defaultAddress) {
      Alert.alert('Error', 'Invalid delivery address configuration');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Error', 'Please select a delivery slot');
      return;
    }
    
    // Check wallet balance
    if (paymentMethod === 'wallet' && (userData?.walletBalance || 0) < total) {
      Alert.alert('Error', 'Insufficient wallet balance. Please add money or choose another method.');
      return;
    }

    setLoading(true);
    try {
      const distance = calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lng, userData.location.lat, userData.location.lng);
      let paymentStatus = paymentMethod === 'cod' || paymentMethod === 'weekly_payment' ? 'pending' : 'paid';
      let paymentId = '';

      // === Process Auto Delivery (Subscriptions) ===
      if (orderType === 'Auto Delivery') {
        const nextRun = new Date();
        nextRun.setDate(nextRun.getDate() + 1); // Start deliveries from tomorrow
        
        for (const item of cart) {
          await addDoc(collection(db, 'subscriptions'), {
            userId: userData.uid,
            userName: userData.name,
            userPhone: userData.phone || '',
            productId: item.id,
            productName: item.name,
            price: item.discountPrice || item.price,
            quantity: item.quantity,
            productImage: item.image,
            unit: (item as any).unit || 'nos',
            address: userData.defaultAddress,
            location: userData.location,
            frequency: autoFrequency.toLowerCase(),
            nextRunDate: nextRun.toISOString(),
            deliverySlot: `${selectedSlot.label || selectedSlot.title} ${selectedSlot.time}`,
            isActive: true,
            createdAt: serverTimestamp(),
            paymentMethod: paymentMethod
          });
        }

        clearCart();
        Alert.alert('🎉 Auto-Delivery Set!', `Your subscription has been scheduled ${autoFrequency.toLowerCase()}. Manage it from the portal.`);
        navigation.reset({ index: 0, routes: [{ name: 'Customer' }] });
        setLoading(false);
        return; // EXIT here, do not create standard order
      }

      // === Process Razorpay Payment ===
      if (paymentMethod === 'upi' || paymentMethod === 'card') {
        const paymentResult = await processPayment({
          amount: total,
          customerName: userData.name || 'Customer',
          customerEmail: userData.email || 'customer@agrimore.com',
          customerPhone: userData.phone || '9999999999',
          description: `Agrimore Order (${cart.length} items)`,
        });

        if (!paymentResult.success) {
          Alert.alert('Payment Failed', paymentResult.error || 'Your payment could not be processed.');
          setLoading(false);
          return; // Stop order placement
        }
        
        paymentId = paymentResult.paymentId || 'TXN_' + Date.now();
      } else if (paymentMethod === 'wallet') {
        paymentId = 'WALLET_' + Date.now();
      }

      let finalProducts: any[] = cart.map(c => ({...c}));
      if (appliedCoupon?.type === 'bogo' && bogoFreeProduct) {
        finalProducts.push({
          id: bogoFreeProduct.id,
          name: bogoFreeProduct.name + ' (FREE)',
          price: 0,
          discountPrice: 0,
          quantity: 1,
          image: bogoFreeProduct.image,
          unit: bogoFreeProduct.unit || 'nos',
          isFreeBogo: true
        });
      }

      const orderData = {
        userId: userData.uid,
        userName: userData.name,
        userPhone: userData.phone || '',
        products: finalProducts,
        subtotal: cartTotal,
        discount: discount,
        couponCode: appliedCoupon?.code || null,
        address: userData.defaultAddress,
        addressId: 'default',
        location: userData.location,
        distance,
        distanceRange: getDistanceCategory(distance),
        paymentMethod,
        paymentStatus,
        paymentId,
        deliverySlot: `${selectedSlot.label || selectedSlot.title} ${selectedSlot.time}`,
        orderType: 'One Time',
        autoFrequency: null
      };
      
      const orderId = await placeOrder(orderData);
      
      // Deduct Wallet Balance
      if (paymentMethod === 'wallet') {
        const newBalance = (userData?.walletBalance || 0) - total;
        await updateDoc(doc(db, 'users', userData.uid), { walletBalance: newBalance });
        await addDoc(collection(db, 'users', userData.uid, 'transactions'), {
          type: 'debit',
          title: `Payment for Order #${orderId.slice(-6).toUpperCase()}`,
          amount: total,
          orderId: orderId,
          createdAt: new Date()
        });
      }

      // Process Referral System Bonus!
      if (userData?.appliedReferralCode && userData?.isReferralRewarded === false) {
        try {
          const q = query(collection(db, 'users'), where('referralCode', '==', userData.appliedReferralCode));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const referrerDoc = snapshot.docs[0];
            const referrerData = referrerDoc.data();
            
            // Give 50 to referrer
            await updateDoc(doc(db, 'users', referrerDoc.id), {
              walletBalance: (referrerData.walletBalance || 0) + 50,
              referralFriends: (referrerData.referralFriends || 0) + 1,
              referralEarned: (referrerData.referralEarned || 0) + 50
            });
            await addDoc(collection(db, 'users', referrerDoc.id, 'transactions'), {
              type: 'credit', title: 'Referral Bonus (Friend Ordered) 🎉', amount: 50, createdAt: new Date()
            });

            // Give 50 to current user
            // NOTE: If they used wallet just now, consider latest balance. Wait, we rely on the DB increment or just calculate locally
            const userDocSnap = await getDoc(doc(db, 'users', userData.uid));
            const freshUserData = userDocSnap.data();
            await updateDoc(doc(db, 'users', userData.uid), {
              walletBalance: (freshUserData?.walletBalance || 0) + 50,
              isReferralRewarded: true
            });
            await addDoc(collection(db, 'users', userData.uid, 'transactions'), {
              type: 'credit', title: 'Welcome Referral Bonus 🎁', amount: 50, createdAt: new Date()
            });
          } else {
            await updateDoc(doc(db, 'users', userData.uid), { isReferralRewarded: true });
          }
        } catch (err) { }
      }

      clearCart();
      Alert.alert('🎉 Order Placed!', 'Your order has been placed successfully. You can track it in the Orders tab.');
      navigation.reset({ index: 0, routes: [{ name: 'Customer' }] });
    } catch (e: any) {
      Alert.alert('Order Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View style={s.stepRow}>
      {[
        { num: 1, label: 'Address' },
        { num: 2, label: 'Slot' },
        { num: 3, label: 'Payment' },
      ].map((st, i) => (
        <React.Fragment key={st.num}>
          <TouchableOpacity
            style={[s.stepDot, step >= st.num && s.stepDotActive, step === st.num && s.stepDotCurrent]}
            onPress={() => { if (st.num < step) setStep(st.num); }}
          >
            {step > st.num ? (
              <Check color="#FFF" size={14} />
            ) : (
              <Text style={[font, s.stepNum, step >= st.num && { color: '#FFF' }]}>{st.num}</Text>
            )}
          </TouchableOpacity>
          {i < 2 && <View style={[s.stepLine, step > st.num && s.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft color="#D4A843" size={24} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Checkout</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Step indicator */}
      <StepIndicator />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Step 1: Address */}
        {step === 1 && (
          <View>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <MapPin color="#D4A843" size={20} />
                <Text style={[font, s.cardTitle]}>Delivery Address</Text>
              </View>
              <Text style={[font, s.addressText]}>{userData?.defaultAddress || 'Address not set'}</Text>

              {/* Add Address Card */}
              <TouchableOpacity style={s.addAddressCard}>
                <Text style={[font, s.addAddressText]}>+ Add New Address</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('Addresses')}>
                <Text style={[font, s.editBtnText]}>Manage Addresses →</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.nextBtn} onPress={() => setStep(2)}>
              <Text style={[font, s.nextBtnText]}>Continue to Slot</Text>
              <ChevronRight color="#145A32" size={18} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Delivery Preferences */}
        {step === 2 && (
          <View>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Truck color="#D4A843" size={20} />
                <Text style={[font, s.cardTitle]}>Purchase Type</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[s.typeBtn, orderType === 'One Time' && s.typeBtnActive]} onPress={() => setOrderType('One Time')}>
                  <Text style={[font, s.typeBtnText, orderType === 'One Time' && { color: '#145A32' }]}>One Time Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.typeBtn, orderType === 'Auto Delivery' && s.typeBtnActive]} onPress={() => setOrderType('Auto Delivery')}>
                  <Text style={[font, s.typeBtnText, orderType === 'Auto Delivery' && { color: '#145A32' }]}>Subscribe (Auto)</Text>
                </TouchableOpacity>
              </View>

              {orderType === 'Auto Delivery' && (
                <View style={{ marginTop: 20 }}>
                  <Text style={[font, { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: 'bold' }]}>SUBSCRIPTION FREQUENCY</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[s.typeBtn, autoFrequency === 'Daily' && s.typeBtnActive]} onPress={() => setAutoFrequency('Daily')}>
                      <Text style={[font, s.typeBtnText, autoFrequency === 'Daily' && { color: '#145A32' }]}>Daily</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.typeBtn, autoFrequency === 'Weekly' && s.typeBtnActive]} onPress={() => setAutoFrequency('Weekly')}>
                      <Text style={[font, s.typeBtnText, autoFrequency === 'Weekly' && { color: '#145A32' }]}>Weekly</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={s.card}>
              <View style={s.cardHeader}>
                <Clock color="#D4A843" size={20} />
                <Text style={[font, s.cardTitle]}>Select Time Slot</Text>
              </View>

              {dbSlots.length === 0 && (
                <Text style={[font, s.addressText, { marginTop: 10, color: '#EF4444' }]}>No slots available at the moment.</Text>
              )}
              {dbSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[s.slotOption, selectedSlot?.id === slot.id && s.slotOptionActive]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={s.slotEmoji}>{slot.icon || slot.emoji || '🚚'}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[font, s.slotLabel, selectedSlot?.id === slot.id && { color: '#145A32' }]}>{slot.label || slot.title}</Text>
                    <Text style={[font, s.slotTime]}>{slot.time}</Text>
                  </View>
                  <View style={[s.radio, selectedSlot?.id === slot.id && s.radioActive]} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.nextBtn, !selectedSlot && { opacity: 0.5 }]}
              onPress={() => selectedSlot && setStep(3)}
              disabled={!selectedSlot}
            >
              <Text style={[font, s.nextBtnText]}>Continue to Payment</Text>
              <ChevronRight color="#145A32" size={18} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <View>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <CreditCard color="#D4A843" size={20} />
                <Text style={[font, s.cardTitle]}>Payment Method</Text>
              </View>

              {ACTIVE_PAYMENT_METHODS.map((pm) => {
                const Icon = pm.Icon;
                return (
                  <TouchableOpacity
                    key={pm.id}
                    style={[s.payOption, paymentMethod === pm.id && s.payOptionActive]}
                    onPress={() => setPaymentMethod(pm.id)}
                  >
                    <Icon color={paymentMethod === pm.id ? pm.color : '#9CA3AF'} size={22} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[font, s.payTitle, paymentMethod === pm.id && { color: '#1F2937' }]}>{pm.label}</Text>
                      <Text style={[font, s.paySub]}>{pm.desc}</Text>
                    </View>
                    <View style={[s.radio, paymentMethod === pm.id && s.radioActive]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Apply Coupon Section */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Tag color="#D4A843" size={20} />
                <Text style={[font, s.cardTitle]}>Apply Coupon</Text>
              </View>
              
              {!appliedCoupon ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[font, s.couponInput]}
                      placeholder="Enter promo code"
                      value={couponCode}
                      onChangeText={(t) => { setCouponCode(t); setCouponError(''); }}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity style={s.applyBtn} onPress={handleApplyCoupon} disabled={couponLoading}>
                      {couponLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[font, s.applyBtnText]}>Apply</Text>}
                    </TouchableOpacity>
                  </View>
                  {couponError ? <Text style={[font, { color: '#EF4444', fontSize: 12, marginTop: 8 }]}>{couponError}</Text> : null}
                </>
              ) : (
                <View style={s.appliedBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={[font, { color: '#145A32', fontWeight: 'bold', fontSize: 15 }]}>'{appliedCoupon.code}' Applied!</Text>
                    <Text style={[font, { color: '#16A34A', fontSize: 12, marginTop: 2 }]}>
                      {appliedCoupon.type === 'bogo' ? `Free ${bogoFreeProduct?.name} added to cart.` : `You saved ₹${discount.toFixed(0)}`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={removeCoupon} style={{ padding: 4 }}>
                    <X color="#EF4444" size={20} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Order Summary */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Banknote color="#D4A843" size={20} />
                <Text style={[font, s.cardTitle]}>Order Summary</Text>
              </View>
              <View style={s.billRow}>
                <Text style={[font, s.billLabel]}>Subtotal ({cart.length} items)</Text>
                <Text style={[font, s.billVal]}>₹{cartTotal}</Text>
              </View>
              <View style={s.billRow}>
                <Text style={[font, s.billLabel]}>Delivery Fee</Text>
                <Text style={[font, s.billVal, { color: deliveryFee === 0 ? '#16A34A' : '#1F2937' }]}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </Text>
              </View>
              {discount > 0 && (
                <View style={s.billRow}>
                  <Text style={[font, s.billLabel]}>Discount ({appliedCoupon?.code})</Text>
                  <Text style={[font, s.billVal, { color: '#16A34A' }]}>-₹{discount.toFixed(0)}</Text>
                </View>
              )}
              {appliedCoupon?.type === 'bogo' && bogoFreeProduct && (
                <View style={s.billRow}>
                  <Text style={[font, s.billLabel]}>Free Item: {bogoFreeProduct.name}</Text>
                  <Text style={[font, s.billVal, { color: '#16A34A' }]}>FREE</Text>
                </View>
              )}
              <View style={[s.billRow, s.billRowTotal]}>
                <Text style={[font, s.billLabelTotal]}>Total</Text>
                <Text style={[font, s.billValTotal]}>₹{total}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      {step === 3 && (
        <View style={s.footer}>
          <View>
            <Text style={[font, s.fLabel]}>Total Amount</Text>
            <Text style={[font, s.fVal]}>₹{total}</Text>
          </View>
          <TouchableOpacity style={s.placeBtn} onPress={handlePlaceOrder} disabled={loading || cart.length === 0}>
            {loading ? (
              <ActivityIndicator color="#145A32" />
            ) : (
              <Text style={[font, s.placeBtnText]}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#145A32',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    zIndex: 10,
  },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900' },
  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 40 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#145A32' },
  stepDotCurrent: { backgroundColor: '#D4A843', shadowColor: '#D4A843', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  stepNum: { color: '#9CA3AF', fontSize: 13, fontWeight: '900' },
  stepLine: { flex: 1, height: 3, backgroundColor: '#E5E7EB', marginHorizontal: 8, borderRadius: 2 },
  stepLineActive: { backgroundColor: '#145A32' },
  // Content
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginLeft: 12 },
  addressText: { fontSize: 14, color: '#1F2937', lineHeight: 22, marginBottom: 12 },
  addAddressCard: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  addAddressText: { color: '#145A32', fontSize: 13, fontWeight: '700' },
  editBtn: { alignSelf: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#D4A843' },
  editBtnText: { color: '#D4A843', fontSize: 13, fontWeight: 'bold' },
  nextBtn: {
    backgroundColor: '#D4A843', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, marginBottom: 20,
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  nextBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900', marginRight: 6 },
  // Slots
  slotOption: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 16,
    padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  slotOptionActive: { backgroundColor: 'rgba(212,168,67,0.08)', borderColor: '#D4A843' },
  slotEmoji: { fontSize: 24 },
  slotLabel: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 2 },
  slotTime: { fontSize: 12, color: '#9CA3AF' },
  // Payment
  payOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  payOptionActive: { backgroundColor: 'rgba(212,168,67,0.08)', borderColor: '#D4A843' },
  payTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 2 },
  paySub: { fontSize: 11, color: '#9CA3AF' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB' },
  radioActive: { borderColor: '#D4A843', backgroundColor: '#D4A843', borderWidth: 6 },
  // Setup logic UI for type options
  typeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  typeBtnActive: { backgroundColor: 'rgba(20,90,50,0.1)', borderColor: '#145A32' },
  typeBtnText: { fontSize: 13, fontWeight: 'bold', color: '#6B7280' },
  // Coupon
  couponInput: { flex: 1, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 14, color: '#111827' },
  applyBtn: { backgroundColor: '#145A32', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 12, height: 48 },
  applyBtnText: { color: '#D4A843', fontWeight: 'bold', fontSize: 14 },
  appliedBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  // Bill
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billLabel: { fontSize: 14, color: '#6B7280' },
  billVal: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  billRowTotal: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 14, marginTop: 4, marginBottom: 0 },
  billLabelTotal: { fontSize: 16, fontWeight: '900', color: '#145A32' },
  billValTotal: { fontSize: 20, fontWeight: '900', color: '#D4A843' },
  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 20, borderTopLeftRadius: 36, borderTopRightRadius: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 12,
  },
  fLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  fVal: { fontSize: 24, fontWeight: '900', color: '#145A32' },
  placeBtn: {
    backgroundColor: '#D4A843', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16,
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  placeBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
