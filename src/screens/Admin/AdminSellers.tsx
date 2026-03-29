import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Search, CheckCircle, XCircle, Eye, Store, Phone, Mail, Building2, CreditCard, Hash, MapPin, X, Clock, ShieldCheck, ShieldX } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminSellers() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [previewData, setPreviewData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [adminRating, setAdminRating] = useState(0);

  const openPreview = (req: any) => {
    setPreviewData(req);
    setAdminRemarks(req.adminRemarks || '');
    setAdminRating(req.adminRating || 0);
  };


  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'sellerRequests'), 
      (snap) => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching seller requests:", error);
        setLoading(false);
        Alert.alert("Load Error", "Unable to load sellers. Are Firestore rules configured?");
      }
    );
    return () => unsub();
  }, []);

  const handleApprove = async (req: any) => {
    const msg = `Approve "${req.shopName}" as a seller?`;
    const doApprove = async () => {
      try {
        await updateDoc(doc(db, 'sellerRequests', req.id), {
          status: 'approved',
          approvedAt: new Date(),
          adminRemarks,
          adminRating,
        });
        await updateDoc(doc(db, 'users', req.userId || req.id), {
          role: 'seller',
          sellerStatus: 'approved',
        });
        Alert.alert('✅ Approved', `${req.shopName} is now an active seller!`);
        setPreviewData(null);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doApprove();
    } else {
      Alert.alert('Approve Seller', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  };

  const handleReject = async (req: any) => {
    const msg = `Reject "${req.shopName}"?`;
    const doReject = async () => {
      try {
        await updateDoc(doc(db, 'sellerRequests', req.id), {
          status: 'rejected',
          rejectedAt: new Date(),
          adminRemarks,
          adminRating,
        });
        await updateDoc(doc(db, 'users', req.userId || req.id), {
          sellerStatus: 'rejected',
        });
        Alert.alert('❌ Rejected', `${req.shopName} has been rejected.`);
        setPreviewData(null);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doReject();
    } else {
      Alert.alert('Reject Seller', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: doReject },
      ]);
    }
  };

  const handleBlockSeller = async (req: any) => {
    try {
      const newStatus = req.status === 'blocked' ? 'approved' : 'blocked';
      await updateDoc(doc(db, 'sellerRequests', req.id), { 
        status: newStatus,
        adminRemarks,
        adminRating,
      });
      await updateDoc(doc(db, 'users', req.userId || req.id), {
        sellerStatus: newStatus,
        role: newStatus === 'blocked' ? 'user' : 'seller',
      });
      Alert.alert('Done', newStatus === 'blocked' ? 'Seller has been blocked' : 'Seller has been unblocked');
      setPreviewData(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: '#F59E0B',
    approved: '#16A34A',
    rejected: '#EF4444',
    blocked: '#6B7280',
  };

  const STATUS_ICONS: Record<string, any> = {
    pending: Clock,
    approved: ShieldCheck,
    rejected: ShieldX,
    blocked: XCircle,
  };

  const filteredData = requests
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => {
      if (!search) return true;
      const s = search.toLowerCase();
      return r.shopName?.toLowerCase().includes(s) ||
        r.name?.toLowerCase().includes(s) ||
        r.mobile?.includes(s);
    });

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>Seller Requests</Text>
          <Text style={[font, s.hSub]}>{requests.length} total • {counts.pending} pending</Text>
        </View>
        {counts.pending > 0 && (
          <View style={s.pendingBadge}>
            <Text style={[font, { color: '#FFF', fontWeight: '900', fontSize: 14 }]}>{counts.pending}</Text>
            <Text style={[font, { color: 'rgba(255,255,255,0.8)', fontSize: 10 }]}>Pending</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Search color="#9CA3AF" size={18} />
        <TextInput style={[font, s.searchInput]} value={search} onChangeText={setSearch} placeholder="Search seller name, shop, phone..." placeholderTextColor="#9CA3AF" />
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.pill, filter === f && s.pillAct]}>
            <Text style={[font, s.pillTxt, filter === f && s.pillTxtAct]}>
              {f === 'all' ? `All (${counts.all})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${(counts as any)[f] || 0})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Requests List */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filteredData.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
            <Text style={[font, { color: '#6B7280', marginTop: 8, fontSize: 16, fontWeight: '800' }]}>No requests</Text>
          </View>
        )}

        {filteredData.map(req => {
          const sc = STATUS_COLORS[req.status] || '#6B7280';
          const StatusIcon = STATUS_ICONS[req.status] || Clock;
          return (
            <View key={req.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.shopAvatar, { borderColor: sc }]}>
                  <Store color={sc} size={24} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[font, s.shopName]}>{req.shopName || 'Unnamed Shop'}</Text>
                  <Text style={[font, s.sellerName]}>{req.name} • {req.mobile}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: sc + '20', borderColor: sc }]}>
                  <StatusIcon color={sc} size={12} />
                  <Text style={[font, { color: sc, fontSize: 10, fontWeight: '900', marginLeft: 4 }]}>{(req.status || 'pending').toUpperCase()}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={s.actionsRow}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => openPreview(req)}>
                  <Eye color="#3B82F6" size={14} />
                  <Text style={[font, { color: '#3B82F6', fontWeight: '800', fontSize: 12, marginLeft: 4 }]}>Preview & Verify</Text>
                </TouchableOpacity>

                {req.status === 'pending' && (
                  <>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleApprove(req)}>
                      <CheckCircle color="#16A34A" size={14} />
                      <Text style={[font, { color: '#16A34A', fontWeight: '800', fontSize: 12, marginLeft: 4 }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleReject(req)}>
                      <XCircle color="#EF4444" size={14} />
                      <Text style={[font, { color: '#EF4444', fontWeight: '800', fontSize: 12, marginLeft: 4 }]}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}

                {req.status === 'approved' && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleBlockSeller(req)}>
                    <XCircle color="#EF4444" size={14} />
                    <Text style={[font, { color: '#EF4444', fontWeight: '800', fontSize: 12, marginLeft: 4 }]}>Block</Text>
                  </TouchableOpacity>
                )}

                {req.status === 'blocked' && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleBlockSeller(req)}>
                    <CheckCircle color="#16A34A" size={14} />
                    <Text style={[font, { color: '#16A34A', fontWeight: '800', fontSize: 12, marginLeft: 4 }]}>Unblock</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Preview Modal */}
      <Modal visible={!!previewData} transparent animationType="slide">
        <View style={s.mOverlay}>
          <View style={s.mBody}>
            <View style={s.mHead}>
              <Text style={[font, s.mTitle]}>🏪 Seller Verification</Text>
              <TouchableOpacity onPress={() => setPreviewData(null)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            {previewData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Shop Badge */}
                <View style={s.previewShopCard}>
                  <Store color="#145A32" size={28} />
                  <Text style={[font, { fontSize: 22, fontWeight: '900', color: '#145A32', marginTop: 8 }]}>{previewData.shopName}</Text>
                  <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[previewData.status] || '#6B7280') + '20', borderColor: STATUS_COLORS[previewData.status] || '#6B7280', marginTop: 8, alignSelf: 'center' }]}>
                    <Text style={[font, { color: STATUS_COLORS[previewData.status] || '#6B7280', fontSize: 11, fontWeight: '900' }]}>{(previewData.status || 'pending').toUpperCase()}</Text>
                  </View>
                </View>

                {/* Personal Details */}
                <Text style={[font, s.previewSection]}>👤 Personal Details</Text>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>Name</Text><Text style={[font, s.previewValue]}>{previewData.name}</Text></View>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>Mobile</Text><Text style={[font, s.previewValue]}>{previewData.mobile}</Text></View>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>Email</Text><Text style={[font, s.previewValue]}>{previewData.email}</Text></View>

                {/* Bank Details */}
                <Text style={[font, s.previewSection]}>🏦 Bank Details</Text>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>Bank</Text><Text style={[font, s.previewValue]}>{previewData.bankName}</Text></View>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>Account No.</Text><Text style={[font, s.previewValue]}>{previewData.accountNumber}</Text></View>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>IFSC</Text><Text style={[font, s.previewValue]}>{previewData.ifsc}</Text></View>

                {/* Shop Details */}
                <Text style={[font, s.previewSection]}>🏪 Shop Details</Text>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>Shop Name</Text><Text style={[font, s.previewValue]}>{previewData.shopName}</Text></View>
                <View style={s.previewRow}><Text style={[font, s.previewLabel]}>Address</Text><Text style={[font, s.previewValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>{previewData.shopAddress}</Text></View>

                {/* Admin Verification & Rating */}
                <Text style={[font, s.previewSection]}>⭐ Admin Verification & Rating</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setAdminRating(star)}>
                      <Text style={{ fontSize: 28, color: star <= adminRating ? '#F59E0B' : '#E5E7EB' }}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[font, s.remarksInput]}
                  placeholder="Verify details. Add Admin Remarks / Reply to seller..."
                  placeholderTextColor="#9CA3AF"
                  value={adminRemarks}
                  onChangeText={setAdminRemarks}
                  multiline
                />

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                  <TouchableOpacity style={[s.previewActionBtn, { backgroundColor: '#16A34A', opacity: previewData.status === 'approved' ? 0.5 : 1 }]} onPress={() => handleApprove(previewData)} disabled={previewData.status === 'approved'}>
                    <CheckCircle color="#FFF" size={20} />
                    <Text style={[font, { color: '#FFF', fontWeight: '900', fontSize: 16, marginLeft: 8 }]}>Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[s.previewActionBtn, { backgroundColor: '#EF4444', opacity: previewData.status === 'rejected' ? 0.5 : 1 }]} onPress={() => previewData.status === 'approved' ? handleBlockSeller(previewData) : handleReject(previewData)} disabled={previewData.status === 'rejected' || previewData.status === 'blocked'}>
                    <XCircle color="#FFF" size={20} />
                    <Text style={[font, { color: '#FFF', fontWeight: '900', fontSize: 16, marginLeft: 8 }]}>{previewData.status === 'approved' ? 'Block Seller' : 'Reject'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  pendingBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#374151' },
  filterRow: { marginTop: 12, marginBottom: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pillAct: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  pillTxt: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  pillTxtAct: { color: '#FFF' },
  emptyBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  card: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  shopAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  shopName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sellerName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  // Modal
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  mBody: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '88%' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  previewShopCard: { backgroundColor: '#F0FDF4', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0' },
  previewSection: { fontSize: 15, fontWeight: '900', color: '#145A32', marginBottom: 10, marginTop: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  previewLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  previewValue: { fontSize: 14, color: '#111827', fontWeight: '700' },
  previewActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14 },
  remarksInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: '#374151', backgroundColor: '#F9FAFB' },
});
