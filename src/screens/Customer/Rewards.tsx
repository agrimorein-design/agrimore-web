import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, ActivityIndicator } from 'react-native';
import { ChevronLeft, Gift } from 'lucide-react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, query, updateDoc, doc, addDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ScratchCard from '../../components/ScratchCard';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
};

export default function Rewards({ navigation }: any) {
  const { userData } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<any>(null);
  const [scratched, setScratched] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(collection(db, 'users', userData.uid, 'scratchCards'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      // pending cards first, then claimed
      data.sort((a,b) => (a.isScratched === b.isScratched) ? 0 : a.isScratched ? 1 : -1);
      setCards(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userData?.uid]);

  const handleClaim = async () => {
    if (!activeCard || claiming || !userData?.uid) return;
    setClaiming(true);
    try {
      const cardRef = doc(db, 'users', userData.uid, 'scratchCards', activeCard.id);
      await updateDoc(cardRef, { isScratched: true });
      
      const userRef = doc(db, 'users', userData.uid);
      const userSnap = await getDoc(userRef);
      const bal = userSnap.data()?.walletBalance || 0;
      await updateDoc(userRef, { walletBalance: bal + activeCard.amount });
      
      await addDoc(collection(db, 'users', userData.uid, 'transactions'), {
        type: 'credit', title: 'Scratch Card Reward 🎁', amount: activeCard.amount, createdAt: new Date(), status: 'success'
      });
      
      setActiveCard(null);
      setScratched(false);
    } catch(e) {
      console.error(e);
    }
    setClaiming(false);
  };

  const pendingCards = cards.filter(c => !c.isScratched);
  const claimedCards = cards.filter(c => c.isScratched);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <ChevronLeft color="#D4A843" size={28} />
          </TouchableOpacity>
          <Text style={[font, s.headerTitle]}>My Rewards</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.summaryCard}>
          <Text style={[font, s.summaryText]}>You have</Text>
          <Text style={[font, s.summaryNum]}>{pendingCards.length} Reward{pendingCards.length !== 1 ? 's' : ''}</Text>
          <Text style={[font, s.summarySub]}>waiting to be scratched!</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#145A32" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {pendingCards.length > 0 && (
            <Text style={[font, s.sectionTitle, { color: '#145A32' }]}>Tap to Reveal 🎁</Text>
          )}
          <View style={s.grid}>
            {pendingCards.map((c) => (
              <TouchableOpacity key={c.id} style={s.unscratchedCard} onPress={() => { setActiveCard(c); setScratched(false); }}>
                 <View style={s.unscratchedInner}>
                   <Gift color="#FFF" size={32} />
                   <Text style={[font, s.tapText]}>Tap to scratch</Text>
                 </View>
              </TouchableOpacity>
            ))}
          </View>

          {claimedCards.length > 0 && (
            <>
              <Text style={[font, s.sectionTitle, { marginTop: 24 }]}>Claimed Rewards History</Text>
              <View style={s.grid}>
                {claimedCards.map((c) => (
                  <View key={c.id} style={s.claimedCard}>
                    <Text style={[font, s.claimedLabel]}>You Won</Text>
                    <Text style={[font, s.claimedAmt]}>₹{c.amount}</Text>
                    <Text style={[font, s.claimedDate]}>{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : 'Claimed'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {cards.length === 0 && (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 60, marginBottom: 10 }}>😔</Text>
              <Text style={[font, s.emptyHeader]}>No rewards yet</Text>
              <Text style={[font, s.emptySub]}>Place an order to win scratch cards!</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Full Screen Scratch Modal */}
      {activeCard && (
        <Modal visible={true} transparent animationType="fade">
          <View style={s.scratchOverlay}>
            <Text style={[font, s.scCongrats]}>It's a Reward! 🎉</Text>
            <Text style={[font, s.scSub]}>Scratch the card to reveal your prize</Text>

            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <ScratchCard 
                 amount={activeCard.amount} 
                 onScratched={() => setScratched(true)} 
              />
            </View>

            {scratched && (
              <TouchableOpacity style={s.scClaimBtn} onPress={handleClaim} disabled={claiming}>
                {claiming ? <ActivityIndicator color="#111827" /> : (
                  <Text style={[font, { color: '#111827', fontSize: 18, fontWeight: '900' }]}>Claim to Wallet</Text>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={s.closeScratch} onPress={() => setActiveCard(null)}>
              <Text style={[font, { color: '#FFF', fontWeight: 'bold' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  iconBtn: { padding: 4 },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,168,67,0.3)' },
  summaryText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold' },
  summaryNum: { color: '#D4A843', fontSize: 32, fontWeight: '900', marginVertical: 4 },
  summarySub: { color: '#FFF', fontSize: 12 },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  unscratchedCard: {
    width: '47%', aspectRatio: 1, backgroundColor: '#D4A843', borderRadius: 20, padding: 6,
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
  },
  unscratchedInner: { flex: 1, backgroundColor: '#F59E0B', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FEF3C7', borderStyle: 'dashed' },
  tapText: { color: '#FFF', fontWeight: 'bold', marginTop: 10, fontSize: 13 },
  claimedCard: {
    width: '47%', aspectRatio: 1, backgroundColor: '#FFF', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2
  },
  claimedLabel: { fontSize: 13, color: '#6B7280', fontWeight: 'bold' },
  claimedAmt: { fontSize: 28, fontWeight: '900', color: '#145A32', marginVertical: 6 },
  claimedDate: { fontSize: 11, color: '#9CA3AF' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyHeader: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6B7280' },
  
  // Scratch UI
  scratchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  scCongrats: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 10, textAlign: 'center' },
  scSub: { fontSize: 14, color: '#D1D5DB', textAlign: 'center', marginBottom: 40 },
  scClaimBtn: { marginTop: 40, backgroundColor: '#D4A843', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 20, shadowColor: '#D4A843', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  closeScratch: { position: 'absolute', top: 60, right: 30 }
});
