import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Clock, Calendar, Truck, Banknote, ShoppingCart, Repeat } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function SubscriptionSetup({ route, navigation }: any) {
  const { product, qty, variant } = route.params;
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [slot, setSlot] = useState('Morning (7 AM - 9 AM)');

  const activePrice = variant?.discountPrice || variant?.price || product.discountPrice || product.price;

  const handleSubscribe = async () => {
    if (!userData?.defaultAddress || !userData?.location) {
        Alert.alert('Error', 'Please set a delivery address in your profile first');
        return;
    }
    setLoading(true);
    try {
      // Calculate first delivery date: Tomorrow
      const nextRun = new Date();
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(7, 0, 0, 0);

      await addDoc(collection(db, 'subscriptions'), {
        userId: userData.uid,
        userName: userData.name,
        userPhone: userData.phone || '',
        productId: product.id,
        productName: variant ? `${product.name} (${variant.label})` : product.name,
        productImage: product.images?.[0] || '',
        price: activePrice,
        quantity: qty,
        unit: product.unit || 'nos',
        frequency,
        deliverySlot: slot,
        address: userData.defaultAddress,
        location: userData.location,
        isActive: true,
        nextRunDate: nextRun.toISOString(),
        createdAt: serverTimestamp()
      });

      Alert.alert('Subscription Active! 🎉', `You have successfully subscribed. Your first delivery is scheduled for tomorrow ${slot}.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <ArrowLeft color="#D4A843" size={24} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Setup Delivery</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Repeat color="#145A32" size={24} />
                <Text style={[font, { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginLeft: 10 }]}>Auto-Delivery Setup</Text>
            </View>
            <Text style={[font, { fontSize: 14, color: '#6B7280', marginBottom: 20 }]}>
                Subscribe to get {product.name} delivered to your door based on your chosen schedule.
            </Text>

            <Text style={[font, s.label]}>Delivery Frequency</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                <TouchableOpacity style={[s.optionBtn, frequency === 'daily' && s.optionActive]} onPress={() => setFrequency('daily')}>
                    <Text style={[font, s.optionText, frequency === 'daily' && s.optionTextActive]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.optionBtn, frequency === 'weekly' && s.optionActive]} onPress={() => setFrequency('weekly')}>
                    <Text style={[font, s.optionText, frequency === 'weekly' && s.optionTextActive]}>Weekly</Text>
                </TouchableOpacity>
            </View>

            <Text style={[font, s.label]}>Preferred Delivery Slot</Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
                {['Morning (7 AM - 9 AM)', 'Evening (5 PM - 7 PM)'].map(sTime => (
                    <TouchableOpacity key={sTime} style={[s.slotBtn, slot === sTime && s.slotActive]} onPress={() => setSlot(sTime)}>
                       <Clock color={slot === sTime ? '#145A32' : '#9CA3AF'} size={18} />
                       <Text style={[font, s.slotText, slot === sTime && s.slotTextActive]}>{sTime}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={s.summaryBox}>
                <Text style={[font, { color: '#1F2937', fontWeight: 'bold', marginBottom: 6 }]}>Order Summary</Text>
                <Text style={[font, { color: '#6B7280', fontSize: 13, marginBottom: 4 }]}>Item: {qty}x {product.name}</Text>
                <Text style={[font, { color: '#6B7280', fontSize: 13, marginBottom: 4 }]}>Pay on Delivery / Wallet per cycle</Text>
                <Text style={[font, { color: '#145A32', fontWeight: '900', fontSize: 18, marginTop: 8 }]}>₹{activePrice * qty} / delivery</Text>
            </View>
        </View>

        <TouchableOpacity style={s.subBtn} onPress={handleSubscribe} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
                <Text style={[font, s.subBtnText]}>Confirm Subscription</Text>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  headerTitle: { color: '#D4A843', fontSize: 22, fontWeight: '900' },
  content: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  optionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  optionActive: { borderColor: '#145A32', backgroundColor: '#F0FDF4' },
  optionText: { fontSize: 15, fontWeight: 'bold', color: '#6B7280' },
  optionTextActive: { color: '#145A32' },
  slotBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA', gap: 12 },
  slotActive: { borderColor: '#145A32', backgroundColor: '#F0FDF4' },
  slotText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  slotTextActive: { color: '#145A32', fontWeight: 'bold' },
  summaryBox: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', marginTop: 10 },
  subBtn: { backgroundColor: '#D4A843', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  subBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900' }
});
