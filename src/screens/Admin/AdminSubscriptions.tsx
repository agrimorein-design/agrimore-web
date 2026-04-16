import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, query, updateDoc, doc, addDoc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { Calendar, Repeat, Play, Pause, X } from 'lucide-react-native';
import { placeOrder } from '../../services/orders';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let loaded = false;
    const markLoaded = () => { if (!loaded) { loaded = true; setLoading(false); } };

    const q = query(collection(db, 'subscriptions'));
    const unsub = onSnapshot(q, (snap) => {
      setSubscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      markLoaded();
    }, (err) => { console.warn('Subscriptions listen error:', err); markLoaded(); });

    const timeout = setTimeout(markLoaded, 5000);
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  const handleRunDue = async () => {
    setRunning(true);
    let count = 0;
    try {
      const now = new Date();
      // Find due subscriptions
      const dueSubs = subscriptions.filter(s => s.isActive && new Date(s.nextRunDate) <= now);
      
      for (const sub of dueSubs) {
         // Create Order
         const orderData = {
           userId: sub.userId,
           userName: sub.userName,
           userPhone: sub.userPhone || '',
           products: [{
             id: sub.productId,
             name: sub.productName,
             price: sub.price,
             discountPrice: sub.price, // assuming sub price IS discount price
             quantity: sub.quantity,
             image: sub.productImage,
             unit: sub.unit || 'nos'
           }],
           subtotal: sub.price * sub.quantity,
           discount: 0,
           couponCode: null,
           address: sub.address,
           addressId: 'default',
           location: sub.location,
           distance: 0,
           distanceRange: 'Subscription',
           paymentMethod: sub.paymentMethod || 'cod',
           paymentStatus: 'pending',
           paymentId: 'SUB_' + sub.id,
           deliverySlot: sub.deliverySlot,
           orderType: 'Auto Delivery',
           autoFrequency: sub.frequency
         };
         
         await placeOrder(orderData);

         // Calculate next run date
         const nextRun = new Date(sub.nextRunDate);
         if (sub.frequency === 'daily') {
             nextRun.setDate(nextRun.getDate() + 1);
         } else if (sub.frequency === 'weekly') {
             nextRun.setDate(nextRun.getDate() + 7);
         } else {
             nextRun.setDate(nextRun.getDate() + 1); // fallback
         }

         await updateDoc(doc(db, 'subscriptions', sub.id), {
             nextRunDate: nextRun.toISOString()
         });

         count++;
      }
      
      if (count > 0) {
        Alert.alert('Success', `Successfully generated ${count} orders from due subscriptions.`);
      } else {
        Alert.alert('Info', 'No due subscriptions found at this time.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRunning(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
      try {
          await updateDoc(doc(db, 'subscriptions', id), { isActive: !current });
      } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>Subscriptions</Text>
          <Text style={[font, s.hSub]}>{subscriptions.filter(s => s.isActive).length} Active Auto-Deliveries</Text>
        </View>
        <TouchableOpacity style={s.runBtn} onPress={handleRunDue} disabled={running}>
          {running ? <ActivityIndicator color="#FFF" /> : (
            <><Play color="#FFF" size={16} /><Text style={[font, s.runBtnTxt]}>Run Due</Text></>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color="#145A32" style={{ marginTop: 50 }} /> : (
          subscriptions.length === 0 ? (
            <Text style={[font, { textAlign: 'center', marginTop: 50, color: '#9CA3AF' }]}>No subscriptions found.</Text>
          ) : (
            subscriptions.map(sub => {
              const due = sub.isActive && new Date(sub.nextRunDate) <= new Date();
              return (
                <View key={sub.id} style={[s.card, !sub.isActive && { opacity: 0.6 }]}>
                  <View style={s.cardHead}>
                    <View>
                      <Text style={[font, s.pName]}>{sub.productName}</Text>
                      <Text style={[font, s.pSub]}>{sub.userName} • {sub.userPhone}</Text>
                    </View>
                    <View style={[s.freqBadge, sub.frequency === 'daily' ? s.fDaily : s.fWeekly]}>
                      <Text style={[font, s.freqText, sub.frequency === 'daily' ? {color: '#B45309'} : {color: '#1D4ED8'}]}>{sub.frequency.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={s.row}>
                     <Text style={[font, s.label]}>Next Delivery: </Text>
                     <Text style={[font, s.val, due && { color: '#EF4444' }]}>{new Date(sub.nextRunDate).toLocaleDateString()} {sub.deliverySlot}</Text>
                  </View>
                  <View style={s.row}>
                     <Text style={[font, s.label]}>Item Qty & Price: </Text>
                     <Text style={[font, s.val]}>{sub.quantity}x • ₹{sub.price} per drop</Text>
                  </View>

                  <View style={s.actions}>
                    {due && sub.isActive && (
                      <View style={s.dueBadge}><Text style={[font, s.dueText]}>DUE NOW</Text></View>
                    )}
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity style={[s.btn, { backgroundColor: '#F3F4F6' }]} onPress={() => toggleStatus(sub.id, sub.isActive)}>
                        {sub.isActive ? <Pause color="#374151" size={16} /> : <Play color="#10B981" size={16} />}
                        <Text style={[font, { color: '#374151', fontSize: 13, fontWeight: 'bold', marginLeft: 6 }]}>
                            {sub.isActive ? 'Pause' : 'Activate'}
                        </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  runBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  runBtnTxt: { color: '#FFF', fontWeight: '800', marginLeft: 6 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  pName: { fontSize: 16, fontWeight: '900', color: '#1F2937', marginBottom: 2 },
  pSub: { fontSize: 12, color: '#6B7280' },
  freqBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fDaily: { backgroundColor: '#FEF3C7' },
  fWeekly: { backgroundColor: '#DBEAFE' },
  freqText: { fontSize: 10, fontWeight: '900' },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { fontSize: 13, color: '#6B7280' },
  val: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dueBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dueText: { color: '#EF4444', fontSize: 10, fontWeight: '900' },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }
});
