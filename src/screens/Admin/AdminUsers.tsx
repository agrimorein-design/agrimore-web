import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { Search, UserCheck, UserX, ShoppingCart, IndianRupee, Edit2, Trash2, Eye, Phone, MessageSquare, Wallet } from 'lucide-react-native';
import { createWalletTransaction, createNotification } from '../../services/orders';

const UserWalletDetails = ({ userId, walletBalance }: { userId: string, walletBalance: number }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users', userId, 'transactions'), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [userId]);

  if (loading) return <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 10 }} />;

  const totalDeposit = transactions.filter(t => t.type === 'credit' && t.reason !== 'reward' && t.reason !== 'referral').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalRewards = transactions.filter(t => t.type === 'credit' && (t.reason === 'reward' || t.reason === 'referral')).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalUsed = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const sortedTx = [...transactions].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 8 }]}>User Details</Text>
      <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { color: '#6B7280', fontSize: 13 }]}>User ID:</Text><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontWeight: 'bold', fontSize: 13 }]}>{userId}</Text></View>
      </View>

      <Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 8 }]}>Wallet Information</Text>
      <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { color: '#6B7280', fontSize: 13 }]}>Wallet Balance:</Text><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontWeight: '900', fontSize: 14, color: '#3B82F6' }]}>₹{walletBalance || 0}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { color: '#6B7280', fontSize: 13 }]}>Total Deposit:</Text><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontWeight: 'bold', color: '#16A34A', fontSize: 13 }]}>₹{totalDeposit}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { color: '#6B7280', fontSize: 13 }]}>Total Used:</Text><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontWeight: 'bold', color: '#EF4444', fontSize: 13 }]}>₹{totalUsed}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { color: '#6B7280', fontSize: 13 }]}>Rewards:</Text><Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontWeight: 'bold', color: '#D97706', fontSize: 13 }]}>₹{totalRewards}</Text></View>
      </View>
      
      <Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontSize: 14, fontWeight: '900', color: '#111827', marginTop: 16, marginBottom: 8 }]}>Transaction History</Text>
      {sortedTx.length === 0 ? <Text style={{ color: '#9CA3AF', fontSize: 12 }}>No transactions yet.</Text> : null}
      {sortedTx.slice(0, 5).map(t => (
        <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 10, padding: 10, marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontSize: 13, fontWeight: 'bold', color: '#111827' }]}>{t.title || t.type}</Text>
            <Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontSize: 11, color: '#9CA3AF', marginTop: 2 }]}>{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : 'New'}</Text>
          </View>
          <Text style={[{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, { fontSize: 14, fontWeight: '900', color: t.type === 'credit' ? '#16A34A' : '#EF4444' }]}>{t.type === 'credit' ? '+' : '-'}₹{t.amount}</Text>
        </View>
      ))}
    </View>
  );
};

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual Reward State
  const [rewardUserId, setRewardUserId] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardNote, setRewardNote] = useState('');
  const [grantingReward, setGrantingReward] = useState(false);

  const openEditForm = (u: any) => {
    setEditingUser(u.id);
    setEditName(u.name || '');
    setEditPhone(u.phone || '');
  };

  const handleUpdateUser = async () => {
    if (!editName) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'users', editingUser!), { name: editName, phone: editPhone });
      setEditingUser(null);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSavingEdit(false);
  };

  const handleDeleteUser = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this user?')) {
        await deleteDoc(doc(db, 'users', id));
      }
    } else {
      Alert.alert('Delete', 'Delete this user?', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc(db, 'users', id)) }
      ]);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch all orders for user stats
    getDocs(collection(db, 'orders')).then(snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const toggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !isBlocked });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const toggleAdmin = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'customer' : 'admin';
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      Alert.alert('Role Updated', `User is now ${newRole.toUpperCase()}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const getUserStats = (userId: string) => {
    const userOrders = orders.filter(o => o.userId === userId);
    const totalSpend = userOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    return { orderCount: userOrders.length, totalSpend };
  };

  const getUserOrders = (userId: string) => {
    return orders.filter(o => o.userId === userId).slice(0, 5);
  };

  const handleGrantReward = async () => {
    if (!rewardUserId || !rewardAmount) return;
    setGrantingReward(true);
    try {
      const amount = parseFloat(rewardAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid reward amount.');
        setGrantingReward(false);
        return;
      }
      
      const reasonStr = rewardNote.trim() || 'Loyal customer';
      
      // Instead of instant credit, send them a Scratch Card! 🎁
      await addDoc(collection(db, 'users', rewardUserId, 'scratchCards'), {
        amount: amount,
        isScratched: false,
        reason: reasonStr,
        createdAt: new Date()
      });
      
      // Notify user via App that they have a surprise
      await createNotification(
        rewardUserId,
        'Surprise Reward! 🎁',
        `You have received a scratch card! Open the app to reveal your prize. Note: ${reasonStr}`,
        '🎁',
        'reward'
      );
      
      Alert.alert('Success', `Scratch Card of ₹${amount} sent to the user!`);
      setRewardUserId(null);
      setRewardAmount('');
      setRewardNote('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setGrantingReward(false);
  };

  const filtered = search
    ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search) || u.email?.toLowerCase().includes(search.toLowerCase()))
    : users;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View><Text style={[font, s.hTitle]}>Users</Text><Text style={[font, s.hSub]}>{users.length} registered</Text></View>
      </View>

      <View style={s.searchBar}>
        <Search color="#9CA3AF" size={18} />
        <TextInput style={[font, s.searchInput]} value={search} onChangeText={setSearch} placeholder="Search name, phone, email..." placeholderTextColor="#9CA3AF" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filtered.map(u => {
          const stats = getUserStats(u.id);
          const isExpanded = expandedId === u.id;

          return (
            <View key={u.id} style={[s.card, u.isBlocked && { borderLeftWidth: 3, borderLeftColor: '#EF4444' }]}>
              <View style={s.cardTop}>
                {/* Expand Toggle takes up the left avatar and name block */}
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} 
                  onPress={() => setExpandedId(isExpanded ? null : u.id)} 
                  activeOpacity={0.7}
                >
                  <View style={[s.avatar, u.isBlocked && { backgroundColor: '#EF4444' }]}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{u.name ? u.name.charAt(0).toUpperCase() : 'U'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[font, s.userName]}>{u.name || 'No Name'}</Text>
                    <Text style={[font, s.userContact]}>{u.phone || u.email || 'No contact'}</Text>
                  </View>
                </TouchableOpacity>

                {/* Admin Badge as a sibling on the right! */}
                <TouchableOpacity 
                  style={[s.roleBadge, u.role === 'admin' ? s.roleAdmin : s.roleCustomer]}
                  onPress={() => toggleAdmin(u.id, u.role || 'customer')}
                >
                  <Text style={[font, s.roleText, u.role === 'admin' && s.roleTextAdmin]}>
                    {u.role === 'admin' ? '⭐ SUPER ADMIN' : 'CUSTOMER'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Stats Row */}
              <View style={s.statsRow}>
                <View style={[s.statItem, { flex: 1 }]}>
                  <ShoppingCart color="#3B82F6" size={14} />
                  <Text style={[font, s.statVal]} numberOfLines={1}>{stats.orderCount}</Text>
                  <Text style={[font, s.statLabel]}>Orders</Text>
                </View>
                <View style={[s.statItem, { flex: 1 }]}>
                  <IndianRupee color="#10B981" size={14} />
                  <Text style={[font, s.statVal]} numberOfLines={1}>₹{stats.totalSpend.toFixed(0)}</Text>
                  <Text style={[font, s.statLabel]}>Spent</Text>
                </View>
                <View style={[s.statItem, { flex: 1.2, backgroundColor: '#F5F3FF' }]}>
                  <Wallet color="#8B5CF6" size={14} />
                  <Text style={[font, s.statVal, { color: '#6D28D9' }]} numberOfLines={1}>₹{u.walletBalance || 0}</Text>
                  <Text style={[font, s.statLabel, { color: '#8B5CF6' }]}>Wallet</Text>
                </View>
              </View>
              {/* Edit Form & Detailed View */}
              {editingUser === u.id && (
                <View style={s.expandedSection}>
                  <Text style={[font, s.expTitle]}>Update User</Text>
                  <TextInput style={[font, s.input]} value={editName} onChangeText={setEditName} placeholder="Name" />
                  <TextInput style={[font, s.input, { marginTop: 10 }]} value={editPhone} onChangeText={setEditPhone} placeholder="Phone" keyboardType="numeric" />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: '#EFF6FF' }]} onPress={() => setEditingUser(null)}>
                      <Text style={[font, { color: '#3B82F6', fontWeight: 'bold' }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: '#3B82F6' }]} onPress={handleUpdateUser} disabled={savingEdit}>
                      {savingEdit ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[font, { color: '#FFF', fontWeight: 'bold' }]}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Detailed View logic */}
              {isExpanded && !editingUser && (
                <View style={s.expandedSection}>
                   <UserWalletDetails userId={u.id} walletBalance={u.walletBalance || 0} />
                </View>
              )}

              {/* Contact Options Row */}
              {u.phone ? (
                <View style={[s.contactRow, { flexWrap: 'wrap' }]}>
                  <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#E0F2FE', marginBottom: 6 }]} onPress={() => Linking.openURL(`tel:${u.phone}`)}>
                    <Phone color="#0284C7" size={14} />
                    <Text style={[font, s.contactLabel, { color: '#0284C7' }]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#FEF3C7', marginBottom: 6 }]} onPress={() => Linking.openURL(`sms:${u.phone}`)}>
                    <MessageSquare color="#D97706" size={14} />
                    <Text style={[font, s.contactLabel, { color: '#D97706' }]}>SMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#DCFCE7', marginBottom: 6 }]} onPress={() => Linking.openURL(`whatsapp://send?phone=${u.phone.replace('+', '')}`)}>
                    <MessageSquare color="#16A34A" size={14} />
                    <Text style={[font, s.contactLabel, { color: '#16A34A' }]}>WhatsApp</Text>
                  </TouchableOpacity>
                  {/* NEW REWARDS BUTTON */}
                  <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#FCE7F3', marginBottom: 6 }]} onPress={() => setRewardUserId(u.id)}>
                    <Text style={{ fontSize: 12 }}>🎁</Text>
                    <Text style={[font, s.contactLabel, { color: '#BE185D' }]}>Rewards</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[s.contactRow, { flexWrap: 'wrap' }]}>
                  {/* NEW REWARDS BUTTON (Fallback if no phone) */}
                  <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#FCE7F3', marginBottom: 6 }]} onPress={() => setRewardUserId(u.id)}>
                    <Text style={{ fontSize: 12 }}>🎁</Text>
                    <Text style={[font, s.contactLabel, { color: '#BE185D' }]}>Rewards</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Explicit Actions Row representing Edit, Delete, View */}
              <View style={s.actionsRow}>
                <TouchableOpacity style={s.actionBtnLight} onPress={() => { setExpandedId(isExpanded ? null : u.id); setEditingUser(null); }}>
                  <Eye color="#6B7280" size={14} />
                  <Text style={[font, s.actionLabel]}>{isExpanded ? 'Hide' : 'View'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtnLight} onPress={() => { openEditForm(u); setExpandedId(null); }}>
                  <Edit2 color="#3B82F6" size={14} />
                  <Text style={[font, s.actionLabel, { color: '#3B82F6' }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtnLight, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDeleteUser(u.id)}>
                  <Trash2 color="#EF4444" size={14} />
                  <Text style={[font, s.actionLabel, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleBlock(u.id, !!u.isBlocked)} style={[s.blockBtn, u.isBlocked ? s.unblockBtn : s.blockBtnDanger]}>
                  {u.isBlocked ? <UserCheck color="#10B981" size={14} /> : <UserX color="#EF4444" size={14} />}
                  <Text style={[font, { fontSize: 12, fontWeight: 'bold', marginLeft: 6, color: u.isBlocked ? '#10B981' : '#EF4444' }]}>{u.isBlocked ? 'Unblock' : 'Block'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Manual Reward Popup */}
      {rewardUserId && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={[font, s.modalTitle]}>Send Scratch Card 🎁</Text>
            <Text style={[font, { fontSize: 12, color: '#6B7280', marginBottom: 16, marginTop: 4 }]}>This will send a surprise scratch card to the user's Home screen.</Text>
            
            <TextInput style={[font, s.input]} placeholder="Reward Amount (e.g. 50)" keyboardType="numeric" value={rewardAmount} onChangeText={setRewardAmount} />
            <TextInput style={[font, s.input, { marginTop: 12, height: 80, textAlignVertical: 'top' }]} placeholder="Note (optional: Loyal customer)" multiline value={rewardNote} onChangeText={setRewardNote} />
            
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => setRewardUserId(null)}>
                <Text style={[font, { color: '#4B5563', fontWeight: 'bold' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: '#10B981', flexDirection: 'row', gap: 6 }]} onPress={handleGrantReward} disabled={grantingReward}>
                {grantingReward && <ActivityIndicator size="small" color="#FFF" />}
                <Text style={[font, { color: '#FFF', fontWeight: 'bold' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#374151' },
  card: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  userName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  userContact: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6, borderWidth: 1 },
  roleAdmin: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  roleCustomer: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  roleText: { fontSize: 10, fontWeight: '900', color: '#3B82F6' },
  roleTextAdmin: { color: '#D97706' },

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  statItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10, gap: 4 },
  statVal: { fontSize: 13, fontWeight: '800', color: '#374151' },
  statLabel: { fontSize: 11, color: '#9CA3AF' },
  blockBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 'auto' },
  blockBtnDanger: { backgroundColor: '#FEF2F2' },
  unblockBtn: { backgroundColor: '#F0FDF4' },
  expandedSection: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  expTitle: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 8 },
  miniOrder: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  miniId: { fontSize: 12, fontWeight: '800', color: '#6B7280', width: 80 },
  miniAmt: { fontSize: 13, fontWeight: '800', color: '#111827', flex: 1 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  input: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827' },
  actionBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 6 },
  actionBtnLight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  actionLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  contactLabel: { fontSize: 12, fontWeight: '900' },
  
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
});
