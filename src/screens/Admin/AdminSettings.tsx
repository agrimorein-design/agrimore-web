import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/auth';
import { LogOut, Save, Smartphone } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminSettings({ navigation }: any) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config fields
  const [deliveryCharge, setDeliveryCharge] = useState('30');
  const [freeDeliveryMin, setFreeDeliveryMin] = useState('300');
  const [minOrder, setMinOrder] = useState('100');
  const [gstPercent, setGstPercent] = useState('5');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5');
  const [maxOrderPerDay, setMaxOrderPerDay] = useState('50');
  
  // Reward fields
  const [rewardAmount, setRewardAmount] = useState('0');
  const [rewardMinOrder, setRewardMinOrder] = useState('0');

  // Delivery Slots
  const [deliverySlots, setDeliverySlots] = useState<{id: string, time: string, active: boolean}[]>([]);
  const [newSlot, setNewSlot] = useState('');

  // Toggles
  const [maintenance, setMaintenance] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [flashSaleEnabled, setFlashSaleEnabled] = useState(true);
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);
  const [onlinePayEnabled, setOnlinePayEnabled] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'appConfig'));
        if (snap.exists()) {
          const d = snap.data();
          setDeliveryCharge(String(d.deliveryCharge || '30'));
          setFreeDeliveryMin(String(d.freeDeliveryMin || '300'));
          setMinOrder(String(d.minOrder || '100'));
          setGstPercent(String(d.gstPercent || '5'));
          setRewardAmount(String(d.rewardAmount || '0'));
          setRewardMinOrder(String(d.rewardMinOrder || '0'));
          setSupportPhone(d.supportPhone || '');
          setSupportEmail(d.supportEmail || '');
          setDeliveryRadius(String(d.deliveryRadius || '5'));
          setMaxOrderPerDay(String(d.maxOrderPerDay || '50'));
          setDeliverySlots(d.deliverySlots || []);
          setMaintenance(!!d.maintenance);
          setReferralEnabled(d.referralEnabled !== false);
          setFlashSaleEnabled(d.flashSaleEnabled !== false);
          setWalletEnabled(d.walletEnabled !== false);
          setCodEnabled(d.codEnabled !== false);
          setOnlinePayEnabled(d.onlinePayEnabled !== false);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'appConfig'), {
        deliveryCharge: parseFloat(deliveryCharge) || 0,
        freeDeliveryMin: parseFloat(freeDeliveryMin) || 0,
        minOrder: parseFloat(minOrder) || 0,
        gstPercent: parseFloat(gstPercent) || 0,
        rewardAmount: parseFloat(rewardAmount) || 0,
        rewardMinOrder: parseFloat(rewardMinOrder) || 0,
        supportPhone, supportEmail,
        deliveryRadius: parseFloat(deliveryRadius) || 5,
        maxOrderPerDay: parseInt(maxOrderPerDay) || 50,
        deliverySlots,
        maintenance, referralEnabled, flashSaleEnabled, walletEnabled, codEnabled, onlinePayEnabled,
        updatedAt: new Date(),
      }, { merge: true });
      Alert.alert('✅ Saved', 'Settings updated successfully');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        const confirmResult = window.confirm('Are you sure you want to logout?');
        if (confirmResult) {
          await logoutUser();
          window.location.reload(); // Force full reload on web to clear all cache/state
        }
      } else {
        Alert.alert('Logout', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive', 
            onPress: async () => {
              try {
                await logoutUser();
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            }
          }
        ]);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message);
      else Alert.alert('Error', error.message);
    }
  };

  const addDeliverySlot = () => {
    if (!newSlot.trim()) return;
    setDeliverySlots([...deliverySlots, { id: Date.now().toString(), time: newSlot.trim(), active: true }]);
    setNewSlot('');
  };

  const removeDeliverySlot = (id: string) => {
    setDeliverySlots(deliverySlots.filter(s => s.id !== id));
  };

  const toggleDeliverySlot = (id: string) => {
    setDeliverySlots(deliverySlots.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  const SettingField = ({ label, value, onChange, keyboard }: any) => (
    <View style={s.fieldRow}>
      <Text style={[font, s.fieldLabel]}>{label}</Text>
      <TextInput style={[font, s.fieldInput]} value={value} onChangeText={onChange} keyboardType={keyboard || 'default'} />
    </View>
  );

  const SettingToggle = ({ label, value, onChange, desc }: any) => (
    <View style={s.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={[font, s.toggleLabel]}>{label}</Text>
        {desc && <Text style={[font, s.toggleDesc]}>{desc}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#E5E7EB', true: '#3B82F6' }} thumbColor={value ? '#FFF' : '#FFF'} />
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View><Text style={[font, s.hTitle]}>Settings</Text><Text style={[font, s.hSub]}>App Configuration</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={s.profileCard}>
          <View style={s.avatar}><Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>{userData?.name?.charAt(0) || 'A'}</Text></View>
          <View>
            <Text style={[font, s.profileName]}>{userData?.name || 'Admin'}</Text>
            <Text style={[font, s.profileRole]}>Admin Account</Text>
          </View>
        </View>

        {/* Delivery Settings */}
        <Text style={[font, s.secTitle]}>🚚 Delivery Settings</Text>
        <View style={s.section}>
          <SettingField label="Delivery Charge (₹)" value={deliveryCharge} onChange={setDeliveryCharge} keyboard="numeric" />
          <SettingField label="Free Delivery Min (₹)" value={freeDeliveryMin} onChange={setFreeDeliveryMin} keyboard="numeric" />
          <SettingField label="Min Order Amount (₹)" value={minOrder} onChange={setMinOrder} keyboard="numeric" />
          <SettingField label="Delivery Radius (km)" value={deliveryRadius} onChange={setDeliveryRadius} keyboard="numeric" />
          <SettingField label="Max Orders / Day" value={maxOrderPerDay} onChange={setMaxOrderPerDay} keyboard="numeric" />
        </View>

        {/* Delivery Time Slots */}
        <Text style={[font, s.secTitle]}>🕒 Delivery Time Slots</Text>
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <TextInput 
              style={[font, s.slotInput]} 
              placeholder="e.g. 10:00 AM - 01:00 PM" 
              value={newSlot} 
              onChangeText={setNewSlot} 
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={s.slotBtn} onPress={addDeliverySlot}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ Add Slot</Text>
            </TouchableOpacity>
          </View>
          {deliverySlots.length === 0 ? (
            <Text style={[font, { color: '#9CA3AF', textAlign: 'center', paddingBottom: 16 }]}>No slots added yet.</Text>
          ) : (
            deliverySlots.map(slot => (
              <View key={slot.id} style={s.slotRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Switch 
                    value={slot.active} 
                    onValueChange={() => toggleDeliverySlot(slot.id)} 
                    trackColor={{ false: '#E5E7EB', true: '#10B981' }} 
                    thumbColor="#FFF" 
                  />
                  <Text style={[font, s.slotTimeText, !slot.active && { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
                    {slot.time}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeDeliverySlot(slot.id)}>
                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Reward Settings */}
        <Text style={[font, s.secTitle]}>🎁 Reward Settings</Text>
        <View style={s.section}>
          <SettingField label="Reward Amount (₹)" value={rewardAmount} onChange={setRewardAmount} keyboard="numeric" />
          <SettingField label="Min Order for Reward (₹)" value={rewardMinOrder} onChange={setRewardMinOrder} keyboard="numeric" />
          <Text style={[font, { fontSize: 11, color: '#6B7280', padding: 16, paddingTop: 0 }]}>
            Users will receive this fixed cashback to their wallet if their order subtotal is above the minimum amount.
          </Text>
        </View>

        {/* Tax */}
        <Text style={[font, s.secTitle]}>💰 Tax & Charges</Text>
        <View style={s.section}>
          <SettingField label="GST %" value={gstPercent} onChange={setGstPercent} keyboard="numeric" />
        </View>

        {/* Support */}
        <Text style={[font, s.secTitle]}>📞 Support Info</Text>
        <View style={s.section}>
          <SettingField label="Support Phone" value={supportPhone} onChange={setSupportPhone} keyboard="phone-pad" />
          <SettingField label="Support Email" value={supportEmail} onChange={setSupportEmail} />
        </View>

        {/* Toggles */}
        <Text style={[font, s.secTitle]}>⚙️ Feature Toggles</Text>
        <View style={s.section}>
          <SettingToggle label="🔧 Maintenance Mode" value={maintenance} onChange={setMaintenance} desc="Disable app for customers" />
          <SettingToggle label="🎁 Referral System" value={referralEnabled} onChange={setReferralEnabled} desc="Enable referral rewards" />
          <SettingToggle label="⚡ Flash Sales" value={flashSaleEnabled} onChange={setFlashSaleEnabled} desc="Enable flash sale feature" />
          <SettingToggle label="💳 Wallet System" value={walletEnabled} onChange={setWalletEnabled} desc="Enable digital wallet" />
          <SettingToggle label="💵 Cash on Delivery" value={codEnabled} onChange={setCodEnabled} desc="Allow COD payment" />
          <SettingToggle label="🔐 Online Payments" value={onlinePayEnabled} onChange={setOnlinePayEnabled} desc="Razorpay/UPI payments" />
        </View>

        {/* Enter Customer App */}
        <TouchableOpacity style={s.customerBtn} onPress={() => navigation.navigate('Customer')}>
          <Smartphone color="#145A32" size={20} />
          <Text style={[font, s.customerBtnTxt]}>View Customer App</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : (
            <><Save color="#FFF" size={20} /><Text style={[font, s.saveBtnTxt]}>Save Settings</Text></>
          )}
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut color="#EF4444" size={20} />
          <Text style={[font, { fontSize: 16, color: '#EF4444', fontWeight: 'bold', marginLeft: 12 }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', padding: 20, borderRadius: 20, marginBottom: 24 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  profileName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  profileRole: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  secTitle: { fontSize: 14, fontWeight: '800', color: '#6B7280', marginBottom: 10, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 4, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  fieldLabel: { fontSize: 14, color: '#374151', fontWeight: '600', flex: 1 },
  fieldInput: { backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827', width: 120, textAlign: 'right', fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  toggleLabel: { fontSize: 14, color: '#374151', fontWeight: '700' },
  toggleDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  
  slotInput: { flex: 1, backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827' },
  slotBtn: { backgroundColor: '#145A32', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, marginLeft: 10 },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  slotTimeText: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginLeft: 12 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, marginTop: 12, gap: 10 },
  saveBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  customerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#145A32', paddingVertical: 16, borderRadius: 16, marginTop: 24, gap: 10 },
  customerBtnTxt: { color: '#145A32', fontWeight: '800', fontSize: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, marginTop: 16, backgroundColor: '#FEF2F2', borderRadius: 16 },
});
