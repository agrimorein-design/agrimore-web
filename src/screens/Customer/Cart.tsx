import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { useCart } from '../../context/CartContext';
import { Minus, Plus, Trash2, ArrowRight, Tag, Clock, ArrowLeft } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const DELIVERY_SLOTS_QUICK = [
  { label: '⚡ Express', time: '30 min', active: true },
  { label: '🕐 Standard', time: '2-4 PM', active: false },
  { label: '🌇 Evening', time: '5-7 PM', active: false },
  { label: '🌅 Tomorrow', time: '9-11 AM', active: false },
];

export default function Cart({ navigation }: any) {
  const { cart, updateQuantity, removeFromCart, cartTotal } = useCart();

  if (cart.length === 0) {
    return (
      <View style={s.emptyRoot}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
               <ArrowLeft color="#D4A843" size={28} />
            </TouchableOpacity>
            <View>
              <Text style={[font, s.headerTitle]}>My Cart</Text>
            </View>
          </View>
        </View>
        <View style={s.emptyContent}>
          <Text style={s.emptyEmoji}>🛒</Text>
          <Text style={[font, s.emptyTitle]}>Your Cart is Empty</Text>
          <Text style={[font, s.emptySub]}>Explore our premium collection and add your favorite items.</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => navigation.navigate('HomeTab')}>
            <Text style={[font, s.browseBtnText]}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const freeDeliveryThreshold = 499;
  const neededForFree = Math.max(0, freeDeliveryThreshold - cartTotal);
  const deliveryFee = neededForFree > 0 ? 30 : 0;
  const discount = 0;
  const total = cartTotal + deliveryFee - discount;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
             <ArrowLeft color="#D4A843" size={28} />
          </TouchableOpacity>
          <View>
            <Text style={[font, s.headerTitle]}>My Cart</Text>
            <Text style={[font, s.headerSub]}>{cart.length} Premium Items</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Coupon Strip */}
        <TouchableOpacity style={s.couponStrip} onPress={() => navigation.navigate('Offers')}>
          <Tag color="#D4A843" size={18} />
          <Text style={[font, s.couponText]}>Apply coupon to save more</Text>
          <ArrowRight color="#D4A843" size={16} />
        </TouchableOpacity>

        {/* Delivery Progress */}
        <View style={s.progressCard}>
          {neededForFree > 0 ? (
            <Text style={[font, s.progressText]}>
              Add <Text style={{ color: '#D4A843', fontWeight: '900' }}>₹{neededForFree.toFixed(0)}</Text> more for free delivery
            </Text>
          ) : (
            <Text style={[font, s.progressText, { color: '#16A34A' }]}>
              You get Free Delivery! 🎉
            </Text>
          )}
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.min(100, (cartTotal / freeDeliveryThreshold) * 100)}%` }]} />
          </View>
        </View>

        {/* Cart Items */}
        {cart.map((item) => (
          <View key={item.id} style={s.itemCard}>
            <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={s.itemImg} />
            <View style={s.itemInfo}>
              <Text style={[font, s.itemName]} numberOfLines={1}>{item.name}</Text>
              <Text style={[font, s.itemPrice]}>₹{(item.discountPrice || item.price) * item.quantity}</Text>

              <View style={s.qtyRow}>
                <View style={s.qtyBox}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)} style={s.qtyBtn}>
                    <Minus color="#D4A843" size={14} />
                  </TouchableOpacity>
                  <Text style={[font, s.qtyText]}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)} style={s.qtyBtn}>
                    <Plus color="#D4A843" size={14} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.trashBtn} onPress={() => removeFromCart(item.id)}>
                  <Trash2 color="#EF4444" size={16} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {/* Quick Delivery Slots */}
        <Text style={[font, s.slotTitle]}>
          <Clock color="#145A32" size={16} /> Delivery Slots
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.slotScroll}>
          {DELIVERY_SLOTS_QUICK.map((sl, i) => (
            <View key={i} style={[s.slotChip, sl.active && s.slotChipActive]}>
              <Text style={[font, s.slotLabel, sl.active && { color: '#145A32' }]}>{sl.label}</Text>
              <Text style={[font, s.slotTime]}>{sl.time}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Bill Details */}
        <View style={s.billCard}>
          <Text style={[font, s.billTitle]}>Bill Summary</Text>
          <View style={s.billRow}>
            <Text style={[font, s.billLabel]}>Subtotal</Text>
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
              <Text style={[font, s.billLabel]}>Discount</Text>
              <Text style={[font, s.billVal, { color: '#16A34A' }]}>-₹{discount}</Text>
            </View>
          )}
          <View style={[s.billRow, s.billRowTotal]}>
            <Text style={[font, s.billLabelTotal]}>Total</Text>
            <Text style={[font, s.billValTotal]}>₹{total}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Checkout Footer */}
      <View style={s.footer}>
        <View>
          <Text style={[font, s.fTotalText]}>₹{total}</Text>
          <Text style={s.fDesc}>Incl. all charges</Text>
        </View>
        <TouchableOpacity style={s.checkoutBtn} onPress={() => navigation.navigate('Checkout')}>
          <Text style={[font, s.checkoutBtnText]}>Proceed to Checkout</Text>
          <ArrowRight color="#145A32" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  emptyRoot: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8, zIndex: 10,
  },
  headerTitle: { color: '#D4A843', fontSize: 32, fontWeight: '900' },
  headerSub: { color: '#FFF', fontSize: 14, opacity: 0.8, marginTop: 4 },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: '#145A32', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  browseBtn: { backgroundColor: '#D4A843', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  browseBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  // Coupon strip
  couponStrip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,168,67,0.08)',
    borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(212,168,67,0.2)',
  },
  couponText: { flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '700', color: '#D4A843' },
  progressCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  progressText: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#D4A843', borderRadius: 3 },
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  itemImg: { width: 76, height: 76, borderRadius: 14, backgroundColor: '#F9FAFB', marginRight: 14 },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  itemPrice: { fontSize: 16, fontWeight: '900', color: '#145A32', marginVertical: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  qtyBtn: { padding: 8 },
  qtyText: { fontSize: 14, fontWeight: '900', color: '#145A32', paddingHorizontal: 10 },
  trashBtn: { padding: 6, backgroundColor: '#FEF2F2', borderRadius: 10 },
  // Slots
  slotTitle: { fontSize: 15, fontWeight: '900', color: '#145A32', marginBottom: 10, marginTop: 4 },
  slotScroll: { marginBottom: 20 },
  slotChip: {
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    marginRight: 10, borderWidth: 1.5, borderColor: '#E5E7EB', minWidth: 100, alignItems: 'center',
  },
  slotChipActive: { borderColor: '#D4A843', backgroundColor: 'rgba(212,168,67,0.08)' },
  slotLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 2 },
  slotTime: { fontSize: 11, color: '#9CA3AF' },
  // Bill
  billCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20 },
  billTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 16 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billLabel: { fontSize: 14, color: '#6B7280' },
  billVal: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  billRowTotal: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 14, marginTop: 4, marginBottom: 0 },
  billLabelTotal: { fontSize: 16, fontWeight: '900', color: '#145A32' },
  billValTotal: { fontSize: 20, fontWeight: '900', color: '#D4A843' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 18,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 12,
  },
  fTotalText: { fontSize: 24, fontWeight: '900', color: '#145A32' },
  fDesc: { fontSize: 11, color: '#9CA3AF' },
  checkoutBtn: {
    backgroundColor: '#D4A843', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16,
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  checkoutBtnText: { color: '#145A32', fontSize: 14, fontWeight: '900', marginRight: 6 },
});
