import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, MapPin, Home, Briefcase, Plus, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const ICON_MAP: any = { Home, Office: Briefcase, Work: Briefcase, Other: MapPin };

export default function Addresses({ navigation }: any) {
  const { userData } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPincode, setNewPincode] = useState('');

  useEffect(() => {
    fetchAddresses();
  }, [userData]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchAddresses = async () => {
    if (!userData?.uid) { setLoading(false); return; }
    try {
      const snap = await getDocs(collection(db, 'users', userData.uid, 'addresses'));
      setAddresses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching addresses:', e);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newAddress.trim() || !newCity.trim() || !newPincode.trim()) {
      showAlert('Missing Info', 'Please fill all fields');
      return;
    }
    if (!userData?.uid) {
      showAlert('Error', 'User not found. Please log in.');
      return;
    }
    try {
      const addrData = {
        label: newLabel,
        address: `${newAddress}, ${newCity} - ${newPincode}`,
        isPrimary: addresses.length === 0,
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'users', userData.uid, 'addresses'), addrData);
      if (addresses.length === 0) {
        await setDoc(doc(db, 'users', userData.uid), { defaultAddress: addrData.address }, { merge: true });
      }
      setAddresses([...addresses, { id: docRef.id, ...addrData }]);
      setShowAddForm(false);
      setNewLabel('');
      setNewAddress('');
      setNewCity('');
      setNewPincode('');
    } catch (e: any) {
      console.error('Error adding address:', e);
      showAlert('Error Saving Address', e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (addresses.length <= 1) {
      showAlert('Action Denied', 'At least 1 address is required.');
      return;
    }
    const target = addresses.find(a => a.id === id);
    if (!target) return;

    if (target.isPrimary) {
      showAlert('Action Denied', 'Please set another address as primary before deleting this one.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userData.uid, 'addresses', id));
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (e) {
      console.error('Error deleting address:', e);
    }
  };

  const handleSetPrimary = async (id: string) => {
    if (!userData?.uid) return;
    try {
      const target = addresses.find(a => a.id === id);
      if (!target) return;

      // Unset all, then set this one
      for (const addr of addresses) {
        if (addr.isPrimary) {
          await updateDoc(doc(db, 'users', userData.uid, 'addresses', addr.id), { isPrimary: false });
        }
      }
      await updateDoc(doc(db, 'users', userData.uid, 'addresses', id), { isPrimary: true });
      await setDoc(doc(db, 'users', userData.uid), { defaultAddress: target.address }, { merge: true });
      setAddresses(addresses.map(a => ({ ...a, isPrimary: a.id === id })));
    } catch (e: any) {
      console.error('Error setting primary:', e);
      showAlert('Error', e.message);
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ArrowLeft color="#D4A843" size={22} /></TouchableOpacity>
          <Text style={[font, s.headerTitle]}>My Addresses</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#145A32" /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>My Addresses</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {addresses.length === 0 && !showAddForm ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📍</Text>
            <Text style={[font, { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 6 }]}>No Saved Addresses</Text>
            <Text style={[font, { fontSize: 13, color: '#9CA3AF', marginBottom: 20 }]}>Add your first delivery address</Text>
          </View>
        ) : (
          addresses.map((addr) => {
            const Icon = ICON_MAP[addr.label] || MapPin;
            return (
              <View key={addr.id} style={[s.addressCard, addr.isPrimary && s.addressCardPrimary]}>
                <View style={s.addressTop}>
                  <View style={[s.iconWrap, addr.isPrimary && { backgroundColor: 'rgba(212,168,67,0.15)' }]}>
                    <Icon color={addr.isPrimary ? '#D4A843' : '#145A32'} size={20} />
                  </View>
                  <View style={s.addressInfo}>
                    <View style={s.labelRow}>
                      <Text style={[font, s.addrLabel]}>{addr.label}</Text>
                      {addr.isPrimary && (
                        <View style={s.primaryBadge}>
                          <Text style={[font, s.primaryText]}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[font, s.addrText]}>{addr.address}</Text>
                  </View>
                </View>
                <View style={s.addressActions}>
                  <TouchableOpacity style={s.actionBtn}>
                    <Text style={[font, s.actionBtnText]}>Edit</Text>
                  </TouchableOpacity>
                  {!addr.isPrimary && (
                    <TouchableOpacity style={[s.actionBtn, { marginLeft: 12 }]} onPress={() => handleSetPrimary(addr.id)}>
                      <Text style={[font, s.actionBtnText, { color: '#D4A843' }]}>Set Primary</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.actionBtn, { marginLeft: 12, backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(addr.id)}>
                    <Text style={[font, s.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Map Button */}
        <TouchableOpacity style={s.mapPlaceholder} onPress={() => navigation.navigate('AddressSetup')} activeOpacity={0.8}>
          <MapPin color="#D4A843" size={36} />
          <Text style={[font, s.mapText]}>Tap to pick location on map</Text>
        </TouchableOpacity>

        {/* Add Address Toggle */}
        <TouchableOpacity style={s.addToggle} onPress={() => setShowAddForm(!showAddForm)}>
          <View style={s.addToggleLeft}>
            <Plus color="#145A32" size={20} />
            <Text style={[font, s.addToggleText]}>Add New Address</Text>
          </View>
          {showAddForm ? <ChevronUp color="#9CA3AF" size={20} /> : <ChevronDown color="#9CA3AF" size={20} />}
        </TouchableOpacity>

        {showAddForm && (
          <View style={s.addForm}>
            <TextInput
              style={[font, s.input]}
              placeholder="Label (e.g. Home, Office)"
              placeholderTextColor="#9CA3AF"
              value={newLabel}
              onChangeText={setNewLabel}
            />
            <TextInput
              style={[font, s.input]}
              placeholder="Full Address"
              placeholderTextColor="#9CA3AF"
              value={newAddress}
              onChangeText={setNewAddress}
              multiline
            />
            <View style={s.inputRow}>
              <TextInput
                style={[font, s.input, { flex: 1, marginRight: 10 }]}
                placeholder="City"
                placeholderTextColor="#9CA3AF"
                value={newCity}
                onChangeText={setNewCity}
              />
              <TextInput
                style={[font, s.input, { flex: 1 }]}
                placeholder="Pincode"
                placeholderTextColor="#9CA3AF"
                value={newPincode}
                onChangeText={setNewPincode}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity style={s.saveBtn} onPress={handleAdd}>
              <Check color="#145A32" size={18} />
              <Text style={[font, s.saveBtnText]}>Save Address</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  addressCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  addressCardPrimary: { borderColor: '#D4A843', borderWidth: 1.5 },
  addressTop: { flexDirection: 'row', marginBottom: 14 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(20,90,50,0.08)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  addressInfo: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  addrLabel: { fontSize: 16, fontWeight: '900', color: '#1F2937', marginRight: 10 },
  primaryBadge: { backgroundColor: '#D4A843', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  primaryText: { fontSize: 9, fontWeight: '900', color: '#145A32', letterSpacing: 1 },
  addrText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  addressActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#F9FAFB', borderRadius: 10 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#145A32' },
  mapPlaceholder: {
    height: 140, backgroundColor: '#E8F5E9', borderRadius: 20, borderWidth: 2, borderColor: '#C8E6C9',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  mapText: { fontSize: 14, color: '#4B5563', marginTop: 8 },
  addToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  addToggleLeft: { flexDirection: 'row', alignItems: 'center' },
  addToggleText: { fontSize: 15, fontWeight: '700', color: '#145A32', marginLeft: 10 },
  addForm: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, color: '#1F2937',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  inputRow: { flexDirection: 'row' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D4A843', paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  saveBtnText: { color: '#145A32', fontSize: 15, fontWeight: '900', marginLeft: 8 },
});
