import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Repeat, Play, Pause, Trash2, Calendar } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function MySubscriptions({ navigation }: any) {
  const { userData } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(collection(db, 'subscriptions'), where('userId', '==', userData.uid));
    const unsub = onSnapshot(q, (snap) => {
      setSubscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Subscriptions listen error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [userData?.uid]);

  const toggleStatus = async (id: string, current: boolean) => {
      try {
          await updateDoc(doc(db, 'subscriptions', id), { isActive: !current });
      } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to completely cancel and delete this auto-delivery subscription?',
      [
        { text: 'Keep', style: 'cancel' },
        { 
            text: 'Cancel It', 
            style: 'destructive',
            onPress: async () => {
                try {
                    await deleteDoc(doc(db, 'subscriptions', id));
                } catch (e: any) {
                    Alert.alert('Error', e.message);
                }
            }
        }
      ]
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <ArrowLeft color="#D4A843" size={24} />
        </TouchableOpacity>
        <Text style={[font, s.hTitle]}>My Subscriptions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color="#145A32" style={{ marginTop: 50 }} /> : (
          subscriptions.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 100 }}>
                <Repeat color="#9CA3AF" size={48} />
                <Text style={[font, { textAlign: 'center', marginTop: 20, color: '#6B7280', fontSize: 16 }]}>You have no active auto-deliveries.</Text>
            </View>
          ) : (
            subscriptions.map(sub => {
              const due = sub.isActive && new Date(sub.nextRunDate) <= new Date();
              return (
                <View key={sub.id} style={[s.card, !sub.isActive && { opacity: 0.6 }]}>
                  <View style={s.cardHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={[font, s.pName]} numberOfLines={1}>{sub.productName}</Text>
                      <Text style={[font, s.pSub]}>{sub.quantity}x • ₹{sub.price} per drop</Text>
                    </View>
                    <View style={[s.freqBadge, sub.frequency === 'daily' ? s.fDaily : s.fWeekly]}>
                      <Text style={[font, s.freqText, sub.frequency === 'daily' ? {color: '#B45309'} : {color: '#1D4ED8'}]}>{sub.frequency.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={s.row}>
                     <Calendar color="#6B7280" size={14} style={{ marginRight: 6 }} />
                     <Text style={[font, s.label]}>Next Delivery: </Text>
                     <Text style={[font, s.val, due && { color: '#EF4444' }]}>
                        {new Date(sub.nextRunDate).toLocaleDateString()} {sub.deliverySlot.split(' ')[0]}
                     </Text>
                  </View>

                  <View style={s.actions}>
                    {due && sub.isActive ? (
                      <View style={s.dueBadge}><Text style={[font, s.dueText]}>DUE NOW</Text></View>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    
                    <TouchableOpacity style={[s.btn, { backgroundColor: '#F3F4F6' }]} onPress={() => toggleStatus(sub.id, sub.isActive)}>
                        {sub.isActive ? <Pause color="#374151" size={14} /> : <Play color="#10B981" size={14} />}
                        <Text style={[font, { color: '#374151', fontSize: 12, fontWeight: 'bold', marginLeft: 6 }]}>
                            {sub.isActive ? 'Pause' : 'Resume'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[s.btn, { backgroundColor: '#FEF2F2', marginLeft: 8 }]} onPress={() => handleCancel(sub.id)}>
                        <Trash2 color="#EF4444" size={14} />
                        <Text style={[font, { color: '#EF4444', fontSize: 12, fontWeight: 'bold', marginLeft: 6 }]}>
                            Cancel
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
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  hTitle: { color: '#D4A843', fontSize: 22, fontWeight: '900' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  pName: { fontSize: 16, fontWeight: '900', color: '#1F2937', marginBottom: 2 },
  pSub: { fontSize: 13, color: '#6B7280' },
  freqBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  fDaily: { backgroundColor: '#FEF3C7' },
  fWeekly: { backgroundColor: '#DBEAFE' },
  freqText: { fontSize: 10, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, color: '#6B7280' },
  val: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dueBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 'auto' },
  dueText: { color: '#EF4444', fontSize: 10, fontWeight: '900' },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }
});
