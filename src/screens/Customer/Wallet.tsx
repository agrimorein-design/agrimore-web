import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert, TextInput } from 'react-native';
import { ArrowLeft, Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, Send } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, orderBy, query, where } from 'firebase/firestore';
import { processPayment } from '../../services/payment';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function WalletScreen({ navigation }: any) {
  const { userData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    name: userData?.name || '', phone: userData?.phone || '', bankName: '', accountNo: '', ifsc: '', amount: ''
  });
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      if (!userData?.uid) { setLoading(false); return; }
      try {
        // Fetch wallet balance from user doc or wallet subcollection
        const userDoc = await getDoc(doc(db, 'users', userData.uid));
        if (userDoc.exists()) {
          setBalance(userDoc.data()?.walletBalance || 0);
        }

        // Fetch transactions
        const txSnap = await getDocs(collection(db, 'users', userData.uid, 'transactions'));
        const txList: any[] = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        txList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTransactions(txList);

        // --- AUTOMATIC INTEREST LAZY EVALUATION --- //
        // 12% yearly return on matured deposits (1 year old)
        const depQ = query(collection(db, 'deposits'), where('userId', '==', userData.uid), where('status', '==', 'success'));
        const depSnap = await getDocs(depQ);
        
        let pendingInterest = 0;
        const nowMs = Date.now();
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const batchUpdates = [];
        
        depSnap.forEach(dDoc => {
          const depData = dDoc.data();
          if (!depData.interestClaimed) {
            const depMs = depData.createdAt?.toDate ? depData.createdAt.toDate().getTime() : 0;
            if (depMs > 0 && (nowMs - depMs) >= ONE_YEAR_MS) {
              const interest = (depData.amount * 12) / 100;
              pendingInterest += interest;
              batchUpdates.push({ ref: doc(db, 'deposits', dDoc.id), data: { interestClaimed: true, interestGrantedAt: new Date() } });
            }
          }
        });

        if (pendingInterest > 0) {
          // Grant Interest automatically!
          const newBal = (userDoc.data()?.walletBalance || 0) + pendingInterest;
          await updateDoc(doc(db, 'users', userData.uid), { walletBalance: newBal });
          
          for (const up of batchUpdates) {
             await updateDoc(up.ref, up.data);
          }

          const intTx = { type: 'credit', title: '12% Annual Interest 🚀', amount: pendingInterest, status: 'success', createdAt: new Date() };
          await addDoc(collection(db, 'users', userData.uid, 'transactions'), intTx);
          
          setBalance(newBal);
          setTransactions(prev => [{ id: Date.now().toString(), ...intTx }, ...prev]);
        }

      } catch (e) {
        console.error('Error fetching wallet:', e);
      }
      setLoading(false);
    };
    fetchWallet();
  }, [userData]);

  const handleAddMoney = async () => {
    const amt = parseFloat(addAmount);
    if (isNaN(amt) || amt < 1 || amt > 100000) {
      Alert.alert('Invalid Amount', 'Please enter between ₹1 and ₹1,00,000.');
      return;
    }
    setProcessing(true);
    try {
      if (!userData?.uid) return;

      // === Open Razorpay Gateway ===
      const paymentResult = await processPayment({
        amount: amt,
        customerName: userData.name || 'Customer',
        customerEmail: userData.email || 'user@agrimore.com',
        customerPhone: userData.phone || '9999999999',
        description: `Wallet Top-up ₹${amt}`,
      });

      if (!paymentResult.success) {
        Alert.alert('Payment Failed', paymentResult.error || 'Your payment could not be processed. Please try again.');
        setProcessing(false);
        return;
      }

      // === Payment Success — Credit Wallet ===
      const newBalance = balance + amt;
      await updateDoc(doc(db, 'users', userData.uid), { walletBalance: newBalance });

      await addDoc(collection(db, 'deposits'), {
        userId: userData.uid, userName: userData.name || '', amount: amt, status: 'success', method: 'razorpay', paymentId: paymentResult.paymentId, createdAt: new Date()
      });

      const txDoc = {
        type: 'credit', title: `Wallet Top-up via Razorpay 💳`, amount: amt, status: 'success', paymentId: paymentResult.paymentId, createdAt: new Date()
      };
      await addDoc(collection(db, 'users', userData.uid, 'transactions'), txDoc);

      setBalance(newBalance);
      setTransactions([{ id: Date.now().toString(), ...txDoc }, ...transactions]);
      setAddModal(false);
      setAddAmount('');
      Alert.alert('Success ✅', `₹${amt} added to your wallet via Razorpay!`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setProcessing(false);
  };

  const handleWithdraw = async () => {
    const { name, phone, bankName, accountNo, ifsc, amount } = withdrawForm;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (amt > balance) { Alert.alert('Error', 'Insufficient wallet balance'); return; }
    if (!name || !phone || !bankName || !accountNo || !ifsc) {
      Alert.alert('Missing Fields', 'Please fill all bank details'); return;
    }

    setWithdrawing(true);
    try {
      if (!userData?.uid) return;
      
      // Check for existing pending requests
      const pedQ = query(collection(db, 'withdrawals'), where('userId', '==', userData.uid), where('status', '==', 'pending'));
      const pedSnap = await getDocs(pedQ);
      if (!pedSnap.empty) {
        Alert.alert('Duplicate Request ❌', 'You already have a pending withdrawal. Please wait for it to be processed.');
        setWithdrawing(false);
        return;
      }
      
      const newBalance = balance - amt;
      
      const reqId = await addDoc(collection(db, 'withdrawals'), {
        userId: userData.uid,
        userName: name,
        phone,
        bankName,
        accountNo,
        ifsc,
        amount: amt,
        status: 'pending',
        createdAt: new Date()
      });

      await updateDoc(doc(db, 'users', userData.uid), { walletBalance: newBalance });
      
      const txDoc = {
        type: 'debit',
        title: 'Withdrawal Pending ⏳',
        amount: amt,
        refId: reqId.id,
        status: 'pending',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'users', userData.uid, 'transactions'), txDoc);
      
      setBalance(newBalance);
      setTransactions([{ id: Date.now().toString(), ...txDoc }, ...transactions]);
      setWithdrawModal(false);
      setWithdrawForm({ name: userData?.name || '', phone: userData?.phone || '', bankName: '', accountNo: '', ifsc: '', amount: '' });
      Alert.alert('Requested ✅', 'Withdrawal under review. Processing time: 24-48 hours.');
    } catch(e: any) {
      Alert.alert('Error', e.message);
    }
    setWithdrawing(false);
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ArrowLeft color="#FFF" size={22} /></TouchableOpacity>
            <Text style={[font, s.headerTitle]}>My Wallet</Text>
            <View style={{ width: 38 }} />
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Purple Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ArrowLeft color="#FFF" size={22} />
          </TouchableOpacity>
          <Text style={[font, s.headerTitle]}>My Wallet</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Balance Block */}
        <View style={s.balanceBlock}>
          <WalletIcon color="#D4A843" size={28} />
          <Text style={[font, s.balanceLabel]}>Available Balance</Text>
          <Text style={[font, s.balanceAmount]}>₹{balance.toFixed(2)}</Text>
        </View>

        {/* 12% Interest Banner */}
        <View style={s.interestBanner}>
          <Text style={[font, s.interestText]}>💰 Earn 12% Yearly Interest on your balance!</Text>
        </View>

        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setAddModal(true)}>
            <View style={s.actionIcon}>
              <Plus color="#7C3AED" size={20} />
            </View>
            <Text style={[font, s.actionText]}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => setWithdrawModal(true)}>
            <View style={s.actionIcon}>
              <Send color="#7C3AED" size={20} />
            </View>
            <Text style={[font, s.actionText]}>Withdraw</Text>
          </TouchableOpacity>
        </View>
        <Text style={[font, { color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center', marginTop: 12 }]}>
          Withdraw anytime | ⏱ Processing 24-48 hours
        </Text>
      </View>

      {/* Transactions */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[font, s.sectionTitle]}>Transaction History</Text>

        {transactions.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💳</Text>
            <Text style={[font, { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 6 }]}>No Transactions Yet</Text>
            <Text style={[font, { fontSize: 13, color: '#9CA3AF' }]}>Your wallet activity will appear here</Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.type === 'credit';
            return (
              <View key={tx.id} style={s.txCard}>
                <View style={[s.txIconWrap, isCredit ? { backgroundColor: '#F0FDF4' } : { backgroundColor: '#FEF2F2' }]}>
                  {isCredit ? <ArrowDownLeft color="#16A34A" size={18} /> : <ArrowUpRight color="#EF4444" size={18} />}
                </View>
                <View style={s.txInfo}>
                  <Text style={[font, s.txTitle]}>{tx.title || tx.description || 'Transaction'}</Text>
                  <Text style={[font, s.txDate]}>
                    {tx.createdAt?.toDate ? new Date(tx.createdAt.toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : tx.date || ''}
                    {tx.status === 'pending' && <Text style={{ color: '#D97706', fontWeight: 'bold' }}> (Pending ⏳)</Text>}
                    {tx.status === 'success' && <Text style={{ color: '#16A34A', fontWeight: 'bold' }}> (Approved ✅)</Text>}
                    {tx.status === 'rejected' && <Text style={{ color: '#EF4444', fontWeight: 'bold' }}> (Rejected ❌)</Text>}
                  </Text>
                </View>
                <Text style={[font, s.txAmount, isCredit ? { color: '#16A34A' } : { color: '#EF4444' }]}>
                  {isCredit ? '+' : '-'}₹{Math.abs(tx.amount || 0)}
                </Text>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Money Modal */}
      {addModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={[font, s.modalTitle]}>Add Money to Wallet</Text>
            <Text style={[font, s.modalSub]}>Enter amount to add instantly</Text>
            
            {/* Quick Amount Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[100, 200, 500, 1000, 2000].map(a => (
                <TouchableOpacity key={a} onPress={() => setAddAmount(a.toString())} 
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: addAmount === a.toString() ? '#7C3AED' : '#F3F4F6' }}>
                  <Text style={[font, { fontSize: 13, fontWeight: '800', color: addAmount === a.toString() ? '#FFF' : '#374151' }]}>₹{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={s.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={addAmount}
              onChangeText={setAddAmount}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => { setAddModal(false); setAddAmount(''); }}>
                <Text style={[font, { color: '#6B7280', fontWeight: 'bold' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalProceedBtn} onPress={handleAddMoney} disabled={processing}>
                {processing ? <ActivityIndicator color="#FFF" /> : <Text style={[font, { color: '#FFF', fontWeight: 'bold' }]}>Add ₹{addAmount || '0'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Withdraw Modal */}
      {withdrawModal && (
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ paddingVertical: 40 }} showsVerticalScrollIndicator={false}>
          <View style={[s.modalBox, { alignSelf: 'center', marginTop: 20 }]}>
            <Text style={[font, s.modalTitle]}>Withdraw to Bank</Text>
            <Text style={[font, s.modalSub]}>Enter bank details for IMPS/NEFT transfer</Text>
            
            <TextInput style={s.wdInput} placeholder="Account Holder Name" value={withdrawForm.name} onChangeText={(t) => setWithdrawForm({...withdrawForm, name: t})} />
            <TextInput style={s.wdInput} placeholder="Mobile Number" keyboardType="numeric" value={withdrawForm.phone} onChangeText={(t) => setWithdrawForm({...withdrawForm, phone: t})} />
            <TextInput style={s.wdInput} placeholder="Bank Name (e.g., SBI)" value={withdrawForm.bankName} onChangeText={(t) => setWithdrawForm({...withdrawForm, bankName: t})} />
            <TextInput style={s.wdInput} placeholder="Account Number" keyboardType="numeric" value={withdrawForm.accountNo} onChangeText={(t) => setWithdrawForm({...withdrawForm, accountNo: t})} />
            <TextInput style={s.wdInput} placeholder="IFSC Code" autoCapitalize="characters" value={withdrawForm.ifsc} onChangeText={(t) => setWithdrawForm({...withdrawForm, ifsc: t})} />
            <TextInput style={[s.wdInput, { fontSize: 18, fontWeight: '800', textAlign: 'center', borderColor: '#7C3AED', color: '#7C3AED' }]} placeholder="Amount (₹)" keyboardType="numeric" value={withdrawForm.amount} onChangeText={(t) => setWithdrawForm({...withdrawForm, amount: t})} />

            <View style={[s.modalActions, { marginTop: 10 }]}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setWithdrawModal(false)}>
                <Text style={[font, { color: '#6B7280', fontWeight: 'bold' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalProceedBtn} onPress={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? <ActivityIndicator color="#FFF" /> : <Text style={[font, { color: '#FFF', fontWeight: 'bold' }]}>Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#7C3AED',
    paddingTop: 54, paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { padding: 8 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  balanceBlock: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 8 },
  balanceAmount: { color: '#FFF', fontSize: 40, fontWeight: '900', marginTop: 4 },
  interestBanner: { backgroundColor: 'rgba(212,168,67,0.15)', borderWidth: 1, borderColor: 'rgba(212,168,67,0.4)', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 20, marginBottom: 20, alignItems: 'center' },
  interestText: { color: '#D4A843', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', justifyContent: 'center' },
  actionBtn: { alignItems: 'center', marginHorizontal: 20 },
  actionIcon: {
    width: 52, height: 52, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 16 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  txIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  txDate: { fontSize: 11, color: '#9CA3AF' },
  txAmount: { fontSize: 16, fontWeight: '900' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 20, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 15 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  wdInput: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  modalProceedBtn: { backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 120 },
});
